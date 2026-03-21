/**
 * Workbench Host API Types
 *
 * Defines the API that ChatBox (Host) exposes to Components.
 */

import type { Message, Session, ChatContext, NotificationOptions, SubscriptionOptions, UnsubscribeFunction } from './common';
import type { MessageStreamEvent } from './message';

/**
 * Host API - Main interface exposed by ChatBox to components
 */
export interface HostAPI {
  /** Message operations */
  readonly messages: MessageAPI;

  /** Session operations */
  readonly sessions: SessionAPI;

  /** Input operations */
  readonly input: InputAPI;

  /** UI operations */
  readonly ui: UIAPI;

  /** Event operations */
  readonly events: EventAPI;

  /** Current context */
  readonly context: ChatContext;
}

/**
 * Message API - Operations for managing messages
 */
export interface MessageAPI {
  /**
   * Get all messages in current session
   * @returns Array of all messages
   */
  getAll(): Message[];

  /**
   * Get a message by ID
   * @param id - Message ID
   * @returns Message or undefined if not found
   */
  getById(id: string): Message | undefined;

  /**
   * Send a new message
   * @param content - Message content
   * @param agentId - Optional agent ID
   * @returns Promise that resolves when message is sent
   */
  send(content: string, agentId?: string): Promise<void>;

  /**
   * Subscribe to message events
   * @param callback - Callback function for message events
   * @param options - Optional subscription options
   * @returns Unsubscribe function
   */
  subscribe(
    callback: (event: MessageStreamEvent) => void,
    options?: SubscriptionOptions
  ): UnsubscribeFunction;
}

/**
 * Session API - Operations for managing sessions
 */
export interface SessionAPI {
  /**
   * Get current session
   * @returns Current session or null
   */
  getCurrent(): Session | null;

  /**
   * Switch to a different session
   * @param sessionId - Target session ID
   * @returns Promise that resolves when session is switched
   */
  switch(sessionId: string): Promise<void>;

  /**
   * Create a new session
   * @returns Promise that resolves with new session
   */
  create(): Promise<Session>;

  /**
   * List all sessions
   * @returns Array of all sessions
   */
  list(): Session[];

  /**
   * Subscribe to session changes
   * @param callback - Callback function for session changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (session: Session) => void): UnsubscribeFunction;
}

/**
 * Input API - Operations for managing input field
 */
export interface InputAPI {
  /**
   * Append text to input
   * @param text - Text to append
   */
  append(text: string): void;

  /**
   * Replace input content
   * @param text - Replacement text
   */
  replace(text: string): void;

  /**
   * Insert text at position
   * @param text - Text to insert
   * @param position - Insertion position
   */
  insert(text: string, position: number): void;

  /**
   * Clear input content
   */
  clear(): void;

  /**
   * Get current input value
   * @returns Current input text
   */
  getValue(): string;

  /**
   * Subscribe to input changes
   * @param callback - Callback function for input changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (value: string) => void): UnsubscribeFunction;
}

/**
 * UI API - Operations for UI control
 */
export interface UIAPI {
  /**
   * Resize the component container
   * @param width - New width
   * @param height - Optional new height
   */
  resize(width: number, height?: number): void;

  /**
   * Close the component
   */
  close(): void;

  /**
   * Request focus for the component
   */
  focus(): void;

  /**
   * Show a notification
   * @param options - Notification options
   */
  notify(options: NotificationOptions): void;
}

/**
 * Event API - Operations for event handling
 */
export interface EventAPI {
  /**
   * Register an event handler
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  on(event: string, handler: (...args: unknown[]) => void): UnsubscribeFunction;

  /**
   * Register a one-time event handler
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  once(event: string, handler: (...args: unknown[]) => void): UnsubscribeFunction;

  /**
   * Unregister event handler(s)
   * @param event - Event name
   * @param handler - Optional specific handler to remove
   */
  off(event: string, handler?: (...args: unknown[]) => void): void;

  /**
   * Emit an event
   * @param event - Event name
   * @param data - Optional event data
   */
  emit(event: string, data?: unknown): void;
}

/**
 * Host configuration for creating a WorkbenchHost instance
 */
export interface HostConfig {
  /** Message API implementation */
  messageAPI: Omit<MessageAPI, 'subscribe'> & {
    subscribe(callback: (event: MessageStreamEvent) => void, options?: SubscriptionOptions): UnsubscribeFunction;
  };

  /** Session API implementation */
  sessionAPI: Omit<SessionAPI, 'subscribe'> & {
    subscribe(callback: (session: Session) => void): UnsubscribeFunction;
  };

  /** Input API implementation */
  inputAPI: Omit<InputAPI, 'subscribe'> & {
    subscribe(callback: (value: string) => void): UnsubscribeFunction;
  };

  /** UI API implementation */
  uiAPI: UIAPI;

  /** Current context */
  context: ChatContext;

  /** Optional security configuration */
  security?: HostSecurityConfig;

  /** Optional event API implementation */
  eventAPI?: EventAPI;
}

/**
 * Host security configuration
 *
 * Note: This configuration is for Shadow DOM implementation.
 * For Shadow DOM, there is no iframe sandbox, so CSP and permissions
 * are the main security mechanisms.
 */
export interface HostSecurityConfig {
  /** Allowed origins for components */
  allowedOrigins?: string[];

  /** Whether CSP is enabled */
  cspEnabled?: boolean;

  /** Allowed permissions */
  allowedPermissions?: string[];

  /** Custom CSP string */
  csp?: string;
}

/**
 * Permission type
 */
export type Permission = string;

/**
 * Host capabilities exposed to components
 */
export interface HostCapabilities {
  /** Message capabilities */
  messages: MessageAPI;

  /** Session capabilities */
  sessions: SessionAPI;

  /** Input capabilities */
  input: InputAPI;

  /** UI capabilities */
  ui: UIAPI;

  /** Current context */
  context: ChatContext;
}

/**
 * Workbench host interface
 */
export interface WorkbenchHost {
  /**
   * Load a component
   * @param manifestUrl - URL to component manifest
   * @returns Component ID
   */
  loadComponent(manifestUrl: string): Promise<string>;

  /**
   * Unload a component
   * @param componentId - Component ID to unload
   */
  unloadComponent(componentId: string): Promise<void>;

  /**
   * Send message to a component
   * @param componentId - Target component ID
   * @param message - Message to send
   */
  sendToComponent(componentId: string, message: import('./message').WorkbenchMessage): Promise<void>;

  /**
   * Broadcast message to all components
   * @param message - Message to broadcast
   */
  broadcast(message: import('./message').WorkbenchMessage): Promise<void>;

  /**
   * Get event bus
   * @returns Event API
   */
  getEvents(): EventAPI;

  /**
   * Get host capabilities
   * @returns Host capabilities
   */
  getCapabilities(): HostCapabilities;

  /**
   * Get a component instance
   * @param componentId - Component ID
   * @returns Component instance or undefined
   */
  getComponent(componentId: string): ComponentInstance | undefined;

  /**
   * Get all component instances
   * @returns Array of component instances
   */
  getComponents(): ComponentInstance[];
}

/**
 * Component instance (runtime)
 */
export interface ComponentInstance {
  /** Instance ID */
  id: string;

  /** Component manifest */
  manifest: import('./component').ComponentManifest;

  /** Current state */
  state: 'initializing' | 'ready' | 'error' | 'destroyed';

  /** Optional error */
  error?: Error;

  /** Mount element */
  element: HTMLElement | null;

  /** Reference to component implementation */
  component: import('./component').WorkbenchComponent | null;

  /**
   * Send message to component
   * @param message - Message to send
   */
  send(message: import('./message').WorkbenchMessage): Promise<void>;

  /**
   * Destroy instance
   */
  destroy(): Promise<void>;

  /**
   * Check if component is ready
   */
  isReady(): boolean;

  /**
   * Check if component is loading
   */
  isLoading(): boolean;

  /**
   * Check if component has error
   */
  hasError(): boolean;
}
