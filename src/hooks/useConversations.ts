import { useState, useEffect, useCallback } from "react";
import { getSessions, createSession, deleteSession, updateSessionTitle } from "@/api/session";
import { getChannels } from "@/api/agent";
import { useToast } from "@/contexts/ToastContext";

const DEFAULT_TITLE = "新会话";

/**
 * Parse API timestamp to Date.
 * The API returns timestamps in YYYYMMDDHHmmss format (e.g., 20260322183652)
 * or as Unix seconds/milliseconds. Handle all cases.
 */
function parseTimestamp(ts: number): Date {
  if (!ts || ts === 0) return new Date(0); // epoch for missing timestamps, will sort to bottom

  const str = String(ts);
  // YYYYMMDDHHmmss format (14 digits like 20260322183652)
  if (str.length === 14) {
    const year = str.slice(0, 4);
    const month = str.slice(4, 6);
    const day = str.slice(6, 8);
    const hour = str.slice(8, 10);
    const min = str.slice(10, 12);
    const sec = str.slice(12, 14);
    return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
  }

  // Unix seconds (10 digits)
  if (str.length <= 10) {
    return new Date(ts * 1000);
  }

  // Unix milliseconds (13 digits)
  return new Date(ts);
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;       // preview text from latest message
  timestamp: Date;
  unreadCount: number;        // number of unread messages
  // A4 Note: Real unread tracking requires server-side support (unread_count in session API)
  // or per-session SSE connections. Currently stays 0 until the backend provides unread data.
  // When the backend adds unread_count to the session API response, wire it into loadSessions.
  status: 'active' | 'completed' | 'archived';
  agentId?: string;           // 关联的 Agent ID
  agentIds?: string[];        // for multi-agent conversations
}

// Sort conversations by timestamp descending (newest first)
export function sortByTimestamp(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();

  // 加载会话列表
  useEffect(() => {
    let isMounted = true;

    const loadSessions = async () => {
      try {
        setIsLoading(true);

        // 获取所有 channels（不受用户权限限制，管理员可看到全部 Agent 的会话）
        const channelsResponse = await getChannels();
        const agentIds = channelsResponse.agents.map(agent => agent.agent_id).join(',');

        // 获取这些 agents 对应的 sessions（只有当有 agents 时才传 agent_ids）
        const response = await getSessions(
          agentIds ? { agent_ids: agentIds } : undefined
        );
        const sessionList: Conversation[] = response.sessions.map(session => ({
          id: session.session_id,
          title: session.title || session.session_id,
          lastMessage: "",
          timestamp: parseTimestamp(session.updated_at),
          unreadCount: 0,
          status: session.status,
          agentId: session.agent_id,
        }));

        if (isMounted) {
          setConversations(sortByTimestamp(sessionList));
        }
      } catch (error) {
        showToast('加载会话列表失败，请稍后重试', 'error');
        void error;
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSessions();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 创建新会话
  const createConversation = useCallback(async (agentId: string) => {
    if (isCreating) return null;

    setIsCreating(true);

    try {
      const sessionId = `s-${Math.floor(Date.now() / 1000)}`;
      const response = await createSession({
        session_id: sessionId,
        agent_id: agentId,
        title: DEFAULT_TITLE
      });

      const newConversation: Conversation = {
        id: response.session_id,
        title: response.title || DEFAULT_TITLE,
        lastMessage: "",
        // 新创建的会话用当前时间（后端返回 created_at=0）
        timestamp: new Date(),
        unreadCount: 0,
        status: response.status,
        agentId: response.agent_id,
      };

      // 立即更新本地状态，新会话排在最前面
      setConversations(prev => [newConversation, ...prev]);

      return newConversation;
    } catch (error) {
      showToast('创建会话失败，请稍后重试', 'error');
      void error;
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, showToast]);

  // 删除会话
  const removeConversation = useCallback(async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setConversations(prev => prev.filter(c => c.id !== sessionId));
      return true;
    } catch (error) {
      showToast('删除会话失败，请稍后重试', 'error');
      void error;
      return false;
    }
  }, [showToast]);

  // 更新会话标题
  const updateConversationTitle = useCallback(async (sessionId: string, title: string) => {
    try {
      const response = await updateSessionTitle(sessionId, title);
      setConversations(prev =>
        prev.map(c => c.id === sessionId ? { ...c, title: response.title || title } : c)
      );
      return true;
    } catch (error) {
      showToast('更新会话标题失败，请稍后重试', 'error');
      void error;
      return false;
    }
  }, [showToast]);

  // 刷新会话列表（内部实现，支持 silent 模式）
  const refreshConversationsInternal = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      // 获取所有 channels（不受用户权限限制，管理员可看到全部 Agent 的会话）
      const channelsResponse = await getChannels();
      const agentIds = channelsResponse.agents.map(agent => agent.agent_id).join(',');

      // 获取这些 agents 对应的 sessions（只有当有 agents 时才传 agent_ids）
      const response = await getSessions(
        agentIds ? { agent_ids: agentIds } : undefined
      );
      const sessionList: Conversation[] = response.sessions.map(session => ({
        id: session.session_id,
        title: session.title || session.session_id,
        lastMessage: "",
        timestamp: parseTimestamp(session.updated_at),
        unreadCount: 0,
        status: session.status,
        agentId: session.agent_id,
      }));
      setConversations(sortByTimestamp(sessionList));
    } catch (error) {
      if (!silent) showToast('刷新会话列表失败，请稍后重试', 'error');
      void error;
    } finally {
      if (!silent) setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 刷新会话列表（公开接口，保留原行为）
  const refreshConversations = useCallback(async () => {
    await refreshConversationsInternal(false);
  }, [refreshConversationsInternal]);

  // 定期轮询刷新会话列表（silent 模式，不显示 loading，不打扰用户）
  useEffect(() => {
    const interval = setInterval(() => {
      refreshConversationsInternal(true);
    }, 10000); // 每 10 秒轮询一次

    return () => clearInterval(interval);
  }, [refreshConversationsInternal]);

  return {
    conversations,
    isLoading,
    isCreating,
    createConversation,
    removeConversation,
    updateConversationTitle,
    refreshConversations,
    setConversations,
  };
}
