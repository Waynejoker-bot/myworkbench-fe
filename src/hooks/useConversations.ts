import { useState, useEffect, useCallback } from "react";
import { getSessions, createSession, deleteSession, updateSessionTitle } from "@/api/session";

const DEFAULT_TITLE = "新会话";

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  unread: boolean;
  status: 'active' | 'completed' | 'archived';
  agentId?: string;  // 关联的 Agent ID
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // 加载会话列表
  useEffect(() => {
    let isMounted = true;

    const loadSessions = async () => {
      try {
        setIsLoading(true);
        const response = await getSessions();
        const sessionList: Conversation[] = response.sessions.map(session => ({
          id: session.session_id,
          title: session.title || session.session_id,
          lastMessage: "",
          timestamp: new Date(session.updated_at),
          unread: session.status === 'active',
          status: session.status,
          agentId: session.agent_id,
        }));

        if (isMounted) {
          setConversations(sessionList);
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
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
  }, []);

  // 创建新会话
  const createConversation = useCallback(async () => {
    if (isCreating) return null;

    setIsCreating(true);

    try {
      const sessionId = `s-${Math.floor(Date.now() / 1000)}`;
      const response = await createSession({
        session_id: sessionId,
        agent_id: "",
        title: DEFAULT_TITLE
      });

      const newConversation: Conversation = {
        id: response.session_id,
        title: response.title || DEFAULT_TITLE,
        lastMessage: "",
        timestamp: new Date(response.created_at),
        unread: false,
        status: response.status,
        agentId: response.agent_id,
      };

      // 先更新本地状态以提供即时反馈
      setConversations(prev => [newConversation, ...prev]);

      // 然后从服务器刷新列表以确保数据同步
      try {
        const refreshResponse = await getSessions();
        const sessionList: Conversation[] = refreshResponse.sessions.map(session => ({
          id: session.session_id,
          title: session.title || session.session_id,
          lastMessage: "",
          timestamp: new Date(session.updated_at),
          unread: session.status === 'active',
          status: session.status,
          agentId: session.agent_id,
        }));
        setConversations(sessionList);
      } catch (refreshError) {
        // 刷新失败不影响创建结果，本地状态已更新
        console.error('Failed to refresh sessions after creation:', refreshError);
      }

      return newConversation;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [isCreating]);

  // 删除会话
  const removeConversation = useCallback(async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setConversations(prev => prev.filter(c => c.id !== sessionId));
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }, []);

  // 更新会话标题
  const updateConversationTitle = useCallback(async (sessionId: string, title: string) => {
    try {
      const response = await updateSessionTitle(sessionId, title);
      setConversations(prev =>
        prev.map(c => c.id === sessionId ? { ...c, title: response.title || title } : c)
      );
      return true;
    } catch (error) {
      console.error('Failed to update session title:', error);
      return false;
    }
  }, []);

  // 刷新会话列表
  const refreshConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getSessions();
      const sessionList: Conversation[] = response.sessions.map(session => ({
        id: session.session_id,
        title: session.title || session.session_id,
        lastMessage: "",
        timestamp: new Date(session.updated_at),
        unread: session.status === 'active',
        status: session.status,
        agentId: session.agent_id,
      }));
      setConversations(sessionList);
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
