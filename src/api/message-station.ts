/**
 * Message Station API 封装
 * 处理与消息队列服务的所有交互
 */

import type { MessagesPageResponse } from '@/workbench/types/message-station';

const MSAPI_BASE = '/msapi';

/**
 * 获取历史消息（分页）
 * @param sessionId 会话 ID
 * @param page 页码（从 1 开始）
 * @param pageSize 每页消息数量（最大 1000）
 */
export async function getMessages(
  sessionId: string,
  page = 1,
  pageSize = 200
): Promise<MessagesPageResponse> {
  const params = new URLSearchParams({
    session_id: sessionId,
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  const response = await fetch(`${MSAPI_BASE}/messages?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 提取消息列表中最晚的 update_time
 * @param messages 消息列表
 * @returns 最晚的 update_time，如果没有消息则返回 0
 */
export function extractLatestUpdateTime(messages: Array<{ update_time?: number }>): number {
  if (!messages || messages.length === 0) {
    return 0;
  }

  const times = messages
    .map(m => m.update_time)
    .filter((t): t is number => t !== undefined && t !== null);

  return times.length > 0 ? Math.max(...times) : 0;
}
