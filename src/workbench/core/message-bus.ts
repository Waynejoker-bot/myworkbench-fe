/**
 * MessageBus - Message bus
 * Provides event publishing and subscription, supports wildcard listening
 */
export class MessageBus {
  private handlers = new Map<string, Set<Function>>();
  private wildcardHandlers = new Set<Function>();

  /**
   * Subscribe to an event
   * @param event Event name, use '*' to listen to all events
   * @param handler Event handler function
   * @returns Unsubscribe function
   */
  on(event: string, handler: Function): () => void {
    if (event === '*') {
      this.wildcardHandlers.add(handler);
    } else {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, new Set());
      }
      this.handlers.get(event)!.add(handler);
    }

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event (execute once only)
   * @param event Event name
   * @param handler Event handler function
   * @returns Unsubscribe function
   */
  once(event: string, handler: Function): () => void {
    const wrappedHandler = (...args: unknown[]) => {
      handler(...args);
      this.off(event, wrappedHandler);
    };

    return this.on(event, wrappedHandler);
  }

  /**
   * Unsubscribe
   * @param event Event name
   * @param handler Optional, if not specified remove all listeners for this event
   */
  off(event: string, handler?: Function): void {
    if (event === '*') {
      if (handler) {
        this.wildcardHandlers.delete(handler);
      } else {
        this.wildcardHandlers.clear();
      }
    } else {
      const handlers = this.handlers.get(event);
      if (handlers) {
        if (handler) {
          handlers.delete(handler);
        } else {
          handlers.clear();
        }
      }
    }
  }

  /**
   * Publish an event
   * @param event Event name
   * @param data Event data
   */
  emit(event: string, data?: unknown): void {
    // Trigger wildcard listeners
    this.wildcardHandlers.forEach(handler => {
      try {
        handler(event, data);
      } catch (error) {
        console.error(`Error in wildcard handler for event "${event}":`, error);
      }
    });

    // Trigger specific event listeners
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for event "${event}":`, error);
        }
      });
    }
  }

  /**
   * Clear all event listeners
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }

  /**
   * Get current listener count (for debugging)
   */
  getListenerCount(event?: string): number {
    if (event === '*') {
      return this.wildcardHandlers.size;
    }
    const handlers = event ? this.handlers.get(event) : undefined;
    return handlers ? handlers.size : 0;
  }

  /**
   * Get all event names (for debugging)
   */
  getEventNames(): string[] {
    return Array.from(this.handlers.keys());
  }
}
