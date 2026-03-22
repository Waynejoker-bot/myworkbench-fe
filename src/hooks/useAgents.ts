import { useState, useEffect, useCallback, useRef } from "react";
import { getChannels, type Agent } from "@/api/agent";

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
      const response = await getChannels();

      // 按 agent_id 排序，保证列表顺序稳定
      const sortedAgents = [...response.agents].sort((a, b) =>
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
