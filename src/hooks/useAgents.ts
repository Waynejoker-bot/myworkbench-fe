import { useState, useEffect, useCallback } from "react";
import { getChannels, type Agent } from "@/api/agent";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const fetchAgents = async () => {
      try {
        setIsLoading(true);
        const response = await getChannels();

        if (!mounted) return;

        // 按 agent_id 排序，保证列表顺序稳定
        const sortedAgents = [...response.agents].sort((a, b) =>
          a.agent_id.localeCompare(b.agent_id)
        );
        setAgents(sortedAgents);

        // 默认选择第一个启用的 agent
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
      } catch (error) {
        console.error('Failed to load agents:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAgents();

    return () => {
      mounted = false;
    };
  }, []);

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
  };
}
