/**
 * Message Station Message Types
 *
 * Types for messages from Message Station backend.
 * Aligned with /opt/claude/message-station/docs/PROTOCOL.md
 */

/**
 * Message status enumeration (from Message Station PROTOCOL.md)
 */
export enum MessageStatus {
  ERROR = -1,
  START = 1,
  CHUNK = 2,
  END = 3,
}

/**
 * Delivery status enumeration (from Message Station ARCHITECTURE.md)
 */
export enum DeliveryStatus {
  PENDING = 'P',
  DELIVERED = 'DELIVERED',
  ACKED = 'ACKED',
  FAILED = 'FAILED',
  DISCARDED = 'DISCARDED',
  QUEUED = 'QUEUED',  // Agent is busy, message is in queue
}

/**
 * Raw message type from Message Station API
 * Aligned with the database schema and API response format
 */
export interface RawMessage {
  /** Database primary key */
  id: number;

  /** Session identifier */
  session_id: string;

  /**
   * Round identifier - Used to establish reply relationships
   * For user messages: round_id = message_id
   * For agent responses: round_id = user message's message_id (indicates which message this replies to)
   */
  round_id: string;

  /** Unique message identifier */
  message_id: string;

  /** Sender agent/user ID */
  source: string;

  /** Receiver agent/user ID */
  target: string;

  /** Stream sequence number (starts from 0) */
  seq: number;

  /** Message status (START/CHUNK/END/ERROR) */
  status: number;

  /** Delivery status */
  delivery_status: string;

  /** Control fields as key-value pairs */
  context: Record<string, string>;

  /** Message payload (actual content) */
  payload: string;

  /** Message timestamp in milliseconds */
  timestamp: number;

  /** Database creation timestamp */
  created_at: number;

  /** Last update timestamp in milliseconds (from MSAPI) */
  update_time?: number;
}

/**
 * Stream chunk - represents a single chunk in a streaming message
 */
export interface StreamChunk {
  /** Sequence number */
  seq: number;

  /** Message status */
  status: MessageStatus;

  /** Content of this chunk */
  content: string;

  /** Timestamp */
  timestamp: number;
}

/**
 * UI Message type - aggregated message for display
 *
 * Note: Content blocks are defined in content-block.ts
 */
import type { AnyContentBlock } from './content-block';

export interface UIMessage {
  // ========== Identifiers ==========
  /** Message ID (message_id from RawMessage) */
  id: string;

  /**
   * ID of the message this replies to (round_id from RawMessage)
   * Used for reply reference styling
   * Undefined for user messages (they don't reply to anything)
   */
  replyToId?: string;

  /** Optional database ID */
  dbId?: number;

  // ========== Sender Information ==========
  /** Sender ID */
  source: string;

  /** Receiver ID */
  target: string;

  /** Message role */
  role: 'user' | 'assistant' | 'system';

  // ========== Content ==========
  /**
   * Compatibility: plain text content (auto-generated from contentBlocks)
   */
  content: string;

  /**
   * Content blocks array (supports text, code, tool calls, etc.)
   * @see content-block.ts for AnyContentBlock definition
   */
  contentBlocks: AnyContentBlock[];

  /**
   * Stream chunks list (used for replaying streaming generation)
   */
  chunks: StreamChunk[];

  // ========== Status ==========
  /** Current message status */
  messageStatus: MessageStatus;

  /** Delivery status */
  deliveryStatus: DeliveryStatus;

  // ========== Time ==========
  /** Start time */
  startTime: number;

  /** End time (only set when completed) */
  endTime?: number;

  /** Last update timestamp */
  timestamp: number;

  // ========== Metadata ==========
  /** Context metadata */
  context: Record<string, string>;

  /** Whether there's an error */
  hasError: boolean;

  /** Error message when delivery failed */
  errorMessage?: string;
}

/**
 * Reply relation - establishes connection between user message and agent responses
 */
export interface ReplyRelation {
  /** User message ID */
  userMessageId: string;

  /** All agent messages that reply to this user message */
  agentResponses: UIMessage[];
}

/**
 * Helper function to get message status display text
 */
export function getMessageStatusText(status: MessageStatus): string {
  switch (status) {
    case MessageStatus.START:
      return '正在思考...';
    case MessageStatus.CHUNK:
      return '正在输入...';
    case MessageStatus.END:
      return '已完成';
    case MessageStatus.ERROR:
      return '发生错误';
    default:
      return '';
  }
}

/**
 * Helper function to get delivery status display text
 */
export function getDeliveryStatusText(status: DeliveryStatus): string {
  switch (status) {
    case DeliveryStatus.PENDING:
      return '等待中';
    case DeliveryStatus.DELIVERED:
      return '已投递';
    case DeliveryStatus.ACKED:
      return '已确认';
    case DeliveryStatus.FAILED:
      return '失败';
    case DeliveryStatus.DISCARDED:
      return '已丢弃';
    case DeliveryStatus.QUEUED:
      return '排队中';
    default:
      return '';
  }
}

/**
 * Helper function to check if message is complete
 */
export function isMessageComplete(message: UIMessage): boolean {
  return message.messageStatus === MessageStatus.END;
}

/**
 * Helper function to check if message is streaming
 */
export function isMessageStreaming(message: UIMessage): boolean {
  return message.messageStatus === MessageStatus.START || message.messageStatus === MessageStatus.CHUNK;
}

/**
 * Helper function to check if message has error
 */
export function isMessageError(message: UIMessage): boolean {
  return message.hasError || message.messageStatus === MessageStatus.ERROR;
}

// ========== Message Station API Types (MSAPI v1.1) ==========

/**
 * SSE Connected 事件数据
 * 当 SSE 连接建立时返回
 */
export interface SSEConnectedEvent {
  /** 会话 ID */
  session_id: string;
  /** 最后更新时间（毫秒时间戳） */
  last_update_time: number;
}

/**
 * 历史消息分页响应
 * 从 /msapi/messages 接口返回
 */
export interface MessagesPageResponse {
  /** 消息列表（按 id 倒序，最新的在前） */
  messages: RawMessage[];
  /** 消息总数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页消息数量 */
  page_size: number;
  /** 总页数 */
  total_pages: number;
}

/**
 * 会话时间戳追踪
 * 用于追踪每个会话的最后更新时间
 */
export interface SessionTimestamps {
  /** 会话 ID -> 最后收到的消息的 update_time */
  [sessionId: string]: number;
}
