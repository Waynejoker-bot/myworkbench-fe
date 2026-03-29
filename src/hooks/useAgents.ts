import { useState, useEffect, useCallback, useRef } from "react";
import { getAgents, getChannels, type Agent } from "@/api/agent";

const POLL_INTERVAL = 15_000; // 15秒轮询一次状态

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const initialLoadDone = useRef(false);

  const fetchAgents = useCallback(async () => {
    try {
      if (!initialLoadDone.current) {
        setIsLoading(true);
      }

      // 同时请求两个接口
      const [agentsResponse, channelsResponse] = await Promise.all([
        getAgents(),      // /api/agents - 有权限控制
        getChannels(),    // /msapi/channels - 包含状态信息
      ]);

      // 使用 /api/agents 的数据作为主数据源（已有权限控制）
      const authorizedAgents = agentsResponse.agents;

      // 将 /msapi/channels 的状态信息合并到 agent 数据中
      const mergedAgents = authorizedAgents.map(agent => {
        // 从 channels 中查找对应的状态信息
        const channel = channelsResponse.agents.find(
          ch => ch.agent_id === agent.agent_id
        );

        // 如果找到对应的 channel，合并状态信息
        if (channel) {
          return {
            ...agent,
            status: channel.status,  // 使用 channel 的实时状态
            config: {
              ...agent.config,
              ...channel.config,  // 合并 channel 的 avatar、description 等
            },
          };
        }

        // 没有找到对应的 channel，保持原样
        return agent;
      });

      // 按 agent_id 排序，保证列表顺序稳定
      const sortedAgents = [...mergedAgents].sort((a, b) =>
        a.agent_id.localeCompare(b.agent_id)
      );
      setAgents(sortedAgents);

      // 只在首次加载时设置默认选中
      if (!initialLoadDone.current) {
        const enabledAgents = sortedAgents.filter(a => a.enabled !== false);
        if (enabledAgents.length > 0) {
          const firstEnabled = enabledAgents[0];
          if (firstEnabled) {
            setSelectedAgentId(firstEnabled.agent_id);
          }
        } else if (sortedAgents.length > 0) {
          const firstAgent = sortedAgents[0];
          if (firstAgent) {
            setSelectedAgentId(firstAgent.agent_id);
          }
        }
        initialLoadDone.current = true;
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const selectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
  }, []);

  const getSelectedAgent = useCallback((): Agent | null => {
    return agents.find(a => a.agent_id === selectedAgentId) || null;
  }, [agents, selectedAgentId]);

  return {
    agents,
    isLoading,
    selectedAgentId,
    selectAgent,
    getSelectedAgent,
    refresh: fetchAgents,
  };
}
