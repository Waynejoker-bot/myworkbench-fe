/**
 * UUID Generator
 * 生成唯一标识符
 */

/**
 * 生成 UUID v4
 * @returns UUID 字符串
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成短 ID（8 字符）
 * @returns 短 ID 字符串
 */
export function shortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * 生成组件 ID 前缀
 * @param prefix 前缀
 * @returns 带前缀的 ID
 */
export function componentId(prefix: string = 'comp'): string {
  return `${prefix}-${shortId()}`;
}

/**
 * 生成会话 ID
 * @returns 会话 ID
 */
export function sessionId(): string {
  return `session-${uuid()}`;
}

/**
 * 生成消息 ID
 * @returns 消息 ID
 */
export function messageId(): string {
  return `msg-${uuid()}`;
}
