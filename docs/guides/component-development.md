# Workbench 组件开发指南

## 目录

1. [快速开始](#快速开始)
2. [开发环境配置](#开发环境配置)
3. [组件结构](#组件结构)
4. [API 参考](#api-参考)
5. [最佳实践](#最佳实践)
6. [示例组件](#示例组件)
7. [调试技巧](#调试技巧)
8. [发布流程](#发布流程)

---

## 快速开始

### 创建一个最小组件

```bash
# 创建组件目录
mkdir my-workbench-component
cd my-workbench-component

# 初始化项目
npm init -y

# 安装 SDK（从独立包）
npm install @workbench/sdk
```

### 基本文件结构

```
my-workbench-component/
├── manifest.json          # 组件清单（必须）
├── src/
│   ├── index.ts          # 组件入口（必须）
│   ├── component.ts      # 组件逻辑
│   └── styles.css       # 样式文件
├── dist/                 # 编译输出
│   ├── index.js
│   └── styles.css
└── package.json
```

### manifest.json 示例

```json
{
  "name": "my-component",
  "version": "1.0.0",
  "description": "我的第一个工作台组件",
  "author": "Your Name",
  "entry": "https://cdn.example.com/my-component/dist/index.js",
  "styles": [
    "https://cdn.example.com/my-component/dist/styles.css"
  ],
  "capabilities": {
    "required": [],
    "optional": [
      "host:notify",
      "host:messages:subscribe"
    ],
    "provided": [
      "my-component:analyze"
    ]
  },
  "permissions": [
    "read:messages"
  ],
  "tabStrategy": {
    "mode": "singleton",
    "allowClose": true
  },
  "configSchema": {
    "type": "object",
    "properties": {
      "theme": {
        "type": "string",
        "enum": ["light", "dark"],
        "default": "light"
      }
    }
  }
}
```

**Tab 策略说明：**

在 Workbench 2.0 中，组件可以通过 `tabStrategy` 字段声明其在多标签页环境中的行为：

```typescript
interface TabStrategy {
  mode: 'singleton' | 'multiple';  // 单例或多例模式
  maxInstances?: number;           // 最大实例数（仅多例模式）
  defaultTitle?: string;           // 默认标题模板，支持 {{name}} 和 {{version}}
  allowClose?: boolean;            // 是否允许用户关闭标签页
}
```

**Tab 策略示例：**

```json
// 单例模式（默认）
"tabStrategy": {
  "mode": "singleton",
  "allowClose": true
}

// 多例模式（限制 3 个实例）
"tabStrategy": {
  "mode": "multiple",
  "maxInstances": 3,
  "defaultTitle": "{{name}} ({{version}})",
  "allowClose": true
}

// 固定标签页（不可关闭）
"tabStrategy": {
  "mode": "singleton",
  "allowClose": false
}
```

---

## 开发环境配置

### 1. 使用 TypeScript 开发

```bash
# 安装 TypeScript
npm install -D typescript

# 创建 tsconfig.json
npx tsc --init
```

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["@workbench/sdk"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2. 本地开发服务器

为了方便本地调试，SDK 提供了一个开发服务器：

```typescript
// dev.ts
import { createDevServer } from '@workbench/sdk/dev';
import myComponent from './src/component';

createDevServer({
  component: myComponent,
  port: 3001,
  // 模拟 Host 环境
  mockHost: {
    messages: {
      getAll: () => mockMessages,
      subscribe: (callback) => { /* ... */ }
    },
    // ... 其他 API
  }
});
```

运行：

```bash
npx ts-node dev.ts
```

访问 `http://localhost:3001` 即可看到组件在模拟环境中运行。

### 3. 热重载

```typescript
import { createDevServer } from '@workbench/sdk/dev';
import myComponent from './src/component';

const server = createDevServer({
  component: myComponent,
  port: 3001,
  hotReload: true,  // 启用热重载
  watch: ['./src']  // 监听目录
});
```

---

## 组件结构

### 组件生命周期

```
                    ┌─────────────────────────────────────┐
                    │         Component Lifecycle         │
                    └─────────────────────────────────────┘

   Load Manifest          Load Resources           Create Sandbox
   ──────────────         ────────────────         ───────────────
          │                       │                        │
          ▼                       ▼                        ▼
   [ComponentLoader]    ───────────────►         [IFrame/ShadowDOM]
          │                       │                        │
          │                       │                        ▼
          │                       │                   ┌─────────┐
          │                       │                   │  init() │
          │                       │                   └─────────┘
          │                       │                        │
          │                       │                        ▼
          │                       │                   ┌─────────┐
          │                       │                   │ mount() │
          │                       │                   └─────────┘
          │                       │                        │
          │                       │                   ┌────▼────┐
          │                       │                   │  Ready  │
          │                       │                   └────┬────┘
          │                       │                        │
          │                       │              ┌──────────┼──────────┐
          │                       │              │          │          │
          │                       │              ▼          ▼          ▼
          │                       │        onUpdate()  onResize()  handleMessage()
          │                       │              │          │          │
          │                       │              └──────────┼──────────┘
          │                       │                         │
          │                       │                         ▼
          │                       │                   ┌─────────┐
          │                       │                   │unmount()│
          │                       │                   └─────────┘
          │                       │                         │
          ▼                       ▼                         ▼
     [Unloaded]            [Resources Freed]           [Destroyed]
```

### 实现生命周期方法

```typescript
import { WorkbenchComponent, InitContext, WorkbenchMessage } from '@workbench/sdk';

class MyComponent implements WorkbenchComponent {
  readonly id = 'com.example.my-component';
  readonly version = '1.0.0';

  private host: InitContext['host'];
  private root: HTMLElement | null = null;
  private unsubscribeFunctions: (() => void)[] = [];

  // ========== 初始化阶段 ==========
  async init(context: InitContext): Promise<void> {
    this.host = context.host;

    // 检查所需能力是否可用
    this.checkCapabilities(context);

    // 应用配置
    this.applyConfig(context.config);

    // 订阅事件
    this.setupSubscriptions();
  }

  // ========== 挂载阶段 ==========
  async mount(element: HTMLElement): Promise<void> {
    this.root = element;
    this.render();
  }

  // ========== 尺寸变化响应（可选）==========
  onResize(size: { width: number; height: number }): void {
    // 当容器尺寸变化时被调用
    // 可以根据新尺寸调整布局、字体大小等
    console.log('[MyComponent] Resized to:', size);

    // 示例：窄屏时切换到单列布局
    if (size.width < 400) {
      this.root?.classList.add('compact-layout');
    } else {
      this.root?.classList.remove('compact-layout');
    }
  }

  // ========== 消息处理 ==========
  async handleMessage(message: WorkbenchMessage): Promise<void> {
    switch (message.type) {
      case 'component:update':
        await this.handleUpdate(message.payload);
        break;
      case 'component:visibility':
        this.handleVisibilityChange(message.payload.visible);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  // ========== 卸载阶段 ==========
  async unmount(): Promise<void> {
    // 清理所有订阅
    this.unsubscribeFunctions.forEach(fn => fn());
    this.unsubscribeFunctions = [];

    // 清理 DOM
    if (this.root) {
      this.root.innerHTML = '';
      this.root = null;
    }
  }

  // ========== 健康检查 ==========
  async healthCheck(): Promise<boolean> {
    return this.root !== null;
  }

  // ========== 私有方法 ==========

  private checkCapabilities(context: InitContext): void {
    const required = context.manifest.capabilities.required;
    for (const cap of required) {
      if (!this.host.hasCapability(cap)) {
        throw new Error(`Required capability not available: ${cap}`);
      }
    }
  }

  private applyConfig(config: Record<string, unknown>): void {
    // 应用用户配置
  }

  private setupSubscriptions(): void {
    // 订阅新消息
    const unsubscribe = this.host.messages.subscribe(
      (event) => this.handleNewMessage(event),
      {
        includeHistory: false,  // 只接收新消息
        streamingOnly: false
      }
    );
    this.unsubscribeFunctions.push(unsubscribe);

    // 订阅会话变化
    const unsubSession = this.host.sessions.subscribe(
      (session) => this.handleSessionChange(session)
    );
    this.unsubscribeFunctions.push(unsubSession);
  }

  private handleNewMessage(event: MessageStreamEvent): void {
    console.log('New message:', event.message);

    if (event.isStreaming) {
      // 处理流式消息
      this.handleStreamingMessage(event);
    } else {
      // 处理完整消息
      this.handleCompleteMessage(event.message);
    }
  }

  private handleStreamingMessage(event: MessageStreamEvent): void {
    // 更新 UI 显示流式内容
    if (this.root) {
      const streamingElement = this.root.querySelector('.streaming-content');
      if (streamingElement) {
        const currentContent = streamingElement.textContent || '';
        streamingElement.textContent = currentContent + (event.delta || '');
      }
    }

    if (event.isComplete) {
      // 流式消息完成
      console.log('Streaming complete:', event.message);
    }
  }

  private handleCompleteMessage(message: Message): void {
    // 处理完整消息
    this.renderMessage(message);
  }

  private handleSessionChange(session: Session): void {
    console.log('Session changed:', session.id);
    this.render();
  }

  private handleUpdate(params: Record<string, unknown>): void {
    // 处理参数更新
    console.log('Update with params:', params);
    this.render();
  }

  private handleVisibilityChange(visible: boolean): void {
    console.log('Visibility changed:', visible);
  }

  private render(): void {
    if (!this.root) return;

    this.root.innerHTML = `
      <div class="my-component">
        <h2>My Component</h2>
        <div class="content"></div>
        <div class="streaming-content"></div>
      </div>
    `;

    // 渲染已有消息
    const messages = this.host.messages.getAll();
    messages.forEach(msg => this.renderMessage(msg));
  }

  private renderMessage(message: Message): void {
    const content = this.root?.querySelector('.content');
    if (content) {
      const msgElement = document.createElement('div');
      msgElement.className = `message message-${message.role}`;
      msgElement.textContent = message.content;
      content.appendChild(msgElement);
    }
  }
}

// 导出组件实例
export default new MyComponent();
```

---

## API 参考

### Host API

#### messages

获取和操作消息。

```typescript
// 获取所有消息
const allMessages: Message[] = host.messages.getAll();

// 根据 ID 获取消息
const message = host.messages.getById('msg-123');

// 发送消息
await host.messages.send('Hello, AI!', 'agent-001');

// 订阅新消息（支持流式）
const unsubscribe = host.messages.subscribe(
  (event: MessageStreamEvent) => {
    console.log('New message:', event.message);
    if (event.isStreaming) {
      console.log('Delta:', event.delta);
      console.log('Complete:', event.isComplete);
    }
  },
  {
    includeHistory: false,    // 不包含历史消息
    streamingOnly: false,     // 接收所有消息
    filter: (msg) => msg.role === 'assistant',  // 只接收助手消息
    limit: 10                 // 最多接收 10 条
  }
);

// 取消订阅
unsubscribe();
```

#### sessions

会话管理。

```typescript
// 获取当前会话
const currentSession = host.sessions.getCurrent();

// 切换会话
await host.sessions.switch('session-456');

// 创建新会话
const newSession = await host.sessions.create();

// 列出所有会话
const allSessions = host.sessions.list();

// 订阅会话变化
const unsub = host.sessions.subscribe((session) => {
  console.log('Session changed:', session);
});
```

#### input

输入框操作。

```typescript
// 追加文本
host.input.append(' world');  // "hello world"

// 替换文本
host.input.replace('new text');

// 在指定位置插入
host.input.insert('inserted', 5);  // "hello inserted world"

// 清空
host.input.clear();

// 获取当前值
const value = host.input.getValue();

// 订阅输入变化
const unsub = host.input.subscribe((value) => {
  console.log('Input changed:', value);
});
```

#### ui

UI 操作。

```typescript
// 调整容器大小
host.ui.resize(600);          // 宽度 600px
host.ui.resize(600, 800);     // 宽度 600px, 高度 800px

// 关闭组件
host.ui.close();

// 请求焦点
host.ui.focus();

// 显示通知
host.ui.notify({
  level: 'info',
  title: '操作成功',
  message: '数据已保存',
  duration: 3000  // 3秒后自动消失
});
```

#### events

事件总线。

```typescript
// 监听事件
const unsub1 = host.events.on('custom:event', (data) => {
  console.log('Custom event:', data);
});

// 一次性监听
const unsub2 = host.events.once('init', () => {
  console.log('Initialized');
});

// 发送事件（组件可以发送自定义事件）
host.events.emit('my-component:action', { action: 'save' });

// 取消监听
unsub1();
unsub2();
```

### 上下文 Context

```typescript
interface ChatContext {
  sessionId: string;           // 当前会话 ID
  userId?: string;             // 用户 ID
  currentAgent?: string;       // 当前 Agent ID
  metadata: Record<string, unknown>;  // 其他元数据
}

// 访问上下文
const context = host.context;
console.log('Current session:', context.sessionId);
```

---

## 最佳实践

### 1. 组件设计原则

**单一职责**

每个组件应该只做一件事。如果功能复杂，考虑拆分成多个组件。

```typescript
// 好的示例：专注于消息分析
interface MessageAnalyzerComponent extends WorkbenchComponent {
  analyze(message: Message): AnalysisResult;
}

// 不好的示例：混杂了太多功能
interface DoEverythingComponent extends WorkbenchComponent {
  analyze(): void;
  renderChart(): void;
  exportData(): void;
  playMusic(): void;
}
```

**幂等性**

`mount()` 方法应该可以被多次调用而不产生副作用。

```typescript
async mount(element: HTMLElement): Promise<void> {
  // 清理之前的状态
  if (this.root) {
    this.unmount();
  }

  // 重新挂载
  this.root = element;
  this.render();
}
```

**错误边界**

始终捕获和处理异常。

```typescript
async handleMessage(message: WorkbenchMessage): Promise<void> {
  try {
    switch (message.type) {
      // ...
    }
  } catch (error) {
    console.error('Error handling message:', error);
    // 通知 Host
    this.host.ui.notify({
      level: 'error',
      title: '处理失败',
      message: error.message
    });
  }
}
```

### 2. 性能优化

**防抖和节流**

```typescript
import { debounce, throttle } from '@workbench/sdk/utils';

class MyComponent implements WorkbenchComponent {
  private debouncedSearch = debounce((query: string) => {
    this.performSearch(query);
  }, 300);

  private throttledScroll = throttle(() => {
    this.handleScroll();
  }, 100);
}
```

**虚拟滚动**

对于大量数据，使用虚拟滚动：

```typescript
import { VirtualList } from '@workbench/sdk/ui';

private renderMessages(messages: Message[]): void {
  const list = new VirtualList({
    items: messages,
    itemHeight: 80,
    renderItem: (msg) => this.renderMessageItem(msg),
    container: this.root.querySelector('.messages')
  });
}
```

**懒加载**

```typescript
private heavyLibrary: any;

async loadLibrary(): Promise<void> {
  if (!this.heavyLibrary) {
    this.heavyLibrary = await import('./heavy-library');
  }
}
```

### 3. 样式隔离

使用 CSS 前缀避免样式冲突：

```css
/* 好的做法：使用组件前缀 */
.my-component__container { }
.my-component__header { }
.my-component--disabled { }

/* 不好的做法：通用类名 */
.container { }
.header { }
```

使用 CSS-in-JS 或 Shadow DOM：

```typescript
// 使用 Shadow DOM
async mount(element: HTMLElement): Promise<void> {
  const shadow = element.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .container { /* 样式完全隔离 */ }
  `;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'container';
  shadow.appendChild(container);
}
```

### 4. 响应式设计

组件应该能够适应容器尺寸的变化。框架层会通过 `ResizeObserver` 监听容器尺寸变化，并调用组件的 `onResize` 方法。

**使用 CSS 实现自适应**

```css
/* 推荐：使用弹性布局和相对单位 */
.my-component {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.my-component.sidebar {
  width: 280px;
  flex-shrink: 0;
}

.my-component.content {
  flex: 1;
  min-width: 0; /* 重要：允许 flex 子项缩小 */
}

/* 响应式：窄屏时调整布局 */
@media (max-width: 600px) {
  .my-component {
    flex-direction: column;
  }

  .my-component.sidebar {
    width: 100%;
  }
}
```

**使用 onResize 进阶响应**

```typescript
onResize(size: { width: number; height: number }): void {
  // 根据尺寸调整 UI
  const isCompact = size.width < 500;
  const isTall = size.height > 800;

  // 应用类名
  this.root?.classList.toggle('compact', isCompact);
  this.root?.classList.toggle('tall', isTall);

  // 调整组件内部状态
  if (isCompact && this.showSidebar) {
    this.showSidebar = false;
    this.render();
  }
}
```

**响应式最佳实践**

1. **优先使用 CSS**：大多数响应式需求可以通过 CSS flex/grid 布局解决
2. **渐进增强**：基础功能不依赖 JavaScript，onResize 只用于增强体验
3. **防抖处理**：onResize 已由框架层处理，无需额外防抖
4. **测试多种尺寸**：测试从最小宽度 (280px) 到最大宽度的表现

### 5. 状态管理

对于复杂组件，考虑使用轻量级状态管理：

```typescript
import { createStore } from '@workbench/sdk/store';

class MyComponent implements WorkbenchComponent {
  private store = createStore({
    messages: [],
    filter: 'all',
    loading: false
  });

  async init(context: InitContext): Promise<void> {
    // 订阅状态变化
    this.store.subscribe((state) => {
      this.render(state);
    });
  }

  private setFilter(filter: string): void {
    this.store.setState({ filter });
  }
}
```

---

## 示例组件

### 示例 1: 消息统计组件

```typescript
// message-stats.ts
import { WorkbenchComponent, InitContext } from '@workbench/sdk';

interface MessageStats {
  userCount: number;
  assistantCount: number;
  totalWords: number;
}

class MessageStatsComponent implements WorkbenchComponent {
  readonly id = 'com.example.message-stats';
  readonly version = '1.0.0';

  private host: InitContext['host'];
  private root: HTMLElement | null = null;

  async init(context: InitContext): Promise<void> {
    this.host = context.host;

    // 订阅新消息
    this.host.messages.subscribe(() => {
      this.updateStats();
    });
  }

  async mount(element: HTMLElement): Promise<void> {
    this.root = element;
    this.render();
    this.updateStats();
  }

  async unmount(): Promise<void> {
    this.root = null;
  }

  async handleMessage(): Promise<void> {
    // 无需处理消息
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private updateStats(): void {
    const messages = this.host.messages.getAll();
    const stats: MessageStats = {
      userCount: messages.filter(m => m.role === 'user').length,
      assistantCount: messages.filter(m => m.role === 'assistant').length,
      totalWords: messages.reduce((sum, m) => sum + m.content.split(' ').length, 0)
    };

    this.renderStats(stats);
  }

  private render(): void {
    if (!this.root) return;
    this.root.innerHTML = `
      <div class="stats-container">
        <h3>消息统计</h3>
        <div class="stats-content"></div>
      </div>
    `;
  }

  private renderStats(stats: MessageStats): void {
    const content = this.root?.querySelector('.stats-content');
    if (content) {
      content.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">用户消息</span>
          <span class="stat-value">${stats.userCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">助手消息</span>
          <span class="stat-value">${stats.assistantCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总字数</span>
          <span class="stat-value">${stats.totalWords}</span>
        </div>
      `;
    }
  }
}

export default new MessageStatsComponent();
```

### 示例 2: 实时流式消息展示

```typescript
// streaming-display.ts
import { WorkbenchComponent, InitContext, MessageStreamEvent } from '@workbench/sdk';

class StreamingDisplayComponent implements WorkbenchComponent {
  readonly id = 'com.example.streaming-display';
  readonly version = '1.0.0';

  private host: InitContext['host'];
  private root: HTMLElement | null = null;
  private streamingContainer: HTMLElement | null = null;

  async init(context: InitContext): Promise<void> {
    this.host = context.host;

    // 只订阅流式消息
    this.host.messages.subscribe(
      (event) => this.handleStreamEvent(event),
      { streamingOnly: true }
    );
  }

  async mount(element: HTMLElement): Promise<void> {
    this.root = element;
    this.root.innerHTML = `
      <div class="streaming-display">
        <h3>实时流式消息</h3>
        <div class="streaming-output"></div>
      </div>
    `;
    this.streamingContainer = this.root.querySelector('.streaming-output');
  }

  async unmount(): Promise<void> {
    this.root = null;
    this.streamingContainer = null;
  }

  async handleMessage(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private handleStreamEvent(event: MessageStreamEvent): void {
    if (!this.streamingContainer) return;

    if (event.isStreaming) {
      // 创建或更新流式消息元素
      let streamElement = this.streamingContainer.querySelector(
        `[data-message-id="${event.message.id}"]`
      ) as HTMLElement;

      if (!streamElement) {
        streamElement = document.createElement('div');
        streamElement.className = 'stream-message';
        streamElement.dataset.messageId = event.message.id;
        this.streamingContainer.appendChild(streamElement);
      }

      // 更新内容
      const currentContent = streamElement.dataset.content || '';
      const newContent = currentContent + (event.delta || '');
      streamElement.dataset.content = newContent;

      // 渲染（带打字机效果）
      this.renderWithTypewriter(streamElement, newContent);

      if (event.isComplete) {
        streamElement.classList.add('complete');
        // 自动滚动到底部
        streamElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  private renderWithTypewriter(element: HTMLElement, content: string): void {
    element.innerHTML = `
      <span class="message-content">${this.escapeHtml(content)}</span>
      <span class="cursor">▋</span>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new StreamingDisplayComponent();
```

### 示例 3: 可视化图表组件

```typescript
// chart-viewer.ts
import { WorkbenchComponent, InitContext } from '@workbench/sdk';

// 假设使用轻量级图表库
// import { BarChart } from 'some-chart-library';

class ChartViewerComponent implements WorkbenchComponent {
  readonly id = 'com.example.chart-viewer';
  readonly version = '1.0.0';

  private host: InitContext['host'];
  private root: HTMLElement | null = null;
  private chart: any = null;

  async init(context: InitContext): Promise<void> {
    this.host = context.host;
  }

  async mount(element: HTMLElement): Promise<void> {
    this.root = element;
    this.root.innerHTML = `
      <div class="chart-viewer">
        <div class="chart-controls">
          <button data-type="messages">消息数量</button>
          <button data-type="words">字数统计</button>
          <button data-type="sentiment">情感分析</button>
        </div>
        <div class="chart-container"></div>
      </div>
    `;

    this.setupControls();
    this.renderChart('messages');
  }

  async unmount(): Promise<void> {
    if (this.chart) {
      this.chart.destroy();
    }
    this.root = null;
  }

  async handleMessage(message: WorkbenchMessage): Promise<void> {
    if (message.type === 'component:update') {
      this.renderChart(message.payload.chartType as string);
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private setupControls(): void {
    const buttons = this.root?.querySelectorAll('button[data-type]');
    buttons?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = (e.currentTarget as HTMLElement).dataset.type;
        if (type) {
          this.renderChart(type);
        }
      });
    });
  }

  private renderChart(type: string): void {
    const messages = this.host.messages.getAll();
    const container = this.root?.querySelector('.chart-container');
    if (!container) return;

    const data = this.getChartData(type, messages);

    // 销毁旧图表
    if (this.chart) {
      this.chart.destroy();
    }

    // 创建新图表
    this.chart = new BarChart({
      container,
      data,
      options: {
        responsive: true,
        animation: { duration: 300 }
      }
    });
  }

  private getChartData(type: string, messages: Message[]): any {
    switch (type) {
      case 'messages':
        return {
          labels: ['用户', '助手', '系统'],
          datasets: [{
            data: [
              messages.filter(m => m.role === 'user').length,
              messages.filter(m => m.role === 'assistant').length,
              messages.filter(m => m.role === 'system').length
            ]
          }]
        };

      case 'words':
        return {
          labels: messages.map((_, i) => `消息 ${i + 1}`),
          datasets: [{
            data: messages.map(m => m.content.split(' ').length)
          }]
        };

      default:
        return { labels: [], datasets: [] };
    }
  }
}

export default new ChartViewerComponent();
```

---

## 调试技巧

### 1. 使用开发服务器

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3001
```

### 2. 浏览器 DevTools

```typescript
// 在组件中添加调试日志
console.log('[MyComponent] Init:', context);

// 使用 debugger 断点
debugger;
```

### 3. SDK 调试模式

```typescript
// 启用 SDK 调试模式
import { setDebugMode } from '@workbench/sdk';

setDebugMode(true);
```

### 4. 消息追踪

```typescript
// 追踪所有消息
this.host.events.on('*', (event, data) => {
  console.log(`[Event] ${event}:`, data);
});
```

### 5. 性能分析

```typescript
import { measurePerformance } from '@workbench/sdk/utils';

async mount(element: HTMLElement): Promise<void> {
  await measurePerformance('mount', async () => {
    // 挂载逻辑
  });
}
```

---

## 发布流程

### 本地组件市场发布

对于本地开发，组件需要发布到 `/opt/market` 目录：

```bash
# 使用发布脚本（推荐）
npx tsx scripts/publish-component.ts gallery/{组件名}

# 或手动复制
mkdir -p /opt/market/components/{组件名}
cp gallery/{组件名}/manifest.json /opt/market/components/{组件名}/
cp gallery/{组件名}/index.js /opt/market/components/{组件名}/
cp gallery/{组件名}/README.md /opt/market/components/{组件名}/
```

**registry.json 格式**：

```json
{
  "version": "1.0.0",
  "components": [
    {
      "id": "com.workbench.{组件名}",
      "name": "{组件名}",
      "version": "1.0.0",
      "description": "组件描述",
      "author": "作者",
      "icon": "🎯",
      "manifestUrl": "/market/{组件名}/manifest.json",
      "entryUrl": "/market/{组件名}/index.js",
      "capabilities": {
        "required": [],
        "optional": ["host:ui:notify", "host:ui:resize"]
      },
      "publishedAt": "2026-02-08T00:00:00Z"
    }
  ],
  "lastUpdated": "2026-02-08T00:00:00Z"
}
```

**⚠️ 注意事项**：

1. 组件目录在 `/opt/market/components/{组件名}/`
2. `manifestUrl` 和 `entryUrl` 使用 `/market/...` 前缀
3. 后端服务会从 `/opt/market/` 目录读取文件
4. 发布脚本会自动更新 registry.json

### 1. 构建组件

```bash
# 构建
npm run build

# 输出: dist/index.js, dist/styles.css
```

### 2. 上传到 CDN

```bash
# 使用上传脚本
npm run upload:cdn
```

### 3. 更新 manifest.json

```json
{
  "entry": "https://cdn.example.com/my-component/dist/index.js",
  "styles": ["https://cdn.example.com/my-component/dist/styles.css"]
}
```

### 4. 注册到组件市场（可选）

```bash
# 发布到组件市场
npm run publish:marketplace
```

### 5. 测试远程组件

```typescript
// 在 Workbench 中测试
workbench.loadComponent('https://cdn.example.com/my-component/manifest.json');
```

---

## Manifest 配置注意事项

### ⚠️ 路径配置规范（重要）

在编写 `manifest.json` 时，路径配置需要特别注意。前端加载器会自动处理相对路径，将其转换为正确的 API 路径。

#### 相对路径会自动转换

当你在 `manifest.json` 中使用相对路径时，前端加载器会自动将其转换为完整的 API 路径：

```json
{
  "name": "todolist",
  "entry": "./index.js",           // 会被转换为: /market/todolist/index.js
  "entry": "index.js",              // 也会被转换为: /market/todolist/index.js
  "styles": ["./styles.css"]        // 会被转换为: /market/todolist/styles.css
}
```

#### 转换规则

| manifest 中的路径 | 转换后的路径 | 说明 |
|-----------------|-------------|------|
| `./index.js` | `/market/{组件名}/index.js` | `./` 前缀会被去除 |
| `index.js` | `/market/{组件名}/index.js` | 纯文件名会被处理 |
| `/path/to/file.js` | `/path/to/file.js` | 绝对路径保持不变 |
| `https://cdn...` | `https://cdn...` | 外部 URL 保持不变 |

#### ⚠️ 常见错误

**错误 1: 使用错误的路径前缀**

```json
{
  // ❌ 错误：不要使用 /market/ 前缀
  "entry": "/market/todolist/index.js",

  // ❌ 错误：不要使用 localhost 或 IP
  "entry": "http://127.0.0.1:8001/market/todolist/index.js",

  // ✅ 正确：使用相对路径
  "entry": "./index.js",

  // ✅ 正确：使用完整的 API 路径
  "entry": "/market/todolist/index.js"
}
```

**错误 2: 硬编码域名或端口**

```json
{
  "configSchema": {
    "properties": {
      "apiBaseUrl": {
        // ❌ 错误：硬编码了特定的域名和端口
        "default": "http://127.0.0.1:8001",

        // ✅ 正确：使用空字符串，表示使用当前域名（同源请求）
        "default": ""
      }
    }
  }
}
```

#### Kubernetes 风格格式

如果使用 Kubernetes 风格的 manifest（用于组件市场），同样适用相对路径规则：

```json
{
  "apiVersion": "1.0.0",
  "kind": "Component",
  "metadata": {
    "name": "hello-world",
    "version": "1.0.0"
  },
  "spec": {
    "entry": "index.js",    // 会被转换为: /market/hello-world/index.js
    "styles": ["style.css"] // 会被转换为: /market/hello-world/style.css
  }
}
```

#### API 端点说明

后端组件市场 API 的端点结构：

```
GET /market/{组件名}/manifest.json  → 返回组件清单
GET /market/{组件名}/index.js      → 返回组件入口文件
GET /market/{组件名}/{文件名}       → 返回组件其他资源文件
```

**文件存储位置**：

```
/opt/market/
├── components/
│   ├── hello-world/
│   │   ├── manifest.json
│   │   ├── index.js
│   │   └── README.md
│   ├── todolist/
│   │   ├── manifest.json
│   │   ├── index.js
│   │   └── README.md
│   └── ...
└── registry.json
```

#### 最佳实践总结

1. **使用相对路径**：在 `manifest.json` 中，优先使用 `./filename.js` 或 `filename.js` 格式
2. **避免硬编码域名**：不要在 manifest 中硬编码 `localhost`、IP 地址或特定域名
3. **使用空字符串作为默认值**：对于 API 地址配置，默认使用空字符串表示同源请求
4. **测试加载**：发布前务必测试组件是否能正确加载

---

## 常见问题

### Q: 如何处理组件版本更新？

A: 在 manifest.json 中指定版本，SDK 会自动检查更新：

```json
{
  "version": "1.0.0",
  "updateUrl": "https://cdn.example.com/my-component/updates.json"
}
```

### Q: 组件可以调用第三方 API 吗？

A: 可以，但需要在 manifest.json 中声明权限：

```json
{
  "permissions": ["network:request"],
  "allowedOrigins": ["https://api.example.com"]
}
```

### Q: 如何在组件中使用 React/Vue？

A: 组件可以使用任何框架，只要最终导出符合规范的接口：

```typescript
// React 组件示例
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

class ReactComponent implements WorkbenchComponent {
  async mount(element: HTMLElement): Promise<void> {
    ReactDOM.render(<App host={this.host} />, element);
  }

  async unmount(): Promise<void> {
    ReactDOM.unmountComponentAtNode(this.root);
  }
}
```

### Q: 如何处理流式消息的中断？

A: 监听消息状态事件：

```typescript
this.host.messages.subscribe((event) => {
  if (event.isStreaming && !event.isComplete) {
    // 设置超时
    setTimeout(() => {
      if (!event.isComplete) {
        console.error('Streaming timeout');
      }
    }, 30000);
  }
});
```

---

**文档版本**: 1.0.0
**最后更新**: 2026-02-05
**作者**: ZC & Claude
