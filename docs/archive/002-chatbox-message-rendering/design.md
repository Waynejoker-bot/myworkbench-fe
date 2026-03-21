# 002 - ChatBox 消息系统技术设计

## 一、类型系统设计

### 1.1 核心类型定义

```typescript
// /opt/claude/myworkbench-fe/src/workbench/types/message.ts

/**
 * 消息状态枚举（与 Message Station PROTOCOL.md 对齐）
 */
export enum MessageStatus {
  ERROR = -1,
  START = 1,
  CHUNK = 2,
  END = 3,
}

/**
 * 投递状态枚举（与 Message Station ARCHITECTURE.md 对齐）
 */
export enum DeliveryStatus {
  PENDING = 'P',
  DELIVERED = 'DELIVERED',
  ACKED = 'ACKED',
  FAILED = 'FAILED',
  DISCARDED = 'DISCARDED',
}

/**
 * 原始消息类型（与 Message Station API 返回格式对齐）
 */
export interface RawMessage {
  id: number;                        // 数据库主键
  session_id: string;
  round_id: string;                  // 回复的消息ID（Agent响应时=用户消息的message_id）
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

/**
 * 流式块
 */
export interface StreamChunk {
  seq: number;
  status: MessageStatus;
  content: string;
  timestamp: number;
}

/**
 * UI 消息类型（聚合后）
 *
 * 说明：支持可扩展的内容块系统，详见 message-content-design.md
 */
export interface UIMessage {
  // 标识
  id: string;                        // message_id
  replyToId?: string;                // 回复的消息ID（round_id，用于引用样式）
  dbId?: number;                     // 数据库主键（可选）

  // 发送者信息
  from: string;
  to: string;
  role: 'user' | 'assistant' | 'system';

  // 内容（支持内容块，详见 message-content-design.md）
  content: string;                   // 兼容性：纯文本内容（自动从 contentBlocks 生成）
  contentBlocks: AnyContentBlock[];  // 内容块数组（支持文本、代码、工具调用等）
  chunks: StreamChunk[];             // 流式块列表（用于回放流式生成过程）

  // 状态
  messageStatus: MessageStatus;      // 当前消息状态
  deliveryStatus: DeliveryStatus;    // 投递状态

  // 时间
  startTime: number;                 // 开始时间
  endTime?: number;                  // 结束时间（已完成时）
  timestamp: number;                 // 最后更新时间

  // 元数据
  context: Record<string, string>;
  hasError: boolean;
}

/**
 * 回复关系（用于建立消息间的引用）
 */
export interface ReplyRelation {
  userMessageId: string;             // 用户消息的 message_id
  agentResponses: UIMessage[];       // 回复这条用户消息的所有 Agent 消息
}

// 注意：AnyContentBlock 等类型定义在 message-content-design.md 中
// 包括：TextBlock, MarkdownBlock, CodeBlock, ToolCallBlock 等
```

### 1.2 类型转换工具

```typescript
// /opt/claude/myworkbench-fe/src/workbench/utils/message-converters.ts

/**
 * 判断消息角色
 */
export function determineRole(message: RawMessage | UIMessage): 'user' | 'assistant' | 'system' {
  const from = message.from;
  if (from === 'user-zc' || from.startsWith('user-')) {
    return 'user';
  }
  if (from === 'system') {
    return 'system';
  }
  return 'assistant';
}

/**
 * 解析 payload
 */
export function parsePayload(payload: string): string {
  try {
    const parsed = JSON.parse(payload);
    if (parsed.type === 'text') {
      return parsed.content || payload;
    }
    if (parsed.content) {
      return parsed.content;
    }
    return payload;
  } catch {
    return payload;
  }
}
```

---

## 二、消息聚合逻辑

### 2.1 聚合器核心

```typescript
// /opt/claude/myworkbench-fe/src/workbench/utils/message-aggregator.ts

/**
 * 消息聚合器
 *
 * 重要说明：
 * - 只按 message_id 聚合（同一 message_id 的不同 seq 是同一条流式消息）
 * - round_id 用于建立回复关系，不用于聚合
 */
export class MessageAggregator {
  /**
   * 按 message_id 分组（流式消息聚合）
   */
  static groupMessages(messages: RawMessage[]): Map<string, RawMessage[]> {
    const groups = new Map<string, RawMessage[]>();

    for (const msg of messages) {
      const key = msg.message_id;  // 只按 message_id 分组
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(msg);
    }

    return groups;
  }

  /**
   * 聚合单组消息（同一条流式消息的不同 seq）
   */
  static aggregateGroup(messages: RawMessage[]): UIMessage {
    // 按 seq 排序
    const sorted = [...messages].sort((a, b) => a.seq - b.seq);

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // 聚合内容
    const content = sorted.map(m => parsePayload(m.payload)).join('');

    // 构建 chunks
    const chunks: StreamChunk[] = sorted.map(m => ({
      seq: m.seq,
      status: m.status as MessageStatus,
      content: parsePayload(m.payload),
      timestamp: m.timestamp || m.created_at,
    }));

    const isComplete = last.status === MessageStatus.END;
    const hasError = last.status === MessageStatus.ERROR;

    return {
      id: last.message_id,
      replyToId: last.round_id,  // round_id 表示回复哪条消息
      dbId: last.id,
      from: last.from,
      to: last.to,
      role: determineRole(last),
      content,
      chunks,
      messageStatus: last.status as MessageStatus,
      deliveryStatus: last.delivery_status as DeliveryStatus,
      startTime: first.timestamp || first.created_at,
      endTime: isComplete ? (last.timestamp || last.created_at) : undefined,
      timestamp: last.timestamp || last.created_at,
      context: last.context || {},
      hasError,
    };
  }

  /**
   * 聚合所有消息
   */
  static aggregate(messages: RawMessage[]): UIMessage[] {
    const groups = this.groupMessages(messages);
    const result: UIMessage[] = [];

    for (const group of groups.values()) {
      result.push(this.aggregateGroup(group));
    }

    return result.sort((a, b) => a.startTime - b.startTime);
  }
}
```

### 2.2 回复关系组织器

```typescript
/**
 * 回复关系组织器
 *
 * 用途：基于 round_id 建立 Agent 响应与用户消息的回复关系
 *
 * 逻辑：
 * - Agent 消息的 round_id = 用户消息的 message_id
 * - 用这个关系建立"引用样式"或"回复关系"
 */
export class ReplyRelationOrganizer {
  /**
   * 建立回复关系
   */
  static organize(messages: UIMessage[]): ReplyRelation[] {
    // 获取所有用户消息
    const userMessages = messages.filter(m => m.role === 'user');

    return userMessages.map(userMsg => ({
      userMessageId: userMsg.id,
      // 找到所有回复这条用户消息的 Agent 消息（replyToId = userMsg.id）
      agentResponses: messages.filter(
        m => m.role !== 'user' && m.replyToId === userMsg.id
      ),
    }));
  }

  /**
   * 获取消息的回复目标（用户消息）
   */
  static getReplyTarget(
    message: UIMessage,
    allMessages: UIMessage[]
  ): UIMessage | null {
    if (!message.replyToId) return null;
    return allMessages.find(m => m.id === message.replyToId) || null;
  }
}
```

### 2.3 消息合并器

```typescript
/**
 * 消息合并器（处理新旧消息去重）
 */
export class MessageMerger {
  /**
   * 合并新旧消息列表
   * 规则：同一 (message_id, seq) 的消息，新的覆盖旧的
   */
  static merge(existing: RawMessage[], incoming: RawMessage[]): RawMessage[] {
    const map = new Map<string, RawMessage>();

    for (const msg of existing) {
      const key = `${msg.message_id}:${msg.seq}`;
      map.set(key, msg);
    }

    for (const msg of incoming) {
      const key = `${msg.message_id}:${msg.seq}`;
      map.set(key, msg);
    }

    return Array.from(map.values()).sort((a, b) => {
      // 先按时间排序
      const timeA = a.timestamp || a.created_at;
      const timeB = b.timestamp || b.created_at;
      return timeA - timeB;
    });
  }
}
```

---

## 三、Hook 重构设计

### 3.1 新的 Hook 接口

```typescript
export interface UseChatMessagesReturn {
  rawMessages: RawMessage[];
  messages: UIMessage[];
  rounds: Round[];
  isLoading: boolean;
  isSending: boolean;
  send: (content: string, agentId: string) => Promise<boolean>;
  clear: () => void;
  regenerate: (roundId: string) => Promise<boolean>;
}
```

### 3.2 核心逻辑流程

```
┌─────────────────────────────────────────────┐
│            useChatMessages                   │
├─────────────────────────────────────────────┤
│                                              │
│  初始化加载 → 启动 Poll → 处理新消息         │
│                           │                 │
│                           ▼                 │
│                    合并消息(去重)             │
│                           │                 │
│                           ▼                 │
│                    聚合消息(按message_id)    │
│                           │                 │
│                           ▼                 │
│                    组织轮次(按round_id)      │
│                           │                 │
│                           ▼                 │
│                    更新 UI                   │
└─────────────────────────────────────────────┘
```

---

## 四、UI 组件设计

### 4.1 组件层次

```
ChatMessages
 └─ RoundItem
     ├─ MessageBubble (用户消息)
     ├─ AgentResponsesContainer
     │   ├─ MessageBubble (Agent 1)
     │   └─ MessageBubble (Agent 2)
     └─ RoundStatus
```

### 4.2 状态指示器设计

| 状态 | UI 显示 |
|------|---------|
| START | 旋转加载图标 + "正在思考..." |
| CHUNK | 闪烁光标 + "正在输入..." |
| END | 发送成功图标 ✓ |
| ERROR | 错误图标 + 错误信息 |

---

*文档创建时间：2026-02-08*
