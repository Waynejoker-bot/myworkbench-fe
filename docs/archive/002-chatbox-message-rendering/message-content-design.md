# 消息内容形态设计

## 一、背景

在多 Agent 对话系统中，消息内容远不止纯文本。Agent 可能会返回：
- 代码片段及执行结果
- 结构化数据（表格、图表）
- 文件和图片
- 工具调用过程
- 交互式卡片（按钮、表单）
- 进度信息（长时间任务）
- 多媒体内容

因此，我们需要设计一个**可扩展的消息内容系统**。

---

## 二、内容类型设计

### 2.1 内容块 (Content Block) 模型

每条消息由一个或多个"内容块"组成：

```typescript
/**
 * 内容块类型
 */
export enum ContentType {
  // 基础类型
  TEXT = 'text',                    // 纯文本
  MARKDOWN = 'markdown',            // Markdown 格式

  // 代码相关
  CODE = 'code',                    // 代码块
  CODE_RESULT = 'code_result',      // 代码执行结果

  // 数据展示
  TABLE = 'table',                  // 表格
  CHART = 'chart',                  // 图表
  JSON = 'json',                    // JSON 数据

  // 媒体
  IMAGE = 'image',                  // 图片
  FILE = 'file',                    // 文件

  // 工具相关
  TOOL_CALL = 'tool_call',          // 工具调用
  TOOL_RESULT = 'tool_result',      // 工具执行结果

  // 交互式
  CARD = 'card',                    // 卡片（带按钮等）
  FORM = 'form',                    // 表单
  PROGRESS = 'progress',            // 进度条

  // 系统
  ERROR = 'error',                  // 错误信息
  SYSTEM = 'system',                // 系统消息
}

/**
 * 基础内容块接口
 */
export interface ContentBlock {
  type: ContentType;
  id?: string;                      // 块唯一标识
}

/**
 * 文本内容块
 */
export interface TextBlock extends ContentBlock {
  type: ContentType.TEXT;
  content: string;
}

/**
 * Markdown 内容块
 */
export interface MarkdownBlock extends ContentBlock {
  type: ContentType.MARKDOWN;
  content: string;
}

/**
 * 代码块
 */
export interface CodeBlock extends ContentBlock {
  type: ContentType.CODE;
  language: string;                 // 编程语言
  code: string;
  lineNumbers?: boolean;            // 是否显示行号
  theme?: string;                   // 主题
}

/**
 * 代码执行结果
 */
export interface CodeResultBlock extends ContentBlock {
  type: ContentType.CODE_RESULT;
  success: boolean;
  output?: string;                  // 标准输出
  error?: string;                   // 错误输出
  exitCode?: number;                // 退出码
  executionTime?: number;           // 执行时间（毫秒）
}

/**
 * 工具调用
 */
export interface ToolCallBlock extends ContentBlock {
  type: ContentType.TOOL_CALL;
  toolName: string;                 // 工具名称
  parameters: Record<string, any>;  // 参数
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;                     // 执行结果
}

/**
 * 进度块
 */
export interface ProgressBlock extends ContentBlock {
  type: ContentType.PROGRESS;
  progress: number;                 // 0-100
  message?: string;                 // 进度描述
  indeterminate?: boolean;          // 不确定进度
}

/**
 * 卡片块（交互式）
 */
export interface CardBlock extends ContentBlock {
  type: ContentType.CARD;
  title?: string;
  content: string;                  // Markdown 或纯文本
  actions?: CardAction[];           // 操作按钮
}

export interface CardAction {
  id: string;
  label: string;
  style?: 'primary' | 'secondary' | 'danger';
  action: string;                   // 操作类型
  data?: any;                       // 操作相关数据
}

/**
 * 文件块
 */
export interface FileBlock extends ContentBlock {
  type: ContentType.FILE;
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;                     // 预览 URL
  downloadUrl?: string;             // 下载 URL
}

/**
 * 错误块
 */
export interface ErrorBlock extends ContentBlock {
  type: ContentType.ERROR;
  message: string;
  details?: string;
  stack?: string;                   // 堆栈跟踪
}

/**
 * 内容块联合类型
 */
export type AnyContentBlock =
  | TextBlock
  | MarkdownBlock
  | CodeBlock
  | CodeResultBlock
  | ToolCallBlock
  | ProgressBlock
  | CardBlock
  | FileBlock
  | ErrorBlock;
```

### 2.2 更新 UIMessage 类型

```typescript
/**
 * 更新后的 UI 消息类型
 */
export interface UIMessage {
  // 标识
  id: string;
  replyToId?: string;
  dbId?: number;

  // 发送者信息
  from: string;
  to: string;
  role: 'user' | 'assistant' | 'system';

  // 内容（改为内容块数组）
  contentBlocks: AnyContentBlock[];  // 内容块列表

  // 状态
  messageStatus: MessageStatus;
  deliveryStatus: DeliveryStatus;

  // 时间
  startTime: number;
  endTime?: number;
  timestamp: number;

  // 元数据
  context: Record<string, string>;
  hasError: boolean;

  // 兼容性（保留旧的 content 字段，自动生成）
  get content(): string;             // 从 contentBlocks 生成的纯文本
}
```

---

## 三、内容块渲染系统

### 3.1 渲染器注册表

```typescript
/**
 * 内容块渲染器接口
 */
export interface ContentBlockRenderer<T extends AnyContentBlock = AnyContentBlock> {
  type: ContentType;
  render(block: T, context: RenderContext): React.ReactNode;
}

export interface RenderContext {
  message: UIMessage;
  onAction?: (action: any) => void;  // 处理交互操作
  theme?: string;
}

/**
 * 渲染器注册表
 */
class ContentBlockRendererRegistry {
  private renderers = new Map<ContentType, ContentBlockRenderer>();

  register(renderer: ContentBlockRenderer): void {
    this.renderers.set(renderer.type, renderer);
  }

  get(type: ContentType): ContentBlockRenderer | undefined {
    return this.renderers.get(type);
  }

  render(block: AnyContentBlock, context: RenderContext): React.ReactNode {
    const renderer = this.get(block.type);
    if (!renderer) {
      return <DefaultBlockRenderer block={block} />;
    }
    return renderer.render(block, context);
  }
}

export const rendererRegistry = new ContentBlockRendererRegistry();
```

### 3.2 默认渲染器

```typescript
// 注册默认渲染器
rendererRegistry.register({
  type: ContentType.TEXT,
  render: (block: TextBlock) => (
    <p className="text-content">{block.content}</p>
  ),
});

rendererRegistry.register({
  type: ContentType.MARKDOWN,
  render: (block: MarkdownBlock) => (
    <MarkdownRenderer content={block.content} />
  ),
});

rendererRegistry.register({
  type: ContentType.CODE,
  render: (block: CodeBlock) => (
    <CodeBlock
      language={block.language}
      code={block.code}
      lineNumbers={block.lineNumbers}
      theme={block.theme}
    />
  ),
});

rendererRegistry.register({
  type: ContentType.CODE_RESULT,
  render: (block: CodeResultBlock) => (
    <CodeResultBlock
      success={block.success}
      output={block.output}
      error={block.error}
      exitCode={block.exitCode}
      executionTime={block.executionTime}
    />
  ),
});

rendererRegistry.register({
  type: ContentType.TOOL_CALL,
  render: (block: ToolCallBlock, context) => (
    <ToolCallBlock
      toolName={block.toolName}
      parameters={block.parameters}
      status={block.status}
      result={block.result}
      onAction={context.onAction}
    />
  ),
});

rendererRegistry.register({
  type: ContentType.PROGRESS,
  render: (block: ProgressBlock) => (
    <ProgressBar
      progress={block.progress}
      message={block.message}
      indeterminate={block.indeterminate}
    />
  ),
});

rendererRegistry.register({
  type: ContentType.CARD,
  render: (block: CardBlock, context) => (
    <Card
      title={block.title}
      content={<MarkdownRenderer content={block.content} />}
      actions={block.actions}
      onAction={context.onAction}
    />
  ),
});

rendererRegistry.register({
  type: ContentType.ERROR,
  render: (block: ErrorBlock) => (
    <ErrorBlockDisplay
      message={block.message}
      details={block.details}
      stack={block.stack}
    />
  ),
});
```

### 3.3 MessageContent 组件

```typescript
/**
 * 消息内容组件（支持内容块）
 */
export function MessageContent({ message, onAction }: MessageContentProps) {
  return (
    <div className="message-content-blocks">
      {message.contentBlocks.map((block, index) => (
        <div key={block.id || index} className="content-block">
          {rendererRegistry.render(block, {
            message,
            onAction,
          })}
        </div>
      ))}
    </div>
  );
}
```

---

## 四、Payload 解析

### 4.1 解析策略

```typescript
/**
 * 解析 payload 为内容块
 */
export function parsePayloadToBlocks(
  payload: string
): AnyContentBlock[] {
  try {
    // 尝试解析为结构化数据
    const data = JSON.parse(payload);

    // 如果是内容块数组
    if (Array.isArray(data)) {
      return data;
    }

    // 如果是单个内容块
    if (data.type && ContentType[data.type.toUpperCase()]) {
      return [data];
    }

    // 兼容旧格式（纯文本）
    if (data.content || data.text) {
      return [{
        type: ContentType.TEXT,
        content: data.content || data.text,
      }];
    }

    // 兜底
    return [{
      type: ContentType.TEXT,
      content: payload,
    }];
  } catch {
    // 不是 JSON，作为纯文本处理
    return [{
      type: ContentType.TEXT,
      content: payload,
    }];
  }
}

/**
 * 将内容块序列化为 payload
 */
export function blocksToPayload(blocks: AnyContentBlock[]): string {
  return JSON.stringify(blocks);
}
```

### 4.2 示例 Payload 格式

```json
// 纯文本（兼容旧格式）
{ "content": "你好，世界！" }

// 单个 Markdown 块
{
  "type": "markdown",
  "content": "# 标题\n\n**粗体**内容"
}

// 多个内容块（文本 + 代码 + 结果）
[
  {
    "type": "text",
    "content": "我帮你执行了这个命令："
  },
  {
    "type": "code",
    "language": "python",
    "code": "print('Hello, World!')"
  },
  {
    "type": "code_result",
    "success": true,
    "output": "Hello, World!\n",
    "exitCode": 0
  }
]

// 工具调用
{
  "type": "tool_call",
  "toolName": "web_search",
  "parameters": { "query": "AI news" },
  "status": "success",
  "result": { ... }
}

// 交互式卡片
{
  "type": "card",
  "title": "文件已准备好",
  "content": "找到了 3 个相关文件",
  "actions": [
    { "id": "view", "label": "查看", "style": "primary" },
    { "id": "download", "label": "下载", "style": "secondary" }
  ]
}
```

---

## 五、扩展性设计

### 5.1 插件式内容类型

```typescript
/**
 * 自定义内容块注册
 */
export function registerCustomContentBlock<T extends AnyContentBlock>(
  type: ContentType,
  renderer: ContentBlockRenderer<T>
): void {
  rendererRegistry.register(renderer);
}

// 使用示例：注册一个自定义的"地图"内容块
registerCustomContentBlock({
  type: 'map' as ContentType,
  render: (block: MapBlock) => (
    <MapView
      latitude={block.latitude}
      longitude={block.longitude}
      zoom={block.zoom}
    />
  ),
});
```

### 5.2 内容块转换

```typescript
/**
 * 内容块转换器（用于兼容性）
 */
export class ContentBlockConverter {
  /**
   * 将纯文本内容块转为 Markdown
   */
  static textToMarkdown(block: TextBlock): MarkdownBlock {
    return {
      type: ContentType.MARKDOWN,
      content: block.content,
    };
  }

  /**
   * 合并相邻的同类块
   */
  static mergeConsecutiveBlocks(blocks: AnyContentBlock[]): AnyContentBlock[] {
    const result: AnyContentBlock[] = [];

    for (const block of blocks) {
      const last = result[result.length - 1];

      // 合并相邻的文本块
      if (
        last?.type === ContentType.TEXT &&
        block.type === ContentType.TEXT
      ) {
        result[result.length - 1] = {
          ...last,
          content: last.content + '\n' + block.content,
        };
      } else {
        result.push(block);
      }
    }

    return result;
  }
}
```

---

## 六、实施计划

### Phase 1: 基础架构
- [ ] 定义内容块类型
- [ ] 实现渲染器注册表
- [ ] 实现基础渲染器（TEXT, MARKDOWN, CODE）
- [ ] 更新 UIMessage 类型

### Phase 2: 扩展内容类型
- [ ] 实现 CODE_RESULT 渲染器
- [ ] 实现 TOOL_CALL 渲染器
- [ ] 实现 PROGRESS 渲染器
- [ ] 实现 ERROR 渲染器

### Phase 3: 交互式内容
- [ ] 实现 CARD 渲染器
- [ ] 实现 FILE 渲染器
- [ ] 实现操作处理机制

### Phase 4: 高级特性
- [ ] 实现内容块转换
- [ ] 实现自定义类型注册
- [ ] 性能优化（虚拟化、懒加载）

---

*文档创建时间：2026-02-08*
