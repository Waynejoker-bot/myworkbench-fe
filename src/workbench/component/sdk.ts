/**
 * Component SDK - Component-side SDK
 * Provides communication capabilities with Host
 */

import { MessageBus } from '../core/message-bus';
import type { HostAPI } from '../types/host';
import type { WorkbenchMessage } from '../types/message';
import { MessageSource, MessageTarget } from '../core/protocol';
import { uuid } from '../utils/uuid';

/**
 * Component SDK - Used by components to communicate with Host
 */
export class ComponentSDK {
  private messageBus: MessageBus;
  private hostAPI: HostAPI | null = null;
  private ready = false;
  private initResolve: ((host: HostAPI) => void) | null = null;
  // @ts-ignore - unused variable, kept for potential future use
  private initReject: ((error: Error) => void) | null = null;
  private proxiedHostAPI: HostAPI | null = null;

  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: number;
  }>();

  constructor() {
    this.messageBus = new MessageBus();
    this.setupMessageListener();
  }

  /**
   * Initialize SDK and wait for Host connection
   */
  async init(): Promise<HostAPI> {
    return new Promise<HostAPI>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;

      // Set timeout
      const timeout = setTimeout(() => {
        reject(new Error('SDK initialization timeout'));
      }, 10000);

      // Store timeout for cleanup
      this.initTimeout = timeout as unknown as number;

      // Notify Host we're ready
      this.postMessage({
        type: 'sdk:ready',
        payload: {},
        target: MessageTarget.Workbench
      });
    });
  }

  private initTimeout: number | null = null;

  /**
   * Get Host API
   */
  getHost(): HostAPI {
    if (!this.ready || !this.hostAPI) {
      throw new Error('SDK not initialized. Call init() first.');
    }
    return this.proxiedHostAPI!;
  }

  /**
   * Check if SDK is ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Send message to Host
   */
  private postMessage<T>(message: Omit<WorkbenchMessage<T>, 'id' | 'timestamp' | 'source'>): void {
    window.parent.postMessage({
      ...message,
      id: uuid(),
      timestamp: Date.now(),
      source: MessageSource.Component
    }, '*');
  }

  /**
   * Setup message listener from Host
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      // Validate message source
      if (event.source === window) {
        return;
      }

      const message = event.data as WorkbenchMessage;

      if (message.source !== MessageSource.Workbench) {
        return;
      }

      // Handle init message
      if (message.type === 'component:init') {
        this.handleInitMessage(message as WorkbenchMessage<InitPayload>);
        return;
      }

      // Handle method response
      if (message.type === 'method:response') {
        this.handleMethodResponse(message as WorkbenchMessage<MethodResponsePayload>);
        return;
      }

      // Emit to message bus for component to handle
      this.messageBus.emit(message.type, message.payload);
    });
  }

  /**
   * Handle init message from Host
   */
  private handleInitMessage(message: WorkbenchMessage<InitPayload>): void {
    clearTimeout(this.initTimeout || 0);

    const { capabilities } = message.payload;
    this.hostAPI = capabilities as unknown as HostAPI;
    this.createProxyAPI();
    this.ready = true;

    if (this.initResolve) {
      this.initResolve(this.hostAPI);
    }
  }

  /**
   * Handle method response from Host
   */
  private handleMethodResponse(message: WorkbenchMessage<MethodResponsePayload>): void {
    const { correlationId, result, error } = message.payload;

    const pending = this.pendingRequests.get(correlationId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(correlationId);

    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  }

  /**
   * Create proxy API that routes calls through messages
   */
  private createProxyAPI(): void {
    if (!this.hostAPI) {
      return;
    }
    this.proxiedHostAPI = this.createHostProxy(this.hostAPI);
  }

  private createHostProxy(api: HostAPI): HostAPI {
    return new Proxy(api, {
      get: (_target, prop: string) => {
        const value = (api as any)[prop];

        // If it's a function, create a proxy
        if (typeof value === 'function') {
          return (...args: unknown[]) => {
            // For subscribe method, handle locally
            if (prop === 'subscribe') {
              return value.apply(api, args);
            }

            // Otherwise, route through message
            return this.invokeRemoteMethod(prop.toString(), args);
          };
        }

        // If it's an object, recursively create proxy
        if (typeof value === 'object' && value !== null) {
          return this.createHostProxy(value as any);
        }

        return value;
      }
    }) as HostAPI;
  }

  /**
   * Invoke remote method through message passing
   */
  private async invokeRemoteMethod(method: string, args: unknown[]): Promise<unknown> {
    const correlationId = uuid();

    return new Promise<unknown>((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Method call timeout: ${method}`));
      }, 5000) as unknown as number;

      // Store pending request
      this.pendingRequests.set(correlationId, { resolve, reject, timeout });

      // Send method call request
      this.postMessage({
        type: 'method:call',
        target: MessageTarget.Workbench,
        payload: {
          method,
          args,
          correlationId
        }
      });
    });
  }

  /**
   * Subscribe to events from Host
   */
  on(event: string, handler: Function): () => void {
    return this.messageBus.on(event, handler);
  }

  /**
   * Subscribe once
   */
  once(event: string, handler: Function): () => void {
    return this.messageBus.once(event, handler);
  }

  /**
   * Unsubscribe
   */
  off(event: string, handler?: Function): void {
    this.messageBus.off(event, handler);
  }

  /**
   * Emit event
   */
  emit(event: string, data?: unknown): void {
    this.messageBus.emit(event, data);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    clearTimeout(this.initTimeout || 0);

    // Clean up pending requests
    const requestEntries = Array.from(this.pendingRequests.entries());
    for (const [, req] of requestEntries) {
      clearTimeout(req.timeout);
      req.reject(new Error('SDK destroyed'));
    }
    this.pendingRequests.clear();

    // Clear message bus
    this.messageBus.clear();

    this.ready = false;
    this.hostAPI = null;
    this.proxiedHostAPI = null;
    this.initResolve = null;
    this.initReject = null;
  }
}

/**
 * Init message payload
 */
interface InitPayload {
  sessionId: string;
  context: Record<string, unknown>;
  config: Record<string, unknown>;
  capabilities: Record<string, unknown>;
}

/**
 * Method response payload
 */
interface MethodResponsePayload {
  correlationId: string;
  result?: unknown;
  error?: string;
}

/**
 * Global SDK instance
 */
export const sdk = new ComponentSDK();
