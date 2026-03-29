# 前端改动计划：Agent 思考过程披露优化（对标 Claude Code）

> **状态**: 待执行
> **目标**: 前端按叙事顺序渲染 thinking → tool → thinking → tool → response，呈现 Claude Code 风格的思考过程展示
> **前置依赖**: 后端已完成 TextItem.role 字段改动

---

## 目标效果

```
┌─────────────────────────────────────────────┐
│ 🤖 刘建明秘书                                │
│                                             │
│ 让我搜索今日新闻...                          │ ← thinking（灰色小字）
│                                             │
│ > 搜索今日新闻 ························· ✓  │ ← 折叠工具块
│                                             │
│ 找到了 15 条科技类新闻，让我筛选最重要的。    │ ← thinking
│                                             │
│ > 获取新闻详情（5篇）·················· ✓  │ ← 折叠工具块
│                                             │
│ 已获取全部详情，现在整理早报格式。            │ ← thinking
│                                             │
│ 📰 **今日早报 - 2024.03.28**               │ ← response（正常 Markdown）
│ 1. XXXX                                    │
│ 2. XXXX                                    │
│                                             │
│ ⏱ 3轮 · gpt-4o · 1,234 tokens            │ ← 元信息
└─────────────────────────────────────────────┘
```

---

## Step 1: 扩展 ContentType 和 Block 类型

**文件**: `src/types/content-block.ts`

### 1a. 新增 THINKING 类型

在 `ContentType` 枚举中增加：

```typescript
export enum ContentType {
  // Basic types
  TEXT = 'text',
  MARKDOWN = 'markdown',
  THINKING = 'thinking',  // 新增：Agent 思考过程
  // ... 其他不变
}
```

### 1b. 新增 ThinkingBlock 接口

```typescript
/**
 * Thinking content block - Agent's intermediate reasoning
 */
export interface ThinkingBlock extends ContentBlock {
  type: ContentType.THINKING;
  content: string;
}
```

### 1c. 更新 AnyContentBlock 联合类型

```typescript
export type AnyContentBlock =
  | TextBlock
  | MarkdownBlock
  | ThinkingBlock  // 新增
  | CodeBlock
  // ... 其他不变
```

---

## Step 2: 修改 Payload 解析，识别 thinking role

**文件**: `src/utils/message-converters.ts`

### 修改 `parsePayloadToBlocks` 函数（约第 136-141 行）

在 `case 'text':` 分支中，根据 `item.role` 区分 thinking 和 response：

```typescript
case 'text':
  if (item.role === 'thinking') {
    // thinking 类型：创建 ThinkingBlock
    blocks.push({
      type: ContentType.THINKING,
      content: item.text || '',
    });
  } else {
    // response 类型（默认）：创建 MarkdownBlock
    blocks.push(createMarkdownBlock(item.text || ''));
  }
  break;
```

这样当后端发来 `{ itemType: "text", text: "...", role: "thinking" }` 时自动创建 ThinkingBlock，
而 `role: "response"` 或无 role 字段时仍然创建 MarkdownBlock（向后兼容）。

---

## Step 3: 新建 ThinkingBlock 组件

**新文件**: `src/components/chat/message/ThinkingBlock.tsx`

展示 Agent 的中间思考文本，风格与最终回复区分：
- 字号小一号（12px）
- 颜色偏灰（#6b7280）
- 无背景装饰
- 默认展开显示

```typescript
interface ThinkingBlockProps {
  content: string;
}

export function ThinkingBlockRenderer({ content }: ThinkingBlockProps) {
  // 渲染思考文本
  // 样式：fontSize 12px, color #6b7280, lineHeight 1.5
  // 内容可包含 markdown，用 renderMarkdown 渲染
}
```

设计要点：
- 思考文本通常较短（1-2 句），不需要折叠
- 与上下文的工具块/回复之间有 4px 间距
- 不带消息气泡样式，直接内嵌在消息内容区

---

## Step 4: 改造工具调用展示组件

**文件**: `src/components/chat/message/ToolCallTimeline.tsx` → 改造为 `ActionBlock`

### 当前问题
- 竖线时间轴风格，技术感太强
- 工具名直接显示（`web_search`），非技术用户看不懂

### 改造为 Claude Code 风格

**单个工具**显示为可折叠行：
```
> 搜索今日新闻 ·········································· ✓
```

展开后：
```
∨ 搜索今日新闻                                            ✓
  web_search  {"query": "2024-03-28 科技新闻"}
  结果: 找到 15 条结果...
```

**连续多个工具**聚合显示：
```
> 执行了 3 个操作 ······································· ✓
```

展开后显示每个工具的详情。

### 具体改动

保留 `ToolCallTimeline.tsx` 文件名，重写内部实现：

1. **折叠态**：一行显示，左侧 `>` 箭头 + 人话描述 + 右侧状态图标（✓/⏳/✗）
2. **展开态**：显示工具名 + 参数 + 结果（当前已有的 pre 展示逻辑可复用）
3. **聚合逻辑**：保留现有的 `groupContentBlocks`，连续 tool_call 块作为一组
4. **人话描述**：复用 `getToolDescription()`（已有，`src/utils/tool-status.ts`）

样式参考：
- 折叠行高度 28px，字号 13px
- 背景色 transparent，hover 时 #f9fafb
- 状态图标：running=amber spinner, success=green ✓, error=red ✗
- 展开内容区：左侧 2px 灰色竖线缩进，代码风格

---

## Step 5: 改造 MessageBubble 渲染逻辑

**文件**: `src/components/chat/message/MessageBubble.tsx`

### 当前逻辑（约第 274-288 行）

```typescript
groupContentBlocks(message.contentBlocks).map((group, gIdx) => {
  if (group.type === 'tool_group') {
    return <ToolCallTimeline key={...} blocks={group.blocks} />;
  }
  const block = group.blocks[0];
  return <ContentBlockRenderer key={...} block={block} />;
})
```

### 改为

保持 `groupContentBlocks` 逻辑不变（连续工具块聚合），但在 `ContentBlockRenderer` 中新增对 `THINKING` 类型的处理：

```typescript
// ContentBlockRenderer 中新增（约第 525 行之后）
if (block.type === ContentType.THINKING) {
  return <ThinkingBlockRenderer content={(block as ThinkingBlock).content} />;
}
```

因为 thinking block 和 tool_group 本身就是按 payload 数据顺序排列的，所以 `groupContentBlocks` 的现有逻辑已经能正确处理交错：

```
data 顺序: thinking → tool → tool → thinking → tool → response
分组后:    [thinking] → [tool_group] → [thinking] → [tool_group] → [response]
渲染:      ThinkingBlock → ToolCallTimeline → ThinkingBlock → ToolCallTimeline → MarkdownContent
```

不需要改动分组逻辑。

---

## Step 6: 新增 MessageMeta 元信息组件

**新文件**: `src/components/chat/message/MessageMeta.tsx`

在消息气泡底部、时间戳旁边，显示 Agent 执行的元信息。

数据来源：`message.context`（从 SSE poll 消息中获取）

```typescript
interface MessageMetaProps {
  context?: Record<string, string>;
}

// 显示内容：
// - rounds: "3轮推理"
// - model: "gpt-4o"
// - llm_usage: "1,234 tokens"
// 格式: "3轮 · gpt-4o · 1,234 tokens"
```

样式：
- 字号 11px，颜色 #94a3b8
- 与时间戳同行显示，用 `·` 分隔
- 仅当 context 中有 rounds 字段时显示（普通文本消息不显示）

### 在 MessageBubble 中集成

在状态行区域（约第 298 行），时间戳之后加入 MessageMeta：

```typescript
<span className="text-xs" style={{ color: '#475569' }}>
  {formatTimestamp(message.timestamp)}
</span>
{/* 新增：元信息 */}
{!isUser && message.context && (
  <MessageMeta context={message.context} />
)}
```

---

## Step 7: 确保 context 数据传递到 UIMessage

**文件**: `src/utils/message-converters.ts` 或 `src/utils/message-aggregator.ts`

检查当前 `UIMessage` 类型是否包含 `context` 字段。如果没有，需要：

1. 在 `UIMessage` 类型中增加 `context?: Record<string, string>`
2. 在消息转换/聚合时，从 RawMessage 中提取 context 并传递到 UIMessage

（需要检查 `src/types/message-station.ts` 中 UIMessage 的定义）

---

## Step 8: 向后兼容处理

### 无 role 字段的旧消息
- `parsePayloadToBlocks` 中：`item.role` 不存在或不是 `"thinking"` → 走 MarkdownBlock（当前行为）
- 不影响任何已有消息的展示

### 无 context 的旧消息
- `MessageMeta` 组件：无 context 或无 rounds 字段时不渲染
- 不影响任何已有消息的展示

---

## 文件改动清单

| 文件 | 改动类型 | 内容 |
|------|---------|------|
| `src/types/content-block.ts` | 修改 | 新增 THINKING 枚举值和 ThinkingBlock 接口 |
| `src/utils/message-converters.ts` | 修改 | parsePayloadToBlocks 中根据 role 区分 thinking/response |
| `src/components/chat/message/ThinkingBlock.tsx` | **新建** | thinking 文本渲染组件 |
| `src/components/chat/message/ToolCallTimeline.tsx` | 修改 | 改为 Claude Code 风格的折叠工具块 |
| `src/components/chat/message/MessageBubble.tsx` | 修改 | ContentBlockRenderer 增加 THINKING 处理；底部加 MessageMeta |
| `src/components/chat/message/MessageMeta.tsx` | **新建** | 元信息组件（轮次/模型/token） |
| `src/types/message-station.ts` | 可能修改 | UIMessage 增加 context 字段（如果尚未有） |

---

## 实施顺序

```
Step 1 → Step 2 → Step 3 → Step 5 → Step 4 → Step 6 → Step 7 → Step 8
类型定义  解析逻辑  thinking组件  渲染集成  工具块改造  元信息组件  数据传递  兼容测试
```

建议优先做 Step 1-3 + 5，这样 thinking 文本就能正确显示了。
Step 4（工具块改造）可以作为第二阶段，独立优化。
Step 6-7（元信息）是锦上添花，最后做。

---

## 测试要点

1. **后端已改好后**：发送"生成每日早报"，检查 thinking 文本是否以灰色小字正确显示在工具块之间
2. **向后兼容**：查看历史消息是否正常显示（无 role 字段时降级为 MarkdownBlock）
3. **工具块折叠**：点击展开/折叠是否正常，人话描述是否准确
4. **元信息**：底部是否正确显示轮次、模型、token 数
5. **流式场景**：streaming 过程中 thinking 文本是否实时更新显示
