# ChatBox 消息系统指南

## 概述

ChatBox 消息系统是一个基于 Message Station 协议的多 Agent 对话系统，支持流式消息、消息聚合、回复关系追踪等功能。

## 核心概念

### 消息标识

| 字段 | 用途 | 说明 |
|------|------|------|
| `message_id` | 消息唯一标识 | 用于聚合同一条流式消息的不同 seq |
| `round_id` | 回复关系标识 | Agent 响应的 round_id = 用户消息的 message_id |
| `seq` | 流式序号 | 同一条消息的不同片段序号 |

### 消息状态

```typescript
enum MessageStatus {
  ERROR = -1,    // 错误
  START = 1,     // 开始
  CHUNK = 2,     // 传输中
  END = 3,       // 完成
}
```

### 投递状态

```typescript
enum DeliveryStatus {
  PENDING = 'P',           // 待发送
  DELIVERED = 'DELIVERED', // 已送达
  ACKED = 'ACKED',         // 已确认
  FAILED = 'FAILED',       // 失败
  DISCARDED = 'DISCARDED', // 已丢弃
}
```

## 数据流

```
RawMessage[] → 合并去重 → 聚合 → 建立回复关系 → UI渲染
  (按 seq)    (按 message_id)  (按 round_id)
```

### 处理流程

1. **合并去重**: 按 `(message_id, seq)` 合并新旧消息
2. **聚合**: 按 `message_id` 聚合流式消息
3. **建立回复关系**: 按 `round_id` 建立 Agent 响应与用户消息的关联
4. **UI 渲染**: 根据聚合后的消息渲染界面

## 类型定义

### RawMessage（原始消息）

```typescript
interface RawMessage {
  id: number;                        // 数据库主键
  session_id: string;
  round_id: string;                  // 回复的消息ID
  message_id: string;                // 消息唯一标识
  from: string;
  to: string;
  seq: number;
  status: number;
  delivery_status: string;
  context: Record<string, string>;
  payload: string;
  timestamp: number;
  created_at: number;
}
```

### UIMessage（UI 消息）

```typescript
interface UIMessage {
  // 标识
  id: string;                        // message_id
  replyToId?: string;                // 回复的消息ID
  dbId?: number;                     // 数据库主键

  // 发送者信息
  from: string;
  to: string;
  role: 'user' | 'assistant' | 'system';

  // 内容
  content: string;                   // 纯文本内容
  contentBlocks: AnyContentBlock[];  // 内容块数组
  chunks: StreamChunk[];             // 流式块列表

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
}
```

## 核心工具类

### MessageAggregator（消息聚合器）

```typescript
class MessageAggregator {
  // 按 message_id 分组
  static groupMessages(messages: RawMessage[]): Map<string, RawMessage[]>;

  // 聚合单组消息
  static aggregateGroup(messages: RawMessage[]): UIMessage;

  // 聚合所有消息
  static aggregate(messages: RawMessage[]): UIMessage[];
}
```

### ReplyRelationOrganizer（回复关系组织器）

```typescript
class ReplyRelationOrganizer {
  // 建立回复关系
  static organize(messages: UIMessage[]): ReplyRelation[];

  // 获取消息的回复目标
  static getReplyTarget(message: UIMessage, allMessages: UIMessage[]): UIMessage | null;
}
```

### MessageMerger（消息合并器）

```typescript
class MessageMerger {
  // 合并新旧消息列表
  static merge(existing: RawMessage[], incoming: RawMessage[]): RawMessage[];
}
```

## UI 组件

### 组件层次

```
ChatMessages
 └─ MessageItem
     ├─ MessageBubble (用户消息)
     ├─ AgentResponsesContainer
     │   ├─ MessageBubble (Agent 1)
     │   └─ MessageBubble (Agent 2)
     └─ RoundStatus
```

### 状态指示器

| 状态 | UI 显示 |
|------|---------|
| START | 旋转加载图标 + "正在思考..." |
| CHUNK | 闪烁光标 + "正在输入..." |
| END | 发送成功图标 ✓ |
| ERROR | 错误图标 + 错误信息 |

## 文件结构

```
src/
├── workbench/
│   ├── types/
│   │   ├── message.ts              # 消息类型定义
│   │   └── content-block.ts        # 内容块类型定义
│   └── utils/
│       ├── message-aggregator.ts   # 消息聚合器
│       ├── message-organizer.ts    # 回复关系组织器
│       ├── message-merger.ts       # 消息合并器
│       └── message-converters.ts   # 消息转换工具
├── hooks/
│   └── useChatMessages.ts          # 消息 Hook
└── components/
    └── chat/
        ├── ChatMessages.tsx         # 消息容器
        └── message/                 # 消息相关组件
            ├── MessageBubble.tsx    # 消息气泡
            ├── MessageContent.tsx   # 消息内容
            ├── MessageStatus.tsx    # 状态指示器
            └── ReplyReference.tsx   # 回复引用
```

## 相关文档

- [Message Station 协议](/opt/claude/message-station/docs/PROTOCOL.md)
- [Message Station 架构](/opt/claude/message-station/docs/ARCHITECTURE.md)
- [工作区 002 - 完整设计文档](/opt/claude/myworkbench-fe/docs/workspace/002-chatbox-message-rendering/)

## 常见问题

### Q: 为什么消息会渲染混乱？

A: 之前使用 `message_id` 判断是否为新消息，但同一条流式消息有多个 seq，导致不同 round 的消息可能被合并。现在改为按 `(message_id, seq)` 合并去重，按 `message_id` 聚合，按 `round_id` 建立回复关系。

### Q: 如何判断消息角色？

A: 根据 `from` 字段判断：
- `from` 以 `user-` 开头 → `user`
- `from` === `system` → `system`
- 其他 → `assistant`

### Q: 回复关系如何建立？

A: Agent 消息的 `round_id` 等于用户消息的 `message_id`，通过这个关系建立"引用样式"。

---
*创建时间: 2026-02-08*
