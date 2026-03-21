interface SendMessageParams {
  session_id: string;
  round_id: string;
  message_id: string;
  source: string;
  target: string;
  payload: string;
  seq?: number;
  status?: number;
  context?: Record<string, unknown>;
}

interface SendMessageResponse {
  success: boolean;
  message_id: string;
  code?: string;
  message?: string;
  channel_status?: string;
}

/**
 * Custom error class for send message errors
 */
export class SendMessageError extends Error {
  code?: string;
  channelStatus?: string;

  constructor(message: string, code?: string, channelStatus?: string) {
    super(message);
    this.name = 'SendMessageError';
    this.code = code;
    this.channelStatus = channelStatus;
  }

  /**
   * Check if the error is because agent is busy
   */
  isAgentBusy(): boolean {
    return this.code === 'AGENT_BUSY' ||
           this.code === 'MS_ERR_0103' ||
           this.channelStatus === 'BUSY' ||
           this.channelStatus === 'SESSION_BUSY' ||
           this.message.includes('busy') ||
           this.message.includes('BUSY');
  }
}

export interface PollMessage {
  id: number;
  message_id: string;
  session_id: string;
  round_id: string;
  payload: string;
  source: string;
  target: string;
  status: number;
  seq: number;
  timestamp: number;
  context?: Record<string, unknown>;
  delivery_status: string;
  error_code?: string;
  error_message?: string;
  /** 更新时间（毫秒时间戳） */
  update_time: number;
}

type MessageCallback = (message: PollMessage) => void;
type ErrorCallback = (error: Error) => void;

/**
 * SSE Connected 事件数据
 */
export interface SSEConnectedData {
  /** 会话 ID */
  session_id: string;
  /** 最后更新时间（毫秒时间戳） */
  last_update_time: number;
}

/** Connected 事件回调 */
type ConnectedCallback = (data: SSEConnectedData) => void;

/**
 * Payload 数据结构
 */
interface PayloadItem {
  itemType: string;
  text?: string;
  toolItem?: {
    name: string;
    arguments: Record<string, unknown>;
    result: string;
  };
  image?: string;
  audio?: string;
  video?: string;
}

interface Payload {
  type: string;
  data: PayloadItem[];
}

/**
 * 将文本转换为 payload JSON 字符串格式
 */
export function textToPayload(text: string): string {
  const payload: Payload = {
    type: "text",
    data: [
      {
        itemType: "text",
        text: text
      }
    ]
  };
  return JSON.stringify(payload);
}

/**
 * 从 payload JSON 字符串中提取文本内容
 */
export function payloadToText(payloadString: string): string {
  try {
    const payload: Payload = JSON.parse(payloadString);

    // 处理文本类型
    if (payload.type === "text" && payload.data) {
      return payload.data
        .filter(item => item.itemType === "text" && item.text)
        .map(item => item.text!)
        .join("");
    }

    // 其他类型可以返回 JSON 字符串或特定格式
    return payloadString;
  } catch {
    // 如果解析失败，直接返回原始字符串
    return payloadString;
  }
}

let eventSource: EventSource | null = null;

/**
 * 发送消息
 */
export async function sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
  const response = await fetch('/msapi/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: params.session_id,
      round_id: params.round_id,
      message_id: params.message_id,
      source: params.source,
      target: params.target,
      payload: params.payload,
      seq: params.seq ?? 0,
      status: params.status ?? 1,
      context: params.context ?? {},
      timestamp: Date.now()
    })
  });

  if (!response.ok) {
    throw new SendMessageError(`HTTP error: ${response.statusText}`);
  }

  const data = await response.json() as SendMessageResponse;
  if (!data.success) {
    const errorMsg = data.message || data.code || 'Unknown error';
    throw new SendMessageError(errorMsg, data.code, data.channel_status);
  }

  return data;
}

/**
 * 生成消息 ID
 * @param sessionId 会话 ID
 */
export function generateMessageId(sessionId: string): string {
  const sessionSuffix = sessionId.slice(-4);
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `m-${sessionSuffix}${timestamp}${random}`;
}

/**
 * 开始轮询消息 (SSE)
 * @param sessionId 会话ID
 * @param lastUpdateTime 起始更新时间（毫秒时间戳）
 * @param onMessage 收到消息时的回调
 * @param onConnected 连接成功时的回调
 * @param onError 发生错误时的回调
 */
export function startPolling(
  sessionId: string,
  lastUpdateTime: number,
  onMessage: MessageCallback,
  onConnected?: ConnectedCallback,
  onError?: ErrorCallback
): () => void {
  // 先关闭之前的连接
  stopPolling();

  // 使用相对路径，自动使用当前域名
  const url = `/msapi/poll-message?session_id=${sessionId}&last_update_time=${lastUpdateTime}`;
  console.log('[SSE] Starting poll for session:', sessionId, 'last_update_time:', lastUpdateTime, 'URL:', url);

  eventSource = new EventSource(url);

  // 监听 connected 事件
  eventSource.addEventListener('connected', (event) => {
    console.log('[SSE] Connected:', event.data);
    try {
      const data: SSEConnectedData = JSON.parse(event.data);
      onConnected?.(data);
    } catch (err) {
      console.error('[SSE] Failed to parse connected event:', err);
    }
  });

  // 监听 message 事件
  eventSource.addEventListener('message', (event) => {
    console.log('[SSE] Message received:', event.data);
    try {
      const data: PollMessage = JSON.parse(event.data);
      onMessage(data);
    } catch (err) {
      console.error('Failed to parse SSE message:', err);
      onError?.(err as Error);
    }
  });

  eventSource.onerror = (err) => {
    console.error('[SSE] Connection error:', err);
    console.error('[SSE] ReadyState:', eventSource?.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSED)');
    onError?.(new Error('SSE connection error'));
  };

  // 返回清理函数
  return stopPolling;
}

/**
 * 停止轮询消息
 */
export function stopPolling() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

/**
 * 检查是否正在轮询
 */
export function isPolling(): boolean {
  return eventSource !== null && eventSource.readyState === EventSource.OPEN;
}
