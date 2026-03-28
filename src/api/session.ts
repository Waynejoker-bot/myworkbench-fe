import { apiClient } from "../lib/api-client";

export interface Session {
  id: number;
  session_id: string;
  agent_id?: string;
  title: string;
  status: 'active' | 'completed' | 'archived';
  deleted: boolean;
  created_at: number;
  updated_at: number;
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
}

export interface SessionMessage {
  id: number;
  session_id: string;
  round_id: string;
  message_id: string;
  source: string;
  target: string;
  seq: number;
  payload: string;
  timestamp: number;
  delivery_status: string;
  ack_status: string | null;
  created_at: number;
}

export interface MessageListResponse {
  messages: SessionMessage[];
  total: number;
}

/**
 * 获取会话列表
 */
export async function getSessions(params?: {
  agent_id?: string;
  agent_ids?: string;  // 逗号分隔的多个 agent_id，如 "agent-a,agent-b,agent-c"
  status?: 'active' | 'completed' | 'archived';
  limit?: number;
  offset?: number;
}): Promise<SessionListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.agent_id) searchParams.set('agent_id', params.agent_id);
  if (params?.agent_ids) searchParams.set('agent_ids', params.agent_ids);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return apiClient.get<SessionListResponse>(`/msapi/sessions${query ? '?' + query : ''}`);
}

/**
 * 获取会话详情
 */
export async function getSession(sessionId: string): Promise<Session> {
  return apiClient.get<Session>(`/msapi/sessions/${sessionId}`);
}

/**
 * 创建会话
 */
export async function createSession(data: {
  session_id: string;
  agent_id?: string;
  title?: string;
}): Promise<Session> {
  return apiClient.post<Session>("/msapi/sessions", data);
}

/**
 * 更新会话状态
 */
export async function updateSessionStatus(
  sessionId: string,
  status: 'active' | 'completed' | 'archived'
): Promise<Session> {
  return apiClient.patch<Session>(`/msapi/sessions/${sessionId}/status?status=${status}`);
}

/**
 * 删除会话（软删除）
 */
export async function deleteSession(sessionId: string): Promise<Session> {
  return apiClient.delete<Session>(`/msapi/sessions/${sessionId}`);
}

/**
 * 获取会话消息列表
 */
export async function getSessionMessages(
  sessionId: string,
  params?: {
    limit?: number;
    offset?: number;
  }
): Promise<MessageListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return apiClient.get<MessageListResponse>(`/msapi/sessions/${sessionId}/messages${query ? '?' + query : ''}`);
}

/**
 * 更新会话标题
 */
export async function updateSessionTitle(
  sessionId: string,
  title: string
): Promise<Session> {
  return apiClient.patch<Session>(`/msapi/sessions/${sessionId}/title`, { title });
}
