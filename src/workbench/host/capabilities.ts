/**
 * HostCapabilitiesBuilder
 * 构建器模式创建 Host 能力对象
 */

import type {
  HostAPI,
  MessageAPI,
  SessionAPI,
  InputAPI,
  UIAPI,
  EventAPI,
  HostConfig
} from '../types/host';
import type {
  SubscriptionOptions,
  NotificationOptions,
  MessageStreamEvent,
  Message,
  Session,
  ChatContext
} from '../types';
import { uuid } from '../utils/uuid';

/**
 * HostCapabilitiesBuilder - 构建器模式
 * 用于创建 HostAPI 实例
 */
export class HostCapabilitiesBuilder {
  private messageAPI?: MessageAPI;
  private sessionAPI?: SessionAPI;
  private inputAPI?: InputAPI;
  private uiAPI?: UIAPI;
  private context?: ChatContext;
  private eventAPI?: EventAPI;

  constructor() {}

  /**
   * 设置消息 API
   */
  withMessages(api: MessageAPI): this {
    this.messageAPI = api;
    return this;
  }

  /**
   * 设置会话 API
   */
  withSessions(api: SessionAPI): this {
    this.sessionAPI = api;
    return this;
  }

  /**
   * 设置输入 API
   */
  withInput(api: InputAPI): this {
    this.inputAPI = api;
    return this;
  }

  /**
   * 设置 UI API
   */
  withUI(api: UIAPI): this {
    this.uiAPI = api;
    return this;
  }

  /**
   * 设置上下文
   */
  withContext(context: ChatContext): this {
    this.context = context;
    return this;
  }

  /**
   * 设置事件 API
   */
  withEvents(api: EventAPI): this {
    this.eventAPI = api;
    return this;
  }

  /**
   * 从配置构建
   */
  fromConfig(config: HostConfig): this {
    if (config.messageAPI) {
      this.withMessages(config.messageAPI);
    }
    if (config.sessionAPI) {
      this.withSessions(config.sessionAPI);
    }
    if (config.inputAPI) {
      this.withInput(config.inputAPI);
    }
    if (config.uiAPI) {
      this.withUI(config.uiAPI);
    }
    if (config.context) {
      this.withContext(config.context);
    }
    if (config.eventAPI) {
      this.withEvents(config.eventAPI);
    }
    return this;
  }

  /**
   * 构建最终的 HostAPI
   */
  build(): HostAPI {
    // 检查必需的 API
    if (!this.messageAPI) {
      throw new Error('MessageAPI is required');
    }
    if (!this.sessionAPI) {
      throw new Error('SessionAPI is required');
    }
    if (!this.inputAPI) {
      throw new Error('InputAPI is required');
    }
    if (!this.uiAPI) {
      throw new Error('UIAPI is required');
    }
    if (!this.context) {
      throw new Error('Context is required');
    }

    // 如果没有提供 EventAPI，创建一个默认的
    if (!this.eventAPI) {
      this.eventAPI = this.createDefaultEventAPI();
    }

    return {
      messages: this.messageAPI,
      sessions: this.sessionAPI,
      input: this.inputAPI,
      ui: this.uiAPI,
      events: this.eventAPI,
      context: this.context
    };
  }

  /**
   * 创建默认的 EventAPI
   */
  private createDefaultEventAPI(): EventAPI {
    const handlers = new Map<string, Set<Function>>();
    const wildcardHandlers = new Set<Function>();

    return {
      on: (event: string, handler: Function) => {
        if (event === '*') {
          wildcardHandlers.add(handler);
        } else {
          if (!handlers.has(event)) {
            handlers.set(event, new Set());
          }
          handlers.get(event)!.add(handler);
        }

        return () => {
          if (event === '*') {
            wildcardHandlers.delete(handler);
          } else {
            handlers.get(event)?.delete(handler);
          }
        };
      },

      once: (event: string, handler: Function) => {
        const wrappedHandler = (...args: unknown[]) => {
          handler(...args);
          if (event === '*') {
            wildcardHandlers.delete(wrappedHandler);
          } else {
            handlers.get(event)?.delete(wrappedHandler);
          }
        };

        if (event === '*') {
          wildcardHandlers.add(wrappedHandler);
        } else {
          if (!handlers.has(event)) {
            handlers.set(event, new Set());
          }
          handlers.get(event)!.add(wrappedHandler);
        }

        return () => {
          if (event === '*') {
            wildcardHandlers.delete(wrappedHandler);
          } else {
            handlers.get(event)?.delete(wrappedHandler);
          }
        };
      },

      off: (event: string, handler?: Function) => {
        if (event === '*') {
          if (handler) {
            wildcardHandlers.delete(handler);
          } else {
            wildcardHandlers.clear();
          }
        } else {
          const h = handlers.get(event);
          if (h) {
            if (handler) {
              h.delete(handler);
            } else {
              h.clear();
            }
          }
        }
      },

      emit: (event: string, data?: unknown) => {
        // 触发通配符监听器
        wildcardHandlers.forEach(h => {
          try {
            h(event, data);
          } catch (error) {
            console.error(`Error in wildcard handler for event "${event}":`, error);
          }
        });

        // 触发特定事件监听器
        const h = handlers.get(event);
        if (h) {
          h.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in handler for event "${event}":`, error);
            }
          });
        }
      }
    };
  }
}

/**
 * 默认消息 API 实现（用于测试）
 */
export function createDefaultMessageAPI(): MessageAPI {
  const messages: Message[] = [];
  const subscribers = new Set<(event: MessageStreamEvent) => void>();

  return {
    getAll: () => [...messages],

    getById: (id: string) => messages.find(m => m.id === id),

    send: async (content: string, agentId?: string) => {
      const message: Message = {
        id: uuid(),
        role: 'user',
        content,
        timestamp: Date.now(),
        metadata: agentId ? { agentId } : undefined
      };
      messages.push(message);

      // 通知订阅者
      subscribers.forEach(sub => {
        sub({
          message,
          isStreaming: false,
          isComplete: true,
          timestamp: Date.now()
        });
      });
    },

    subscribe: (callback: (event: MessageStreamEvent) => void, options?: SubscriptionOptions) => {
      subscribers.add(callback);

      // 如果需要包含历史消息
      if (options?.includeHistory) {
        messages.forEach(msg => {
          callback({
            message: msg,
            isStreaming: false,
            isComplete: true,
            timestamp: Date.now()
          });
        });
      }

      return () => subscribers.delete(callback);
    }
  };
}

/**
 * 默认会话 API 实现（用于测试）
 */
export function createDefaultSessionAPI(): SessionAPI {
  const sessions: Session[] = [
    {
      id: uuid(),
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];
  let currentSession = sessions[0] || null;
  const subscribers = new Set<(session: Session) => void>();

  return {
    getCurrent: () => currentSession,

    switch: async (sessionId: string) => {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        currentSession = session;
        subscribers.forEach(sub => sub(session));
      }
    },

    create: async () => {
      const newSession: Session = {
        id: uuid(),
        title: 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      sessions.push(newSession);
      return newSession;
    },

    list: () => [...sessions],

    subscribe: (callback: (session: Session) => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    }
  };
}

/**
 * 默认输入 API 实现（用于测试）
 */
export function createDefaultInputAPI(): InputAPI {
  let value = '';
  const subscribers = new Set<(value: string) => void>();

  return {
    append: (text: string) => {
      value += text;
      subscribers.forEach(sub => sub(value));
    },

    replace: (text: string) => {
      value = text;
      subscribers.forEach(sub => sub(value));
    },

    insert: (text: string, position: number) => {
      value = value.slice(0, position) + text + value.slice(position);
      subscribers.forEach(sub => sub(value));
    },

    clear: () => {
      value = '';
      subscribers.forEach(sub => sub(value));
    },

    getValue: () => value,

    subscribe: (callback: (value: string) => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    }
  };
}

/**
 * 默认 UI API 实现（用于测试）
 */
export function createDefaultUIAPI(): UIAPI {
  return {
    resize: (_width: number, _height?: number) => {
      console.log('Resize requested');
    },

    close: () => {
      console.log('Close requested');
    },

    focus: () => {
      console.log('Focus requested');
    },

    notify: (options: NotificationOptions) => {
      console.log('Notification:', options);
    }
  };
}
