# Workbench SDK 独立包设计

## 1. 概述

将 Workbench 组件协议和 SDK 抽取为独立的 npm 包，实现以下目标：

1. **通用性** - SDK 可在任何前端项目中使用，不限于特定框架
2. **版本管理** - 独立发布和版本控制
3. **可维护性** - 协议变更不影响实现方
4. **可测试性** - 独立的测试和验证

---

## 2. 包结构

```
@workbench/
├── sdk/                    # 主 SDK 包
│   ├── package.json
│   ├── src/
│   │   ├── types/         # TypeScript 类型定义
│   │   ├── core/          # 核心功能
│   │   ├── host/          # Host 端实现
│   │   ├── component/     # Component 端实现
│   │   └── utils/         # 工具函数
│   └── dist/              # 编译输出
│
├── sdk-react/             # React 集成
│   ├── package.json
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── hooks/         # React Hooks
│   │   └── context/       # React Context
│   └── dist/
│
├── sdk-vue/               # Vue 集成
│   └── ...
│
├── devtools/              # 开发者工具
│   ├── package.json
│   └── src/
│       ├── server/        # 开发服务器
│       ├── cli/           # CLI 工具
│       └── browser/       # 浏览器扩展
│
└── examples/              # 示例项目
    ├── react-app/
    ├── vue-app/
    └── vanilla-app/
```

---

## 3. @workbench/sdk - 核心包

### 3.1 package.json

```json
{
  "name": "@workbench/sdk",
  "version": "1.0.0",
  "description": "Workbench Component SDK - Core functionality",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "rollup -c",
    "test": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "workbench",
    "component",
    "plugin",
    "microfrontend"
  ],
  "peerDependencies": {},
  "dependencies": {},
  "devDependencies": {
    "@rollup/plugin-typescript": "^11.0.0",
    "rollup": "^3.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./types": "./dist/types/index.js",
    "./host": "./dist/host/index.js",
    "./component": "./dist/component/index.js"
  }
}
```

### 3.2 导出结构

```typescript
// src/index.ts - 主入口

// ============ 类型定义 ============
export * from './types';

// ============ 核心 ============
export { MessageBus } from './core/message-bus';
export { createWorkbenchHost, createWorkbenchComponent } from './core/factory';

// ============ Host ============
export { WorkbenchHost } from './host/host';
export { HostCapabilitiesBuilder } from './host/capabilities-builder';
export type { HostAPI, HostConfig } from './host/types';

// ============ Component ============
export { WorkbenchComponentBase } from './component/base';
export { ComponentManifest } from './component/manifest';
export type { WorkbenchComponent, InitContext } from './component/types';

// ============ 工具 ============
export { debounce, throttle } from './utils/timing';
export { uuid } from './utils/uuid';
export { EventBus } from './utils/event-bus';
export { createLogger } from './utils/logger';
```

### 3.3 目录结构

```
src/
├── index.ts                 # 主入口
│
├── types/                   # 类型定义
│   ├── index.ts
│   ├── message.ts          # 消息类型
│   ├── component.ts        # 组件类型
│   ├── host.ts             # Host 类型
│   └── events.ts           # 事件类型
│
├── core/                    # 核心功能
│   ├── message-bus.ts      # 消息总线
│   ├── factory.ts          # 工厂函数
│   ├── protocol.ts         # 协议常量
│   └── validator.ts        # 验证器
│
├── host/                    # Host 端
│   ├── index.ts
│   ├── host.ts             # Host 类
│   ├── capabilities.ts     # 能力实现
│   ├── container.ts        # 容器管理
│   ├── loader.ts           # 组件加载器
│   ├── sandbox.ts          # 沙箱实现
│   └── types.ts
│
├── component/               # Component 端
│   ├── index.ts
│   ├── base.ts             # 基类
│   ├── manifest.ts         # 清单处理
│   ├── bridge.ts           # 通信桥接
│   ├── sdk.ts              # SDK 实例
│   └── types.ts
│
└── utils/                   # 工具函数
    ├── timing.ts
    ├── uuid.ts
    ├── event-bus.ts
    ├── logger.ts
    ├── validator.ts
    └── format.ts
```

---

## 4. 核心实现

### 4.1 类型定义 (src/types/)

```typescript
// src/types/message.ts
export interface WorkbenchMessage<T = unknown> {
  id: string;
  timestamp: number;
  source: MessageSource;
  target: MessageTarget;
  type: string;
  payload: T;
  correlationId?: string;
  timeout?: number;
}

export enum MessageSource {
  ChatBox = 'chatbox',
  Workbench = 'workbench',
  Component = 'component'
}

export enum MessageTarget {
  Broadcast = 'broadcast',
  ChatBox = 'chatbox',
  Workbench = 'workbench',
  Component = 'component'
}

// 消息事件（用于订阅）
export interface MessageStreamEvent {
  message: Message;
  isStreaming: boolean;
  delta?: string;
  isComplete: boolean;
  timestamp: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

```typescript
// src/types/host.ts
export interface HostAPI {
  messages: MessageAPI;
  sessions: SessionAPI;
  input: InputAPI;
  ui: UIAPI;
  events: EventAPI;
  context: ChatContext;
}

export interface MessageAPI {
  getAll(): Message[];
  getById(id: string): Message | undefined;
  send(content: string, agentId?: string): Promise<void>;
  subscribe(
    callback: (event: MessageStreamEvent) => void,
    options?: SubscriptionOptions
  ): () => void;
}

export interface SessionAPI {
  getCurrent(): Session | null;
  switch(sessionId: string): Promise<void>;
  create(): Promise<Session>;
  list(): Session[];
  subscribe(callback: (session: Session) => void): () => void;
}

export interface InputAPI {
  append(text: string): void;
  replace(text: string): void;
  insert(text: string, position: number): void;
  clear(): void;
  getValue(): string;
  subscribe(callback: (value: string) => void): () => void;
}

export interface UIAPI {
  resize(width: number, height?: number): void;
  close(): void;
  focus(): void;
  notify(options: NotificationOptions): void;
}

export interface EventAPI {
  on(event: string, handler: Function): () => void;
  once(event: string, handler: Function): () => void;
  off(event: string, handler?: Function): void;
  emit(event: string, data?: unknown): void;
}

export interface ChatContext {
  sessionId: string;
  userId?: string;
  currentAgent?: string;
  metadata: Record<string, unknown>;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionOptions {
  includeHistory?: boolean;
  streamingOnly?: boolean;
  filter?: (message: Message) => boolean;
  limit?: number;
}

export interface NotificationOptions {
  level: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}
```

```typescript
// src/types/component.ts
export interface WorkbenchComponent {
  readonly id: string;
  readonly version: string;
  init(context: InitContext): Promise<void> | void;
  mount(element: HTMLElement): Promise<void> | void;
  unmount(): Promise<void> | void;
  handleMessage?(message: WorkbenchMessage): Promise<void> | void;
  healthCheck(): Promise<boolean> | boolean;
}

export interface InitContext {
  host: HostAPI;
  params: Record<string, unknown>;
  session: SessionContext;
  config: ComponentConfig;
  manifest: ComponentManifest;
}

export interface ComponentConfig {
  [key: string]: unknown;
}

export interface ComponentManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  entry: string;
  styles?: string[];
  assets?: string[];
  capabilities: {
    required: string[];
    optional: string[];
    provided: string[];
  };
  dependencies?: Dependency[];
  security?: SecurityConfig;
  configSchema?: JSONSchema;
}

export interface Dependency {
  name: string;
  version: string;
  url?: string;
}

export interface SecurityConfig {
  permissions: string[];
  csp?: string;
}

export interface SessionContext {
  sessionId: string;
  userId?: string;
  currentAgent?: string;
}
```

### 4.2 消息总线 (src/core/message-bus.ts)

```typescript
export class MessageBus {
  private handlers = new Map<string, Set<Function>>();
  private wildcardHandlers = new Set<Function>();

  on(event: string, handler: Function): () => void {
    if (event === '*') {
      this.wildcardHandlers.add(handler);
    } else {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, new Set());
      }
      this.handlers.get(event)!.add(handler);
    }

    // 返回取消订阅函数
    return () => this.off(event, handler);
  }

  once(event: string, handler: Function): () => void {
    const wrappedHandler = (...args: unknown[]) => {
      handler(...args);
      this.off(event, wrappedHandler);
    };

    return this.on(event, wrappedHandler);
  }

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

  emit(event: string, data?: unknown): void {
    // 触发通配符监听器
    this.wildcardHandlers.forEach(handler => {
      try {
        handler(event, data);
      } catch (error) {
        console.error(`Error in wildcard handler for event "${event}":`, error);
      }
    });

    // 触发特定事件监听器
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

  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }
}
```

### 4.3 Component SDK (src/component/sdk.ts)

```typescript
/**
 * Component SDK - 组件端使用的 SDK
 * 提供与 Host 通信的能力
 */
export class ComponentSDK {
  private messageBus: MessageBus;
  private hostAPI: HostAPI | null = null;
  private ready = false;

  constructor() {
    this.messageBus = new MessageBus();
    this.setupMessageListener();
  }

  /**
   * 初始化 SDK，等待 Host 连接
   */
  async init(): Promise<HostAPI> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SDK initialization timeout'));
      }, 10000);

      // 监听 init 消息
      window.addEventListener('message', (event) => {
        const message = event.data as WorkbenchMessage<{ hostAPI: HostAPI }>;

        if (message.type === 'sdk:init') {
          clearTimeout(timeout);
          this.hostAPI = message.payload.hostAPI;
          this.createProxyAPI();
          this.ready = true;
          resolve(this.hostAPI!);
        }
      });

      // 通知 Host 准备就绪
      this.postMessage({
        type: 'sdk:ready',
        payload: {}
      });
    });
  }

  /**
   * 获取 Host API
   */
  getHost(): HostAPI {
    if (!this.ready || !this.hostAPI) {
      throw new Error('SDK not initialized. Call init() first.');
    }
    return this.proxiedHostAPI!;
  }

  /**
   * 发送消息到 Host
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
   * 设置消息监听
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      const message = event.data as WorkbenchMessage;

      // 验证消息来源
      if (message.source !== MessageSource.Workbench) {
        return;
      }

      // 触发事件
      this.messageBus.emit(message.type, message.payload);
    });
  }

  /**
   * 创建代理 API，使 Host API 调用通过消息传递
   */
  private createProxyAPI(): void {
    this.proxiedHostAPI = this.createHostProxy(this.hostAPI!);
  }

  private createHostProxy(api: HostAPI): HostAPI {
    return new Proxy(api, {
      get: (target, prop: string) => {
        const value = (target as any)[prop];

        // 如果是函数，创建代理
        if (typeof value === 'function') {
          return (...args: unknown[]) => {
            // 对于本地可调用的方法，直接调用
            if (this.isLocalMethod(prop)) {
              return value.apply(target, args);
            }

            // 否则通过消息传递
            return this.invokeRemoteMethod(prop.toString(), args);
          };
        }

        // 如果是对象，递归创建代理
        if (typeof value === 'object' && value !== null) {
          return this.createHostProxy(value);
        }

        return value;
      }
    });
  }

  /**
   * 判断是否为本地方法（不需要消息传递）
   */
  private isLocalMethod(method: string): boolean {
    // subscribe 方法是本地的
    return method === 'subscribe';
  }

  /**
   * 远程调用方法
   */
  private async invokeRemoteMethod(method: string, args: unknown[]): Promise<unknown> {
    const correlationId = uuid();

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        this.messageBus.off(`response:${correlationId}`, responseHandler);
        reject(new Error(`Method call timeout: ${method}`));
      }, 5000);

      // 监听响应
      const responseHandler = (response: any) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result);
        }
      };

      this.messageBus.on(`response:${correlationId}`, responseHandler);

      // 发送调用请求
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

  private proxiedHostAPI: HostAPI | null = null;
}

// 全局 SDK 实例
export const sdk = new ComponentSDK();
```

### 4.4 Host 实现 (src/host/host.ts)

```typescript
/**
 * Workbench Host - Host 端实现
 */
export class WorkbenchHost {
  private config: HostConfig;
  private messageBus: MessageBus;
  private capabilities: HostCapabilities;
  private components: Map<string, ComponentInstance> = new Map();

  constructor(config: HostConfig) {
    this.config = config;
    this.messageBus = new MessageBus();
    this.capabilities = this.buildCapabilities(config);
  }

  /**
   * 加载组件
   */
  async loadComponent(manifestUrl: string): Promise<string> {
    const loader = new ComponentLoader(this.config.security);
    const manifest = await loader.loadManifest(manifestUrl);

    // 验证权限
    this.validatePermissions(manifest);

    // 创建组件实例
    const instance = await this.createComponent(manifest);
    this.components.set(instance.id, instance);

    this.messageBus.emit('component:loaded', { componentId: instance.id });

    return instance.id;
  }

  /**
   * 卸载组件
   */
  async unloadComponent(componentId: string): Promise<void> {
    const instance = this.components.get(componentId);
    if (instance) {
      await instance.unmount();
      this.components.delete(componentId);
      this.messageBus.emit('component:unloaded', { componentId });
    }
  }

  /**
   * 发送消息到组件
   */
  async sendToComponent(componentId: string, message: WorkbenchMessage): Promise<void> {
    const instance = this.components.get(componentId);
    if (instance) {
      await instance.handleMessage(message);
    }
  }

  /**
   * 广播消息到所有组件
   */
  async broadcast(message: WorkbenchMessage): Promise<void> {
    for (const instance of this.components.values()) {
      await instance.handleMessage(message);
    }
  }

  /**
   * 通知新消息（支持流式）
   */
  notifyMessage(event: MessageStreamEvent): void {
    this.broadcast({
      type: 'event:message:stream',
      payload: event,
      source: MessageSource.Workbench,
      target: MessageTarget.Component
    } as WorkbenchMessage);
  }

  /**
   * 通知会话变化
   */
  notifySessionChange(session: Session): void {
    this.broadcast({
      type: 'event:session:change',
      payload: { sessionId: session.id },
      source: MessageSource.Workbench,
      target: MessageTarget.Component
    } as WorkbenchMessage);
  }

  /**
   * 获取事件总线
   */
  getEvents(): EventAPI {
    return {
      on: (event, handler) => this.messageBus.on(event, handler),
      once: (event, handler) => this.messageBus.once(event, handler),
      off: (event, handler) => this.messageBus.off(event, handler),
      emit: (event, data) => this.messageBus.emit(event, data)
    };
  }

  /**
   * 构建能力对象
   */
  private buildCapabilities(config: HostConfig): HostCapabilities {
    return new HostCapabilitiesBuilder(config)
      .withMessages(config.messageAPI)
      .withSessions(config.sessionAPI)
      .withInput(config.inputAPI)
      .withUI(config.uiAPI)
      .withContext(config.context)
      .build();
  }

  /**
   * 验证权限
   */
  private validatePermissions(manifest: ComponentManifest): void {
    const requested = manifest.security?.permissions || [];
    const allowed = this.config.security?.allowedPermissions || ['*'];

    for (const permission of requested) {
      if (!allowed.includes('*') && !allowed.includes(permission)) {
        throw new Error(`Permission denied: ${permission}`);
      }
    }
  }

  /**
   * 创建组件实例
   */
  private async createComponent(manifest: ComponentManifest): Promise<ComponentInstance> {
    const sandbox = new IFrameSandbox(this.config.security);
    await sandbox.create(manifest);

    const instance = new ComponentInstance({
      manifest,
      sandbox,
      capabilities: this.capabilities,
      messageBus: this.messageBus
    });

    await instance.init();

    return instance;
  }
}
```

---

## 5. @workbench/sdk-react - React 集成

### 5.1 package.json

```json
{
  "name": "@workbench/sdk-react",
  "version": "1.0.0",
  "description": "React integration for Workbench SDK",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "react": "^18.0.0",
    "@workbench/sdk": "^1.0.0"
  },
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./components": "./dist/components/index.js",
    "./hooks": "./dist/hooks/index.js"
  }
}
```

### 5.2 React Hooks

```typescript
// src/hooks/useWorkbenchHost.ts
import { useContext, useCallback, useMemo } from 'react';
import { WorkbenchContext } from '../context';
import type { HostAPI, ComponentManifest } from '@workbench/sdk';

export function useWorkbenchHost(): HostAPI {
  const context = useContext(WorkbenchContext);
  if (!context) {
    throw new Error('useWorkbenchHost must be used within WorkbenchProvider');
  }
  return context.host;
}

export function useWorkbenchComponent(componentId: string) {
  const context = useContext(WorkbenchContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = useCallback(async (manifestUrl: string) => {
    try {
      setLoading(true);
      setError(null);
      const id = await context?.host.loadComponent(manifestUrl);
      return id;
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [context]);

  const unloadComponent = useCallback(async () => {
    if (context && componentId) {
      await context.host.unloadComponent(componentId);
    }
  }, [context, componentId]);

  return {
    loadComponent,
    unloadComponent,
    loading,
    error
  };
}

export function useMessages() {
  const host = useWorkbenchHost();
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // 初始加载
    setMessages(host.messages.getAll());

    // 订阅新消息
    const unsubscribe = host.messages.subscribe((event) => {
      setMessages(prev => {
        if (event.isStreaming) {
          // 更新流式消息
          const existing = prev.find(m => m.id === event.message.id);
          if (existing) {
            return prev.map(m =>
              m.id === event.message.id
                ? { ...m, content: m.content + (event.delta || '') }
                : m
            );
          }
          return [...prev, event.message];
        }
        return [...prev, event.message];
      });
    }, { includeHistory: false });

    return unsubscribe;
  }, [host]);

  return messages;
}

export function useSessions() {
  const host = useWorkbenchHost();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [current, setCurrent] = useState<Session | null>(null);

  useEffect(() => {
    setSessions(host.sessions.list());
    setCurrent(host.sessions.getCurrent());

    return host.sessions.subscribe((session) => {
      setCurrent(session);
      setSessions(host.sessions.list());
    });
  }, [host]);

  return { sessions, current, switch: host.sessions.switch };
}
```

### 5.3 React 组件

```typescript
// src/components/WorkbenchContainer.tsx
import { useEffect, useRef, useState } from 'react';
import { useWorkbenchHost } from '../hooks';
import type { ComponentManifest } from '@workbench/sdk';

interface WorkbenchContainerProps {
  componentUrl?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  onResize?: (width: number) => void;
  onClose?: () => void;
}

export function WorkbenchContainer({
  componentUrl,
  width = 400,
  minWidth = 280,
  maxWidth = 800,
  resizable = true,
  onResize,
  onClose
}: WorkbenchContainerProps) {
  const containerRef = useRef<HTMLIFrameElement>(null);
  const [componentWidth, setComponentWidth] = useState(width);
  const [isResizing, setIsResizing] = useState(false);
  const { loadComponent, unloadComponent, loading, error } = useWorkbenchComponent();

  useEffect(() => {
    if (componentUrl) {
      loadComponent(componentUrl);
    }

    return () => {
      if (componentUrl) {
        unloadComponent();
      }
    };
  }, [componentUrl]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!resizable) return;
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setComponentWidth(newWidth);
        onResize?.(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  if (error) {
    return (
      <div className="workbench-error">
        <p>Failed to load component: {error.message}</p>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    );
  }

  return (
    <div
      className="workbench-container"
      style={{ width: componentWidth }}
    >
      {resizable && (
        <div
          className="resize-handle"
          onMouseDown={handleMouseDown}
        />
      )}

      {loading && (
        <div className="workbench-loading">
          <div className="spinner" />
        </div>
      )}

      <iframe
        ref={containerRef}
        title="Workbench Component"
        sandbox="allow-scripts allow-same-origin"
        className="workbench-iframe"
      />
    </div>
  );
}
```

---

## 6. 开发工具

### 6.1 开发服务器 (devtools/server/)

```typescript
// @workbench/devtools/server
import express from 'express';
import { serveStatic } from 'serve-static';

interface DevServerOptions {
  componentPath: string;
  port?: number;
  mockHost?: Partial<HostAPI>;
  hotReload?: boolean;
}

export async function createDevServer(options: DevServerOptions) {
  const app = express();
  const port = options.port || 3001;

  // 提供组件文件
  app.use(serveStatic(options.componentPath));

  // 提供模拟 Host 环境
  app.get('/mock-host.js', (req, res) => {
    res.send(`
      window.__WORKBENCH_MOCK_HOST__ = ${JSON.stringify(options.mockHost)};
    `);
  });

  // 热重载端点
  if (options.hotReload) {
    const chokidar = await import('chokidar');
    const watcher = chokidar.watch(options.componentPath);

    watcher.on('change', () => {
      // 通知所有连接的客户端刷新
      broadcast({ type: 'reload' });
    });
  }

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Dev server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}
```

### 6.2 CLI 工具 (devtools/cli/)

```bash
# 创建新组件
npx @workbench/devtools init my-component

# 验证 manifest
npx @workbench/devtools validate manifest.json

# 构建组件
npx @workbench/devtools build

# 发布到 CDN
npx @workbench/devtools publish --cdn
```

---

## 7. 发布流程

### 7.1 版本管理

```bash
# 1. 更新版本
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# 2. 构建
npm run build

# 3. 发布
npm publish

# 4. 发布其他包
cd ../sdk-react && npm publish
cd ../devtools && npm publish
```

### 7.2 变更日志

使用 conventional-changelog 自动生成：

```bash
npm run changelog
```

---

## 8. 使用示例

### 8.1 在 React 项目中使用

```bash
# 安装
npm install @workbench/sdk @workbench/sdk-react
```

```tsx
// App.tsx
import { WorkbenchProvider } from '@workbench/sdk-react';
import { ChatBoxPage } from './pages/ChatBoxPage';

function App() {
  const hostConfig = {
    messageAPI: {
      getAll: () => messages,
      send: async (content) => { /* ... */ },
      subscribe: (callback) => { /* ... */ }
    },
    // ... 其他配置
  };

  return (
    <WorkbenchProvider config={hostConfig}>
      <ChatBoxPage />
    </WorkbenchProvider>
  );
}
```

### 8.2 在 Vue 项目中使用

```bash
# 安装
npm install @workbench/sdk @workbench/sdk-vue
```

```vue
<!-- App.vue -->
<template>
  <workbench-provider :config="hostConfig">
    <ChatBoxPage />
  </workbench-provider>
</template>

<script setup>
import { WorkbenchProvider } from '@workbench/sdk-vue';
import { useWorkbench } from '@workbench/sdk-vue';

const hostConfig = {
  messageAPI: { /* ... */ },
  // ...
};

const { host } = useWorkbench();
</script>
```

### 8.3 在原生 JS 项目中使用

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@workbench/sdk/dist/index.js"></script>
</head>
<body>
  <div id="workbench"></div>

  <script>
    const { WorkbenchHost } = WorkbenchSDK;

    const host = new WorkbenchHost({
      messageAPI: { /* ... */ }
    });

    const componentId = await host.loadComponent(
      'https://cdn.example.com/my-component/manifest.json'
    );
  </script>
</body>
</html>
```

---

## 9. 总结

通过将 SDK 抽取为独立包，我们获得了：

1. **框架无关** - SDK 核心不依赖任何框架，可在任何项目中使用
2. **类型安全** - 完整的 TypeScript 类型定义
3. **独立演进** - 协议和实现可以独立版本控制
4. **易于测试** - 核心功能可以独立测试
5. **社区友好** - 第三方开发者可以轻松开发组件

---

**文档版本**: 1.0.0
**最后更新**: 2026-02-05
**作者**: ZC & Claude
