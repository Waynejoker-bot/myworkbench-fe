/**
 * WorkbenchComponentBase - Base class for components
 * Provides default lifecycle implementations
 */

import type { WorkbenchComponent, InitContext } from '../types/component';
import type { WorkbenchMessage } from '../types/message';
import { sdk } from './sdk';

/**
 * Base class for Workbench components
 * Components can extend this class for easier implementation
 */
export abstract class WorkbenchComponentBase implements WorkbenchComponent {
  /** Unique component identifier */
  readonly id: string = 'base-component';
  /** Component version */
  readonly version: string = '1.0.0';
  protected host: InitContext['host'] | null = null;
  protected params: Record<string, unknown> = {};
  protected config: Record<string, unknown> = {};
  protected session: InitContext['session'] | null = null;
  protected manifest: InitContext['manifest'] | null = null;
  protected unsubscribeFunctions: (() => void)[] = [];

  /**
   * Initialize component
   */
  async init(context: InitContext): Promise<void> {
    this.host = context.host;
    this.params = context.params;
    this.config = context.config;
    this.session = context.session;
    this.manifest = context.manifest;

    this.onInit?.(context);

    // Set up default subscriptions
    this.setupDefaultSubscriptions();
  }

  /**
   * Default mount implementation
   */
  async mount(element: HTMLElement): Promise<void> {
    this.element = element;
    this.onMount?.();
    this.render();
  }

  protected element: HTMLElement | null = null;

  /**
   * Default unmount implementation
   */
  async unmount(): Promise<void> {
    this.onDestroy?.();

    // Clean up all subscriptions
    this.unsubscribeFunctions.forEach(fn => fn());
    this.unsubscribeFunctions = [];

    // Clean up DOM
    if (this.element) {
      this.element.innerHTML = '';
      this.element = null;
    }
  }

  /**
   * Default message handling
   */
  async handleMessage(message: WorkbenchMessage): Promise<void> {
    this.handleCustomMessage?.(message);
  }

  /**
   * Default health check
   */
  healthCheck(): boolean {
    return this.element !== null;
  }

  /**
   * Hook for custom initialization logic
   */
  protected onInit?(context: InitContext): Promise<void> | void;

  /**
   * Hook for custom mount logic
   */
  protected onMount?(): Promise<void> | void;

  /**
   * Hook for custom message handling
   */
  protected handleCustomMessage?(message: WorkbenchMessage): Promise<void> | void;

  /**
   * Hook for cleanup logic
   */
  protected onDestroy?(): Promise<void> | void;

  /**
   * Set up default subscriptions
   */
  protected setupDefaultSubscriptions(): void {
    // Subclasses can override this method
  }

  /**
   * Render method - subclasses should implement
   */
  protected abstract render(): void;

  /**
   * Add cleanup handler
   */
  protected addCleanup(fn: () => void): void {
    this.unsubscribeFunctions.push(fn);
  }

  /**
   * Escape HTML to prevent XSS
   */
  protected escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Send notification to Host
   */
  protected notify(options: {
    level: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    duration?: number;
  }): void {
    this.host?.ui.notify(options);
  }

  /**
   * Resize container
   */
  protected resize(width: number, height?: number): void {
    this.host?.ui.resize(width, height);
  }

  /**
   * Close component
   */
  protected close(): void {
    this.host?.ui.close();
  }

  /**
   * Request focus
   */
  protected focus(): void {
    this.host?.ui.focus();
  }

  /**
   * Append text to input
   */
  protected appendInput(text: string): void {
    this.host?.input.append(text);
  }

  /**
   * Replace input text
   */
  protected replaceInput(text: string): void {
    this.host?.input.replace(text);
  }

  /**
   * Insert text at position
   */
  protected insertInput(text: string, position: number): void {
    this.host?.input.insert(text, position);
  }

  /**
   * Clear input
   */
  protected clearInput(): void {
    this.host?.input.clear();
  }

  /**
   * Get input value
   */
  protected getInputValue(): string {
    return this.host?.input.getValue() ?? '';
  }

  /**
   * Send message
   */
  protected async sendMessage(content: string, agentId?: string): Promise<void> {
    await this.host?.messages.send(content, agentId);
  }

  /**
   * Get all messages
   */
  protected getAllMessages() {
    return this.host?.messages.getAll() ?? [];
  }

  /**
   * Get message by ID
   */
  protected getMessageById(id: string) {
    return this.host?.messages.getById(id);
  }

  /**
   * Get current session
   */
  protected getCurrentSession() {
    return this.host?.sessions.getCurrent();
  }

  /**
   * Switch session
   */
  protected async switchSession(sessionId: string): Promise<void> {
    await this.host?.sessions.switch(sessionId);
  }

  /**
   * Create new session
   */
  protected async createSession() {
    return this.host?.sessions.create();
  }

  /**
   * List all sessions
   */
  protected listSessions() {
    return this.host?.sessions.list() ?? [];
  }
}

/**
 * Convenience export for components
 */
export { sdk as defaultSDK };
