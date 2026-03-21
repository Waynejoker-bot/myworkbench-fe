# Workbench 动态组件架构设计文档

## 1. 架构概述

### 1.1 设计目标

构建一个灵活的、可扩展的工作台系统，实现 ChatBox 与工作台组件之间的双向通信，支持组件的动态加载和远程部署。

### 1.2 核心能力

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Workbench Architecture                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐ │
│  │   ChatBox    │◄────────┤  Workbench   │◄────────┤  Component   │ │
│  │   (Host)     │         │  (Container) │         │  (Guest)     │ │
│  │              │         │              │         │              │ │
│  │ - Messages   │         │ - Loader     │         │ - IFrame     │ │
│  │ - Input      │         │ - Manager    │         │ - WebWorker  │ │
│  │ - Sessions   │         │ - Router     │         │ - Shadow DOM │ │
│  └──────────────┘         └──────────────┘         └──────────────┘ │
│         ▲                        ▲                        ▲         │
│         │                        │                        │         │
│         └────────────────────────┴────────────────────────┘         │
│                     Event Bus / Message Channel                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 通信方向

| 方向 | 描述 | 用例 |
|------|------|------|
| Host → Container | ChatBox 控制工作台 | 加载组件、传递参数、获取组件状态 |
| Component → Host | 组件控制 ChatBox | 添加输入内容、发送消息、切换会话 |
| Component → Container | 组件与容器交互 | 请求关闭、请求调整大小、上报状态 |

---

## 2. 核心组件定义

### 2.1 WorkbenchContainer（工作台容器）

**职责：**
- 组件生命周期管理（加载、挂载、卸载）
- 消息路由和分发
- 沙箱环境隔离
- 安全策略执行

**接口定义：**

```typescript
interface WorkbenchContainerProps {
  // 容器配置
  config: {
    maxWidth: number;        // 最大宽度
    minWidth: number;        // 最小宽度
    defaultWidth: number;    // 默认宽度
    resizable: boolean;      // 是否可调整大小
  };

  // 安全配置
  security: {
    allowedOrigins: string[];     // 允许的组件来源
    sandboxFlags: string[];       // iframe sandbox 属性
    cspEnabled: boolean;          // 是否启用 CSP
  };

  // ChatBox 暴露给组件的能力
  hostCapabilities: HostCapabilities;
}

interface HostCapabilities {
  // 消息操作
  appendInput: (text: string) => void;
  sendMessage: (text: string) => void;
  getMessages: () => Message[];              // 获取当前会话所有消息
  subscribeMessages: (callback: (message: Message) => void) => () => void;  // 订阅新消息（支持流式）

  // 会话操作
  switchSession: (sessionId: string) => void;
  getCurrentSession: () => Session;
  createSession: () => Session;
  subscribeSessionChange: (callback: (session: Session) => void) => () => void;  // 订阅会话变化

  // UI 操作
  requestFocus: () => void;
  requestResize: (width: number) => void;
  requestClose: () => void;

  // 上下文数据
  getContext: () => ChatContext;
}
```

### 2.2 ComponentLoader（组件加载器）

**职责：**
- 远程组件资源加载
- 依赖解析和版本管理
- 缓存管理
- 错误处理

**加载策略：**

```typescript
interface ComponentLoadStrategy {
  // 远程 URL 加载
  remote: {
    jsUrl: string;          // JavaScript 入口文件
    cssUrl?: string[];      // 可选的样式文件
    htmlUrl?: string;       // 可选的 HTML 模板
    version?: string;       // 版本号
    integrity?: string;     // SRI 哈希值
  };

  // 内联代码加载（开发环境）
  inline?: {
    code: string;
    styles?: string;
  };
}
```

### 2.3 MessageRouter（消息路由器）

**职责：**
- 消息格式验证
- 目标路由
- 错误恢复
- 消息日志

**消息格式：**

```typescript
interface WorkbenchMessage<T = unknown> {
  // 消息元数据
  id: string;                // 唯一消息 ID
  timestamp: number;         // 时间戳
  source: MessageSource;     // 消息来源
  target: MessageTarget;     // 消息目标

  // 消息内容
  type: string;              // 消息类型
  payload: T;                // 消息数据

  // 可选字段
  correlationId?: string;    // 关联 ID（用于请求-响应）
  timeout?: number;          // 超时时间（毫秒）
}

enum MessageSource {
  ChatBox = 'chatbox',
  Workbench = 'workbench',
  Component = 'component'
}

enum MessageTarget {
  Broadcast = 'broadcast',     // 广播
  ChatBox = 'chatbox',         // 发送到 ChatBox
  Workbench = 'workbench',     // 发送到工作台
  Component = 'component'      // 发送到组件
}
```

---

## 3. 通信协议设计

### 3.1 消息类型定义

#### 3.1.1 Host → Component 消息

```typescript
// 组件初始化
interface ComponentInitMessage extends WorkbenchMessage<{
  sessionId: string;
  context: ChatContext;
  config: ComponentConfig;
}> {
  type: 'component:init';
}

// 参数更新
interface ComponentUpdateMessage extends WorkbenchMessage<{
  params: Record<string, unknown>;
}> {
  type: 'component:update';
}

// 组件可见性变化
interface ComponentVisibilityMessage extends WorkbenchMessage<{
  visible: boolean;
}> {
  type: 'component:visibility';
}

// 请求数据
interface ComponentDataRequest extends WorkbenchMessage<{
  dataType: string;
  query?: Record<string, unknown>;
}> {
  type: 'component:dataRequest';
}

// ========== 流式消息事件 ==========

// 新消息到达（支持流式）
interface MessageStreamEvent extends WorkbenchMessage<{
  message: Message;
  isStreaming: boolean;           // 是否为流式消息
  delta?: string;                  // 流式消息增量内容
  isComplete: boolean;             // 流式消息是否完成
}> {
  type: 'event:message:stream';
}

// 消息状态变化
interface MessageStateEvent extends WorkbenchMessage<{
  messageId: string;
  status: 'pending' | 'streaming' | 'completed' | 'failed';
}> {
  type: 'event:message:state';
}

// 会话切换事件
interface SessionChangeEvent extends WorkbenchMessage<{
  sessionId: string;
  previousSessionId?: string;
}> {
  type: 'event:session:change';
}

// 输入框变化事件
interface InputChangeEvent extends WorkbenchMessage<{
  value: string;
  cursor?: number;
}> {
  type: 'event:input:change';
}
```

#### 3.1.2 Component → Host 消息

```typescript
// 添加输入内容
interface AppendInputMessage extends WorkbenchMessage<{
  text: string;
  mode?: 'append' | 'replace' | 'insert';
}> {
  type: 'host:appendInput';
}

// 发送消息
interface SendMessageRequest extends WorkbenchMessage<{
  content: string;
  agentId?: string;
}> {
  type: 'host:sendMessage';
}

// 切换会话
interface SwitchSessionRequest extends WorkbenchMessage<{
  sessionId: string;
}> {
  type: 'host:switchSession';
}

// 获取会话上下文
interface GetContextRequest extends WorkbenchMessage<{}> {
  type: 'host:getContext';
}

// 调整容器大小
interface ResizeRequest extends WorkbenchMessage<{
  width: number;
  height?: number;
}> {
  type: 'container:resize';
}

// 关闭组件
interface CloseRequest extends WorkbenchMessage<{}> {
  type: 'container:close';
}

// 通知消息
interface NotificationMessage extends WorkbenchMessage<{
  level: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}> {
  type: 'host:notify';
}
```

### 3.2 请求-响应模式

支持同步风格的 API 调用：

```typescript
// ChatBox 侧
const result = await workbench.request({
  target: MessageTarget.Component,
  type: 'component:getData',
  payload: { query: '...' }
}, {
  timeout: 5000
});

// Component 侧
window.addEventListener('message', async (event) => {
  const message = event.data as WorkbenchMessage;
  if (message.type === 'component:getData') {
    const data = await fetchData(message.payload);
    postResponse(message.id, data);
  }
});
```

### 3.3 事件流模式

支持持续的事件订阅：

```typescript
// ChatBox 侧
workbench.subscribe('component:stateChange', (event) => {
  console.log('组件状态变化:', event.payload);
});

// Component 侧
function emitStateChange(state: ComponentState) {
  postMessage({
    type: 'component:stateChange',
    payload: state
  });
}
```

---

## 4. 动态加载机制

### 4.1 组件注册表

组件需要提供一个注册清单（manifest）：

```typescript
interface ComponentManifest {
  // 组件元信息
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;

  // 资源位置
  entry: string;              // 入口文件 URL
  styles?: string[];          // 样式文件 URL 列表
  assets?: string[];          // 其他资源 URL 列表

  // 能力声明
  capabilities: {
    required: string[];       // 需要的 Host 能力
    optional: string[];       // 可选的 Host 能力
    provided: string[];       // 组件提供的功能
  };

  // 依赖声明
  dependencies?: {
    name: string;
    version: string;
    url?: string;
  }[];

  // 安全配置
  security?: {
    permissions: string[];    // 请求的权限
    csp?: string;            // 内容安全策略
  };

  // 配置项定义
  configSchema?: JSONSchema;  // 配置项的 JSON Schema
}
```

### 4.2 加载流程

```
┌────────────────────────────────────────────────────────────────────┐
│                      Component Loading Flow                        │
└────────────────────────────────────────────────────────────────────┘

1. Load Manifest
   └── Fetch manifest.json from remote URL
       ├── Validate schema
       ├── Check compatibility
       └── Parse capabilities

2. Check Permissions
   └── Verify component is allowed
       ├── Check origin whitelist
       ├── Validate permissions
       └── User confirmation (if needed)

3. Load Resources
   └── Fetch and prepare resources
       ├── Download JavaScript
       ├── Download CSS
       └── Cache resources

4. Create Sandbox
   └── Initialize isolated environment
       ├── Create IFrame / Shadow DOM
       ├── Apply CSP headers
       └── Setup communication channel

5. Mount Component
   └── Load and initialize component
       ├── Inject scripts
       ├── Inject styles
       ├── Send init message
       └── Wait for ready

6. Component Ready
   └── Component is ready to use
       └── Emit 'ready' event
```

### 4.3 沙箱隔离方案

#### 已选择：Shadow DOM 隔离方案

本项目采用 **Shadow DOM** 作为组件沙箱隔离方案。

**选择理由：**
- 更好的集成体验：组件在主页面中渲染，无 iframe 的边界感
- 更流畅的交互：无需处理 iframe 跨窗口通信的复杂性
- 样式隔离：Shadow DOM 提供天然的样式隔离

**方案实现：**

```typescript
class ShadowDOMContainer {
  private hostElement: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private rootElement: HTMLElement | null = null;

  /**
   * 创建 Shadow DOM 容器
   */
  async create(
    manifest: ComponentManifest,
    manifestUrl: string,
    loader: ComponentLoader
  ): Promise<{ hostElement: HTMLElement; mountElement: HTMLElement }> {
    // 创建 host 元素
    this.hostElement = document.createElement('div');
    this.hostElement.className = `workbench-component-${manifest.name}`;
    this.hostElement.style.width = '100%';
    this.hostElement.style.height = '100%';
    this.hostElement.style.overflow = 'auto';

    // 创建 Shadow Root（使用 open 模式便于调试）
    this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });

    // 创建组件挂载的根元素
    this.rootElement = document.createElement('div');
    this.rootElement.id = 'workbench-root';
    this.shadowRoot.appendChild(this.rootElement);

    // 注入样式（获取内容后使用 style 标签，避免 link 标签兼容性问题）
    if (manifest.styles && Array.isArray(manifest.styles)) {
      for (const styleUrl of manifest.styles) {
        await this.injectStyle(styleUrl, manifestUrl, loader);
      }
    }

    return {
      hostElement: this.hostElement,
      mountElement: this.rootElement
    };
  }

  /**
   * 注入样式
   * 获取 CSS 内容后使用 style 标签注入，避免 Shadow DOM 中 link 标签的兼容性问题
   */
  private async injectStyle(
    styleUrl: string,
    manifestUrl: string,
    loader: ComponentLoader
  ): Promise<void> {
    // 获取 CSS 内容
    const cssContent = await loader.loadResourceContent(manifestUrl, styleUrl);

    // 创建 style 标签
    const styleElement = document.createElement('style');
    styleElement.textContent = cssContent;

    // 插入到 rootElement 之前
    this.shadowRoot!.insertBefore(styleElement, this.rootElement);
  }

  /**
   * 执行脚本
   * 使用动态 import 加载 ES6 模块
   */
  async executeScript(scriptContent: string, scriptUrl: string): Promise<any> {
    // 创建 blob URL 来加载模块
    const blob = new Blob([scriptContent], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    // 使用动态 import 加载模块
    const module = await import(blobUrl);
    const ComponentClass = module.default || module;

    // 清理 blob URL
    URL.revokeObjectURL(blobUrl);

    return ComponentClass;
  }
}
```

**安全说明：**

| 隔离类型 | Shadow DOM | 说明 |
|---------|-----------|------|
| 样式隔离 | ✅ 完全隔离 | 组件样式不影响宿主，宿主样式不影响组件 |
| 脚本隔离 | ❌ 无隔离 | 组件代码在主线程执行，需信任组件来源 |
| DOM 隔离 | ✅ 完全隔离 | 组件 DOM 无法访问宿主 DOM（除 host 元素） |

**安全考虑：**
- 组件需来源可信（通过 `allowedOrigins` 白名单控制）
- 建议使用 CSP 限制组件可以加载的资源
- 组件代码可以访问全局 `window` 对象，需要开发者遵循安全编码规范

---

#### 方案对比：IFrame 隔离（备选）

如果需要更强的脚本隔离，可以考虑使用 IFrame 方案：

```typescript
class IFrameSandbox {
  private iframe: HTMLIFrameElement;

  async createSandbox(manifest: ComponentManifest): Promise<void> {
    this.iframe = document.createElement('iframe');

    // 应用安全限制
    this.iframe.sandbox = [
      'allow-scripts',
      'allow-forms',
      'allow-popups',
      'allow-same-origin'  // 仅当需要时
    ].join(' ');

    // 设置 CSP
    const csp = manifest.security?.csp || this.defaultCSP;
    this.iframe.srcdoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Security-Policy" content="${csp}">
      </head>
      <body>
        <div id="root"></div>
      </body>
      </html>
    `;

    // 建立通信（需要使用 postMessage）
    this.setupCommunication();
  }
}
```

**IFrame 方案优缺点：**
- ✅ 完整的脚本隔离
- ✅ 可以使用更严格的安全策略
- ❌ iframe 边界明显，集成体验较差
- ❌ 需要处理跨窗口通信（postMessage）

### 4.4 资源缓存策略

```typescript
interface ComponentCache {
  // 缓存条目
  get(key: string): CacheEntry | undefined;
  set(key: string, entry: CacheEntry): void;
  invalidate(key: string): void;

  // 预加载
  preload(manifest: ComponentManifest): Promise<void>;
}

interface CacheEntry {
  manifest: ComponentManifest;
  resources: Map<string, Blob>;  // URL -> Content
  timestamp: number;
  version: string;
  etag?: string;
}
```

---

## 5. 组件标准接口规范

### 5.1 组件生命周期

```typescript
interface ComponentLifecycle {
  // 初始化阶段
  onInit?(context: InitContext): Promise<void> | void;

  // 挂载阶段
  onMount?(): Promise<void> | void;

  // 参数更新
  onUpdate?(params: Record<string, unknown>): Promise<void> | void;

  // 可见性变化
  onVisibilityChange?(visible: boolean): void;

  // 尺寸变化
  onResize?(size: { width: number; height: number }): void;

  // 销毁阶段
  onDestroy?(): Promise<void> | void;
}

interface InitContext {
  // Host 提供的 API
  host: HostAPI;

  // 初始参数
  params: Record<string, unknown>;

  // 会话上下文
  session: SessionContext;

  // 组件配置
  config: ComponentConfig;
}
```

### 5.2 组件必须实现的 API

```typescript
interface WorkbenchComponent {
  // 组件标识
  readonly id: string;
  readonly version: string;

  // 生命周期方法
  init(context: InitContext): Promise<void>;
  mount(element: HTMLElement): Promise<void>;
  unmount(): Promise<void>;

  // 消息处理
  handleMessage(message: WorkbenchMessage): Promise<WorkbenchMessage | void>;

  // 健康检查
  healthCheck(): Promise<boolean>;
}
```

### 5.3 组件开发模板

```typescript
// 组件入口文件必须导出一个默认对象
export default {
  // 组件元信息
  id: 'com.example.my-component',
  version: '1.0.0',

  // 初始化
  async init(context) {
    this.host = context.host;
    this.params = context.params;
    this.container = context.container;
  },

  // 挂载
  async mount(element) {
    this.root = element;
    this.render();
  },

  // 卸载
  async unmount() {
    this.cleanup();
  },

  // 消息处理
  async handleMessage(message) {
    switch (message.type) {
      case 'component:update':
        await this.handleUpdate(message.payload);
        break;
      // ...
    }
  },

  // 内部方法
  render() {
    // 渲染逻辑
  },

  async handleUpdate(params) {
    // 更新逻辑
  }
} satisfies WorkbenchComponent;
```

---

## 6. 安全性设计

### 6.1 安全威胁模型

| 威胁 | 防护措施 | Shadow DOM 方案 |
|------|----------|----------------|
| XSS 攻击 | CSP、输入验证、输出转义 | ✅ 组件内不影响宿主 |
| CSRF 攻击 | Token 验证、SameSite Cookie | ✅ 依赖宿主应用防护 |
| 数据泄露 | 沙箱隔离、权限控制 | ⚠️ 组件代码可访问 window |
| 样式冲突 | 样式隔离 | ✅ Shadow DOM 完全隔离 |
| 恶意组件 | 来源白名单、权限审批 | ⚠️ 需信任组件来源 |

**注意：** Shadow DOM 方案只提供样式隔离，**不提供脚本隔离**。组件代码在主线程中执行，可以访问全局 `window` 对象。因此：

1. 只加载可信来源的组件（通过 `allowedOrigins` 白名单）
2. 组件需经过安全审查
3. 建议使用 CSP 限制组件资源加载

### 6.2 权限系统

```typescript
interface Permission {
  name: string;
  description: string;
  dangerous: boolean;        // 是否需要用户确认
}

interface PermissionRequest {
  permissions: Permission[];
  component: string;
  requestId: string;
}

// 预定义权限
enum StandardPermissions {
  // 消息操作
  READ_MESSAGES = 'read:messages',
  SEND_MESSAGES = 'send:messages',
  MODIFY_INPUT = 'modify:input',

  // 会话操作
  READ_SESSIONS = 'read:sessions',
  SWITCH_SESSIONS = 'switch:sessions',
  CREATE_SESSIONS = 'create:sessions',

  // UI 操作
  RESIZE_CONTAINER = 'resize:container',
  SHOW_NOTIFICATIONS = 'show:notifications',

  // 网络操作
  NETWORK_REQUEST = 'network:request',
  READ_CLIPBOARD = 'read:clipboard',
  WRITE_CLIPBOARD = 'write:clipboard'
}
```

### 6.3 内容安全策略

**注意：** 在 Shadow DOM 方案中，CSP 主要用于限制组件可以加载的资源（图片、字体、网络请求等），而不能隔离脚本执行。

```typescript
const defaultCSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",  // 组件脚本已在主线程执行
  "style-src 'self' 'unsafe-inline'",   // 样式已通过 style 标签注入
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.example.com",  // 限制组件网络请求
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');
```

**CSP 在 Shadow DOM 方案中的作用：**
- 限制组件可以发起的网络请求
- 限制组件可以加载的图片、字体等资源
- 防止组件动态创建 iframe 或 object 标签

### 6.4 来源验证

```typescript
interface OriginPolicy {
  // 允许的来源列表
  allowedOrigins: string[];

  // 是否允许子域名
  allowSubdomains: boolean;

  // 验证函数
  validate(origin: string): boolean;
}

// 验证逻辑
function validateOrigin(origin: string, policy: OriginPolicy): boolean {
  const url = new URL(origin);

  for (const allowed of policy.allowedOrigins) {
    if (allowed === '*') return true;

    const allowedUrl = new URL(allowed);

    // 精确匹配
    if (allowedUrl.origin === url.origin) return true;

    // 子域名匹配
    if (policy.allowSubdomains &&
        url.hostname.endsWith(`.${allowedUrl.hostname}`)) {
      return true;
    }
  }

  return false;
}
```

---

## 7. 扩展性设计

### 7.1 插件系统

允许通过插件扩展工作台能力：

```typescript
interface WorkbenchPlugin {
  name: string;
  version: string;

  // 生命周期
  install(workbench: WorkbenchAPI): void;
  uninstall(): void;

  // 扩展点
  extendComponentLoader?(loader: ComponentLoader): void;
  extendMessageRouter?(router: MessageRouter): void;
  extendSecurityPolicy?(policy: SecurityPolicy): void;
}
```

### 7.2 中间件系统

允许在消息处理链中插入中间件：

```typescript
interface MessageMiddleware {
  name: string;
  priority: number;

  process(
    message: WorkbenchMessage,
    next: () => Promise<WorkbenchMessage>
  ): Promise<WorkbenchMessage>;
}

// 示例：日志中间件
const loggingMiddleware: MessageMiddleware = {
  name: 'logger',
  priority: 100,

  async process(message, next) {
    console.log('[Message]', message.type, message.payload);
    const result = await next();
    console.log('[Response]', result);
    return result;
  }
};
```

### 7.3 事件系统

```typescript
interface EventBus {
  // 订阅事件
  on(event: string, handler: Function): () => void;

  // 一次性订阅
  once(event: string, handler: Function): () => void;

  // 发布事件
  emit(event: string, data?: unknown): void;

  // 取消订阅
  off(event: string, handler?: Function): void;
}

// 预定义事件
enum WorkbenchEvents {
  // 组件事件
  COMPONENT_LOADED = 'component:loaded',
  COMPONENT_READY = 'component:ready',
  COMPONENT_ERROR = 'component:error',
  COMPONENT_UNLOADED = 'component:unloaded',

  // 容器事件
  CONTAINER_RESIZED = 'container:resized',
  CONTAINER_FOCUSED = 'container:focused',

  // 会话事件
  SESSION_CHANGED = 'session:changed',
  SESSION_CREATED = 'session:created',

  // 消息事件
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_SENT = 'message:sent'
}
```

---

## 8. 类型定义汇总

### 8.1 核心类型

```typescript
// ============ 基础类型 ============

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages?: Message[];
}

interface ChatContext {
  sessionId: string;
  userId?: string;
  currentAgent?: string;
  metadata: Record<string, unknown>;
}

// ============ 组件类型 ============

interface ComponentConfig {
  [key: string]: unknown;
}

interface ComponentState {
  status: 'loading' | 'ready' | 'error' | 'unmounted';
  error?: Error;
  metadata?: Record<string, unknown>;
}

// ============ Host API 类型 ============

interface HostAPI {
  // 消息操作
  readonly messages: {
    getAll: () => Message[];                                    // 获取所有消息
    getById: (id: string) => Message | undefined;               // 根据 ID 获取消息
    send: (content: string, agentId?: string) => Promise<void>; // 发送消息
    // 订阅新消息（支持流式）
    subscribe: (
      callback: (event: MessageStreamEvent) => void,
      options?: SubscriptionOptions
    ) => UnsubscribeFunction;
  };

  // 会话操作
  readonly sessions: {
    getCurrent: () => Session | null;
    switch: (sessionId: string) => Promise<void>;
    create: () => Promise<Session>;
    list: () => Session[];
    // 订阅会话变化
    subscribe: (callback: (session: Session) => void) => UnsubscribeFunction;
  };

  // 输入操作
  readonly input: {
    append: (text: string) => void;
    replace: (text: string) => void;
    insert: (text: string, position: number) => void;
    clear: () => void;
    getValue: () => string;
    // 订阅输入框变化
    subscribe: (callback: (value: string) => void) => UnsubscribeFunction;
  };

  // UI 操作
  readonly ui: {
    resize: (width: number, height?: number) => void;
    close: () => void;
    focus: () => void;
    notify: (options: NotificationOptions) => void;
  };

  // 事件总线（订阅所有事件）
  readonly events: {
    on: (event: string, handler: Function) => UnsubscribeFunction;
    once: (event: string, handler: Function) => UnsubscribeFunction;
    off: (event: string, handler?: Function): void;
    emit: (event: string, data?: unknown): void;
  };

  // 上下文
  readonly context: ChatContext;
}

// 订阅选项
interface SubscriptionOptions {
  // 是否包含历史消息
  includeHistory?: boolean;
  // 是否只接收流式消息
  streamingOnly?: boolean;
  // 过滤条件
  filter?: (message: Message) => boolean;
  // 限制数量
  limit?: number;
}

// 取消订阅函数
type UnsubscribeFunction = () => void;

// 流式消息事件
interface MessageStreamEvent {
  message: Message;
  isStreaming: boolean;        // 是否为流式消息
  delta?: string;              // 流式增量内容
  isComplete: boolean;         // 是否完成
  timestamp: number;
}

interface NotificationOptions {
  level: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}
```

---

## 9. Tab 管理系统

### 9.1 概述

Workbench 2.0 引入了完整的 Tab 管理系统，支持多组件并发运行和灵活的视图切换。

### 9.2 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Workbench App                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐         ┌──────────────┐             │
│  │   TabBar     │         │  TabContent  │             │
│  │              │         │              │             │
│  │ - Tab List   │         │ - Active Tab │             │
│  │ - Add Button │         │ - Inactive   │             │
│  └──────────────┘         │   (hidden)   │             │
│         ▲                └──────────────┘             │
│         │                        ▲                     │
│         │                        │                     │
│  ┌──────┴────────────────────────┴──────┐            │
│  │         TabContext (State)            │            │
│  │                                       │            │
│  │ - tabs: Tab[]                         │            │
│  │ - activeTabId: string                 │            │
│  │ - mode: 'list' | 'component'          │            │
│  └───────────────────────────────────────┘            │
│         ▲                                             │
│         │                                             │
│  ┌──────┴──────────────────────────────────────┐     │
│  │         TabManager (Logic)                  │     │
│  │                                             │     │
│  │ - openTab(componentName, params)           │     │
│  │ - closeTab(tabId)                          │     │
│  │ - switchTab(tabId)                         │     │
│  │ - getTab(tabId)                            │     │
│  └─────────────────────────────────────────────┘     │
│                                                         │
│  ┌──────────────────────────────────────────────┐   │
│  │    ComponentListView (when mode='list')     │   │
│  │                                              │   │
│  │  - Search Bar                                │   │
│  │  - Category Filter                           │   │
│  │  - Component Cards                           │   │
│  │  - Recent & Favorites                        │   │
│  └──────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 9.3 核心 API

#### 9.3.1 Tab 数据模型

```typescript
interface Tab {
  // 基本信息id: string;              // 唯一标识
  componentName: string;    // 组件名称
  instanceId: string;       // 实例 ID（用于多实例）

  // 显示信息
  title: string;            // 标签标题
  icon?: string;            // 标签图标

  // 状态
  status: 'loading' | 'ready' | 'error';
  error?: Error;

  // 配置
  closable: boolean;        // 是否可关闭
  pinned: boolean;          // 是否固定

  // 组件参数
  params: Record<string, unknown>;

  // 时间戳
  createdAt: number;
  lastActivatedAt: number;
}
```

#### 9.3.2 Tab 策略

```typescript
interface TabStrategy {
  mode: 'singleton' | 'multiple';  // 单例或多例模式
  maxInstances?: number;           // 最大实例数（多例模式）
  defaultTitle?: string;           // 默认标题模板
  allowClose?: boolean;            // 是否允许关闭
}
```

#### 9.3.3 使用示例

```typescript
import { useWorkbench } from '@/workbench';

function MyComponent() {
  const { openTab, closeTab, switchTab, state } = useWorkbench();

  // 打开新标签页
  const handleOpenComponent = (componentName: string) => {
    openTab(componentName, { /* params */ });
  };

  // 关闭标签页
  const handleCloseTab = (tabId: string) => {
    closeTab(tabId);
  };

  // 切换标签页
  const handleSwitchTab = (tabId: string) => {
    switchTab(tabId);
  };

  // 获取当前标签页
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);

  return (
    <div>
      <button onClick={() => handleOpenComponent('todolist')}>
        打开待办事项
      </button>
    </div>
  );
}
```

### 9.4 组件列表视图

#### 9.4.1 功能特性

- 搜索和筛选组件
- 分类浏览
- 最近使用和收藏组件
- 网格和列表视图切换

#### 9.4.2 组件信息模型

```typescript
interface ComponentInfo {
  // 基本信息
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;

  // 分类和标签
  category?: ComponentCategory;
  tags?: string[];

  // Tab 策略
  tabStrategy: TabStrategy;

  // 统计信息
  stats?: {
    usageCount: number;
    lastUsedAt: number;
  };

  // 资源 URL
  manifestUrl: string;
  entryUrl: string;
}
```

### 9.5 持久化存储

```typescript
interface WorkbenchStorage {
  // 组件列表
  componentList: {
    recentComponents: string[];      // 最近使用的组件（最多 10 个）
    favoriteComponents: string[];   // 收藏的组件
    displayOptions?: {
      filters: {
        searchQuery?: string;
        category?: ComponentCategory | 'all';
      };
    };
  };

  // 用户偏好
  preferences: {
    theme?: 'light' | 'dark' | 'system';
    maxTabs?: number;
    saveTabsOnClose?: boolean;
    restoreTabsOnLoad?: boolean;
  };

  // 保存的标签页（用于恢复工作区）
  savedTabs?: Tab[];

  // 版本信息
  version: number;
  lastUpdated: number;
}
```

### 9.6 事件系统

```typescript
enum TabEventType {
  OPENED = 'tab:opened',           // 标签页打开
  CLOSED = 'tab:closed',           // 标签页关闭
  SWITCHED = 'tab:switched',       // 标签页切换
  UPDATED = 'tab:updated',         // 标签页更新
  STATUS_CHANGED = 'tab:status_changed',  // 状态变化
}

interface TabEvent {
  type: TabEventType;
  tabId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}
```

### 9.7 完整示例

```typescript
import { WorkbenchAppWrapper } from '@/workbench';

function App() {
  return (
    <WorkbenchAppWrapper
      loadFromStorage={true}
      hostConfig={{
        // 配置 Host 能力
      }}
    />
  );
}

// 或者自定义使用
import { WorkbenchProvider, WorkbenchApp } from '@/workbench';

function CustomApp() {
  return (
    <WorkbenchProvider loadFromStorage={true}>
      <WorkbenchApp
        autoLoadComponents={true}
        hostConfig={{}}
      />
    </WorkbenchProvider>
  );
}
```

---

## 10. 实现路线图

### Phase 1: 基础架构（Week 1-2）
- [x] 创建 WorkbenchContainer 组件
- [x] 实现 ComponentLoader
- [x] 建立基础消息通信机制
- [x] 定义 TypeScript 类型系统

### Phase 2: 核心功能（Week 3-4）
- [x] 实现 Shadow DOM 沙箱
- [ ] 实现消息路由器
- [x] 实现权限系统
- [x] 实现组件生命周期管理

### Phase 3: 高级特性（Week 5-6）
- [ ] 实现请求-响应模式
- [x] 实现事件订阅系统
- [x] 实现资源缓存
- [ ] 实现错误恢复机制

### Phase 4: Tab 管理系统（Week 7）
- [x] 实现 TabManager
- [x] 实现 TabContext 和状态管理
- [x] 实现 TabBar 和 TabContent 组件
- [x] 实现组件列表视图
- [x] 实现持久化存储

### Phase 5: 开发者体验（Week 8）
- [ ] 创建组件开发脚手架
- [x] 编写组件开发文档
- [ ] 提供示例组件
- [ ] 建立组件市场规范

---

## 10. 参考实现

### 10.1 简单组件示例

```typescript
// manifest.json
{
  "name": "hello-world",
  "version": "1.0.0",
  "description": "A simple hello world component",
  "entry": "https://cdn.example.com/hello-world/index.js",
  "styles": [
    "https://cdn.example.com/hello-world/style.css"
  ],
  "capabilities": {
    "required": [],
    "optional": ["host:notify"]
  }
}

// index.js
export default {
  id: 'hello-world',
  version: '1.0.0',

  async init(context) {
    this.host = context.host;
  },

  async mount(element) {
    element.innerHTML = `
      <div class="hello-world">
        <h1>Hello, World!</h1>
        <button id="notify">Notify</button>
      </div>
    `;

    element.querySelector('#notify').addEventListener('click', () => {
      this.host.ui.notify({
        level: 'info',
        title: 'Hello',
        message: 'This is from the component!'
      });
    });
  },

  async unmount() {
    // Cleanup
  },

  async handleMessage(message) {
    // Handle incoming messages
  }
};
```

### 10.2 ChatBox 集成示例

```typescript
// ChatBoxPage.tsx
import { WorkbenchContainer } from '@/components/workbench/WorkbenchContainer';

function ChatBoxPage() {
  const [workbenchComponent, setWorkbenchComponent] = useState<{
    url: string;
    manifest: string;
  } | null>(null);

  const loadComponent = useCallback((componentUrl: string) => {
    setWorkbenchComponent({
      url: componentUrl,
      manifest: `${componentUrl}/manifest.json`
    });
  }, []);

  const hostCapabilities = useMemo(() => ({
    messages: {
      append: (text: string) => {
        setInputValue(prev => prev + text);
      },
      send: async (content: string) => {
        await sendMessage(content);
      },
      getAll: () => messages,
      getCurrent: () => messages[messages.length - 1] || null
    },
    sessions: {
      getCurrent: () => currentSession,
      switch: switchSession,
      create: createSession,
      list: sessions
    },
    input: {
      append: (text: string) => setInputValue(prev => prev + text),
      replace: (text: string) => setInputValue(text),
      insert: (text: string, pos: number) => {
        setInputValue(prev => prev.slice(0, pos) + text + prev.slice(pos));
      },
      clear: () => setInputValue(''),
      getValue: () => inputValue
    },
    ui: {
      resize: (width: number) => setWorkbenchWidth(width),
      close: () => setWorkbenchComponent(null),
      focus: () => {/* TODO */},
      notify: (options: NotificationOptions) => {
        // Show toast notification
      }
    },
    context: {
      sessionId: currentSession?.id || '',
      metadata: {}
    }
  }), [messages, currentSession, sessions, inputValue]);

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      {/* Chat Area */}
      {/* Workbench */}
      <WorkbenchContainer
        component={workbenchComponent}
        capabilities={hostCapabilities}
        config={{
          maxWidth: 800,
          minWidth: 280,
          defaultWidth: 400,
          resizable: true
        }}
      />
    </div>
  );
}
```

---

## 11. 测试策略

### 11.1 单元测试

```typescript
describe('WorkbenchContainer', () => {
  it('should load component manifest', async () => {
    const container = new WorkbenchContainer(config);
    const manifest = await container.loadComponent('https://example.com/component');
    expect(manifest.name).toBe('test-component');
  });

  it('should route messages correctly', async () => {
    const container = new WorkbenchContainer(config);
    const response = await container.request({
      target: MessageTarget.Component,
      type: 'test',
      payload: {}
    });
    expect(response).toBeDefined();
  });
});
```

### 11.2 集成测试

```typescript
describe('Component Integration', () => {
  it('should complete full lifecycle', async () => {
    // Load -> Mount -> Communicate -> Unmount
    const container = new WorkbenchContainer(config);
    await container.loadComponent(testComponentUrl);
    await container.mount();
    await container.sendMessage({ type: 'init' });
    await container.unmount();
  });
});
```

### 11.3 安全测试

- XSS 注入测试
- CSRF 攻击测试
- 沙箱逃逸测试
- 权限绕过测试

---

## 12. 性能优化

### 12.1 懒加载

```typescript
// 按需加载组件
const loadComponent = lazy(() =>
  import('https://cdn.example.com/component').then(m => m.default)
);
```

### 12.2 预加载

```typescript
// 预加载常用组件
const prefetchComponent = (url: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
};
```

### 12.3 代码分割

```typescript
// 组件代码分割
const componentChunks = {
  core: () => import('./core'),
  ui: () => import('./ui'),
  utils: () => import('./utils')
};
```

---

## 13. 监控与调试

### 13.1 开发者工具

```typescript
// 浏览器扩展 API
(window.__WORKBENCH_DEVTOOLS__ = {
  inspectComponent: () => {},
  getMessageLog: () => [],
  getComponentState: () => {},
  replayMessages: () => {}
});
```

### 13.2 错误追踪

```typescript
interface ErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
  reportError(error: Error, context: string): void;
}
```

### 13.3 性能指标

```typescript
interface PerformanceMetrics {
  loadTime: number;
  mountTime: number;
  messageLatency: number;
  memoryUsage: number;
}
```

---

## 14. 附录

### 14.1 术语表

| 术语 | 定义 |
|------|------|
| Host | 宿主环境，即 ChatBox 主应用 |
| Container | 工作台容器 |
| Component | 动态加载的组件 |
| Sandbox | 沙箱隔离环境 |
| Manifest | 组件清单文件 |
| Capability | 组件能力声明 |
| Permission | 权限 |

### 14.2 参考资料

- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [IFrame Sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
- [Custom Elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements)

---

**文档版本**: 1.2.0
**最后更新**: 2026-02-08
**作者**: ZC & Claude
**变更记录**:
- v1.2.0 (2026-02-08): 添加 Tab 管理系统和组件列表视图
- v1.1.0 (2026-02-07): 更新为 Shadow DOM 方案，添加安全说明
- v1.0.0 (2026-02-05): 初始版本
