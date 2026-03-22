import { apiClient } from "../lib/api-client";

export interface AgentConfig {
  avatar?: string;
  description?: string;
  tag?: string;
  category?: string;
  [key: string]: unknown;
}

export interface Agent {
  agent_id: string;
  name: string;
  prompt?: string;
  llm_provider?: string;
  llm_model?: string;
  max_rounds?: number;
  cwd?: string;
  tools?: string[];
  options?: Record<string, unknown>;
  config?: AgentConfig;
  enabled?: boolean;
  status?: string;
}

export interface AgentListResponse {
  agents: Agent[];
}

/**
 * Channel 类型定义 - 来自 /msapi/channels 接口
 */
export interface Channel {
  channel_id: string;
  status: string;
  current_session_id?: string;
  callback_url?: string;
  batch_size: number;
  created_at: number;
  updated_at: number;
  agent_name: string;
  avatar?: string;
  description?: string;
}

export interface ChannelListResponse {
  channels: Channel[];
  total: number;
}

/**
 * 将 Channel 转换为 Agent 格式
 * 用于兼容现有使用 Agent 类型的组件
 */
export function channelToAgent(channel: Channel): Agent {
  return {
    agent_id: channel.channel_id,
    name: channel.agent_name || channel.channel_id,
    config: {
      avatar: channel.avatar,
      description: channel.description,
    },
    enabled: channel.status !== "OFFLINE",
    status: channel.status,
  };
}

/**
 * 获取所有 Channel（推荐使用）
 * 返回的 Channel 会被转换为 Agent 格式以兼容现有代码
 */
export async function getChannels(): Promise<AgentListResponse> {
  const response = await apiClient.get<ChannelListResponse>("/msapi/channels");
  return {
    agents: response.channels.map(channelToAgent),
  };
}

/**
 * 获取所有 Agent
 * @deprecated 请使用 getChannels() 代替
 */
export async function getAgents(): Promise<AgentListResponse> {
  return apiClient.get<AgentListResponse>("/api/agents");
}

/**
 * 获取 Agent 详情
 */
export async function getAgent(agentId: string): Promise<Agent> {
  return apiClient.get<Agent>(`/api/agents/${agentId}`);
}

/**
 * 创建 Channel
 */
export async function createChannel(data: {
  agent_id: string;
  name: string;
  description?: string;
  llm_model?: string;
  cwd?: string;
  tools?: string[];
}): Promise<Agent> {
  return apiClient.post<Agent>('/msapi/channels', data);
}

/**
 * 更新 Channel
 */
export async function updateChannel(agentId: string, data: {
  name?: string;
  description?: string;
  prompt?: string;
  llm_model?: string;
  cwd?: string;
  tools?: string[];
  enabled?: boolean;
}): Promise<Agent> {
  return apiClient.patch<Agent>(`/msapi/channels/${agentId}`, data);
}

/**
 * 删除 Channel
 */
export async function deleteChannel(agentId: string): Promise<void> {
  return apiClient.delete<void>(`/msapi/channels/${agentId}`);
}
