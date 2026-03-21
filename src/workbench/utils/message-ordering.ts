/**
 * 消息排序工具
 *
 * 确保消息按照正确的时间顺序渲染：
 * - 旧消息在前（时间戳小的在前）
 * - 新消息在后（时间戳大的在后）
 */

import { UIMessage } from '../types/message-station';

/**
 * 按时间戳升序排序消息（旧消息在前，新消息在后）
 *
 * @param messages - 消息数组
 * @returns 排序后的消息数组
 */
export function sortMessagesByTime(messages: UIMessage[]): UIMessage[] {
  return [...messages].sort((a, b) => {
    // 首先比较开始时间
    const timeCompare = a.startTime - b.startTime;
    if (timeCompare !== 0) {
      return timeCompare;
    }

    // 如果开始时间相同，比较消息 ID（假设 ID 有序）
    return a.id.localeCompare(b.id);
  });
}

/**
 * 按时间戳降序排序消息（新消息在前，旧消息在后）
 * 用于显示"最新消息"列表等场景
 *
 * @param messages - 消息数组
 * @returns 排序后的消息数组
 */
export function sortMessagesByTimeDesc(messages: UIMessage[]): UIMessage[] {
  return [...messages].sort((a, b) => {
    // 首先比较开始时间（降序）
    const timeCompare = b.startTime - a.startTime;
    if (timeCompare !== 0) {
      return timeCompare;
    }

    // 如果开始时间相同，比较消息 ID（降序）
    return b.id.localeCompare(a.id);
  });
}

/**
 * 检查消息数组是否已按时间升序排序
 *
 * @param messages - 消息数组
 * @returns 是否已排序
 */
export function isMessagesSorted(messages: UIMessage[]): boolean {
  for (let i = 1; i < messages.length; i++) {
    const prevMsg = messages[i - 1];
    const currMsg = messages[i];
    if (prevMsg && currMsg && prevMsg.startTime > currMsg.startTime) {
      return false;
    }
  }
  return true;
}

/**
 * 确保消息按时间升序排序（仅在未排序时才排序）
 *
 * @param messages - 消息数组
 * @returns 排序后的消息数组（如果已排序则返回原数组）
 */
export function ensureMessagesSorted(messages: UIMessage[]): UIMessage[] {
  if (isMessagesSorted(messages)) {
    return messages;
  }
  return sortMessagesByTime(messages);
}

/**
 * 插入新消息到已排序的消息列表中，保持排序状态
 *
 * @param messages - 已排序的消息数组（升序）
 * @param newMessage - 要插入的新消息
 * @returns 插入新消息后的排序数组
 */
export function insertMessageSorted(messages: UIMessage[], newMessage: UIMessage): UIMessage[] {
  // 使用二分查找找到插入位置
  let left = 0;
  let right = messages.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const midMsg = messages[mid];
    if (midMsg && midMsg.startTime < newMessage.startTime) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  // 插入新消息
  const result = [...messages];
  result.splice(left, 0, newMessage);
  return result;
}

/**
 * 获取消息的时间范围
 *
 * @param messages - 消息数组
 * @returns 包含最早和最晚消息时间戳的对象
 */
export function getMessageTimeRange(messages: UIMessage[]): {
  earliest: number | undefined;
  latest: number | undefined;
} {
  if (messages.length === 0) {
    return { earliest: undefined, latest: undefined };
  }

  let earliest: number | undefined = messages[0]?.startTime;
  let latest: number | undefined = messages[0]?.startTime;

  for (const message of messages) {
    if (message.startTime < (earliest ?? Infinity)) {
      earliest = message.startTime;
    }
    if (message.startTime > (latest ?? -Infinity)) {
      latest = message.startTime;
    }
  }

  return { earliest, latest };
}

/**
 * 按时间范围过滤消息
 *
 * @param messages - 消息数组
 * @param startTime - 开始时间戳（可选）
 * @param endTime - 结束时间戳（可选）
 * @returns 过滤后的消息数组
 */
export function filterMessagesByTimeRange(
  messages: UIMessage[],
  startTime?: number,
  endTime?: number
): UIMessage[] {
  return messages.filter(message => {
    if (startTime !== undefined && message.startTime < startTime) {
      return false;
    }
    if (endTime !== undefined && message.startTime > endTime) {
      return false;
    }
    return true;
  });
}

/**
 * 将消息按时间分组（例如按天、按小时）
 *
 * @param messages - 消息数组
 * @param groupBy - 分组函数，接收时间戳返回分组键
 * @returns 分组后的消息映射
 */
export function groupMessagesByTime(
  messages: UIMessage[],
  groupBy: (timestamp: number) => string
): Map<string, UIMessage[]> {
  const groups = new Map<string, UIMessage[]>();

  for (const message of messages) {
    const key = groupBy(message.startTime);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(message);
  }

  return groups;
}

/**
 * 按天分组消息
 *
 * @param messages - 消息数组
 * @returns 按天分组的消息映射
 */
export function groupMessagesByDay(messages: UIMessage[]): Map<string, UIMessage[]> {
  return groupMessagesByTime(messages, timestamp => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
}
