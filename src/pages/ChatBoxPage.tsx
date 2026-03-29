import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { useConversations, sortByTimestamp } from "@/hooks/useConversations";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useAgents } from "@/hooks/useAgents";
import { useAuth } from "@/contexts/AuthContext";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput, ChatInputRef } from "@/components/chat/ChatInput";
import { PanelProvider } from "@/contexts/PanelContext";
import { PanelShell } from "@/components/panel/PanelShell";
import { builtinPanels } from "@/components/panel/built-in-panels";
import { AgentAvatar } from "@/components/ui/AgentAvatar";

export default function ChatBoxPage() {
  const { isAuthenticated, needsLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (needsLogin || !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [needsLogin, isAuthenticated, navigate]);

  const [activeConversationId, setActiveConversationId] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const chatInputRef = useRef<ChatInputRef>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Responsive: detect mobile viewport
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const {
    conversations,
    isLoading: isLoadingConversations,
    isCreating,
    createConversation,
    removeConversation,
    updateConversationTitle,
    setConversations,
  } = useConversations();

  const {
    messages,
    uiMessages,
    replyRelations,
    send: sendMessage,
    clear: clearMessages,
    hasMore,
    isLoadingMore,
    loadMore,
    lastMessageSource,
    isGenerating,
    stopGeneration,
  } = useChatMessages(activeConversationId);

  // 前端检测到正在流式输出的 agent IDs
  // 后端 /msapi/channels 状态不可靠，需要前端补偿
  const busyAgentIds = useMemo(() => {
    const ids = new Set<string>();
    if (isGenerating && lastMessageSource && !lastMessageSource.startsWith('user')) {
      ids.add(lastMessageSource);
    }
    return ids;
  }, [isGenerating, lastMessageSource]);

  // 滚动到底部
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    const nearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setIsNearBottom(nearBottom);

    if (scrollTop < 100 && hasMore && !isLoadingMore) {
      const prevScrollHeight = target.scrollHeight;
      loadMore().then(() => {
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      });
    }
  }, [hasMore, isLoadingMore, loadMore]);

  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom('smooth');
    }
  }, [uiMessages, isNearBottom, scrollToBottom]);

  // 发送消息后滚动到底部
  const handleSendMessageWithScroll = useCallback(async (content: string, agentId: string) => {
    setIsNearBottom(true);
    const success = await sendMessage(content, agentId);
    if (success) {
      scrollToBottom('auto');
      // B23/B24: Update conversation's lastMessage preview and timestamp, then re-sort (A2)
      setConversations(prev =>
        sortByTimestamp(
          prev.map(c =>
            c.id === activeConversationId
              ? { ...c, lastMessage: content.slice(0, 50), timestamp: new Date() }
              : c
          )
        )
      );
    }

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    if (success && activeConversation?.title === '新会话') {
      const newTitle = content.slice(0, 20) + (content.length > 20 ? '...' : '');
      await updateConversationTitle(activeConversationId, newTitle);
    }

    return success;
  }, [sendMessage, conversations, activeConversationId, updateConversationTitle, scrollToBottom, setConversations]);

  const {
    agents,
    selectedAgentId,
    selectAgent,
  } = useAgents();

  // 跟踪用户是否手动选择了 Agent
  const userManuallySelectedAgent = useRef(false);

  useEffect(() => {
    if (userManuallySelectedAgent.current) {
      return;
    }

    if (lastMessageSource && !lastMessageSource.startsWith('user')) {
      const agentExists = agents.some(a => a.agent_id === lastMessageSource);
      if (agentExists && lastMessageSource !== selectedAgentId) {
        selectAgent(lastMessageSource);
      }
    }
  }, [lastMessageSource, agents, selectedAgentId, selectAgent]);

  const handleSelectAgent = useCallback((agentId: string) => {
    userManuallySelectedAgent.current = true;
    selectAgent(agentId);
  }, [selectAgent]);

  useEffect(() => {
    userManuallySelectedAgent.current = false;
  }, [activeConversationId]);

  // 将 agents 转换为 agentConfigs Map，用于消息显示
  const agentConfigs = useMemo(() => {
    const map = new Map<string, { name?: string; avatar?: string }>();
    for (const agent of agents) {
      map.set(agent.agent_id, {
        name: agent.name,
        avatar: agent.config?.avatar
      });
    }
    return map;
  }, [agents]);

  // 将 agents 转换为 Map，用于会话列表显示
  const agentsMap = useMemo(() => {
    const map = new Map<string, typeof agents[0]>();
    for (const agent of agents) {
      map.set(agent.agent_id, agent);
    }
    return map;
  }, [agents]);

  // A3: Populate lastMessage preview from loaded messages for the active conversation
  useEffect(() => {
    if (uiMessages.length > 0 && activeConversationId) {
      const lastMsg = uiMessages[uiMessages.length - 1];
      if (lastMsg) {
        const preview = lastMsg.content?.slice(0, 50) || '';
        if (preview) {
          setConversations(prev => prev.map(c =>
            c.id === activeConversationId && !c.lastMessage
              ? { ...c, lastMessage: preview }
              : c
          ));
        }
      }
    }
  }, [uiMessages, activeConversationId, setConversations]);

  // Cmd+N / Ctrl+N shortcut for new conversation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        // Trigger the new conversation flow
        // The actual agent popup is in ChatSidebar; a ref/callback bridge would be needed
        // to programmatically open the agent-selection popup from here.
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // No auto-create: user must click "新建对话" and select an Agent

  // Select first conversation when loading completes
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      const first = conversations[0];
      if (first) {
        setActiveConversationId(first.id);
      }
    }
  }, [conversations, activeConversationId]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    // Clear unread count for selected conversation
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, unreadCount: 0 } : c
    ));
    // Auto-select the conversation's bound agent
    const conv = conversations.find(c => c.id === id);
    if (conv?.agentId) {
      selectAgent(conv.agentId);
      userManuallySelectedAgent.current = false;
    }
  };

  const handleDeleteConversation = async (id: string) => {
    const success = await removeConversation(id);
    if (success && activeConversationId === id) {
      clearMessages();
      const remaining = conversations.filter(c => c.id !== id);
      if (remaining.length > 0) {
        const next = remaining[0];
        if (next) {
          setActiveConversationId(next.id);
        }
      } else {
        setActiveConversationId("");
      }
    }
    return success;
  };

  const handleCreateConversation = async (agentId: string) => {
    const newConv = await createConversation(agentId);
    if (newConv) {
      setActiveConversationId(newConv.id);
      // Sync the selected agent so messages go to the right target
      if (agentId) {
        selectAgent(agentId);
        userManuallySelectedAgent.current = true;
      }
    }
  };

  if (isMobile) {
    return (
      <PanelProvider>
        <MobileLayout
          conversations={conversations}
          activeConversationId={activeConversationId}
          isLoadingConversations={isLoadingConversations}
          isCreating={isCreating}
          agents={agents}
          agentsMap={agentsMap}
          agentConfigs={agentConfigs}
          selectedAgentId={selectedAgentId}
          messages={messages}
          uiMessages={uiMessages}
          replyRelations={replyRelations}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          isNearBottom={isNearBottom}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onCreateConversation={handleCreateConversation}
          onSendMessage={handleSendMessageWithScroll}
          onSelectAgent={handleSelectAgent}
          onScroll={handleScroll}
          scrollToBottom={scrollToBottom}
          isGenerating={isGenerating}
          onStop={stopGeneration}
        />
      </PanelProvider>
    );
  }

  return (
    <PanelProvider>
      <div className="bg-card" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {/* Sidebar */}
          <ChatSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            isLoading={isLoadingConversations}
            isCreating={isCreating}
            sidebarCollapsed={sidebarCollapsed}
            agents={agentsMap}
            onSetSidebarCollapsed={setSidebarCollapsed}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onUpdateTitle={updateConversationTitle}
            onCreateConversation={handleCreateConversation}
          />

          {/* Center - Chat Area */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-card">
            {/* Chat top bar - current Agent info */}
            {activeConversationId && (
              <div className="border-b border-border bg-muted shrink-0" style={{
                padding: '0 24px',
                height: 56,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <AgentAvatar
                  agentId={selectedAgentId}
                  avatar={agentConfigs.get(selectedAgentId)?.avatar}
                  size={32}
                />
                <div>
                  <div className="text-foreground" style={{ fontWeight: 600, fontSize: 14 }}>
                    {agentConfigs.get(selectedAgentId)?.name || selectedAgentId || '选择 Agent'}
                  </div>
                  <div className="text-muted-foreground" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="bg-success inline-block rounded-full" style={{ width: 6, height: 6 }} />
                    在线
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 relative overflow-hidden">
              <div
                ref={messagesContainerRef}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden px-6 py-4"
                onScroll={handleScroll}
              >
                {isLoadingMore && (
                  <div className="text-center py-2 text-sm text-muted-foreground">
                    加载更多...
                  </div>
                )}
                <ChatMessages
                  messages={messages}
                  uiMessages={uiMessages}
                  replyRelations={replyRelations}
                  agentConfigs={agentConfigs}
                />
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to bottom button */}
              {!isNearBottom && uiMessages.length > 0 && (
                <button
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-20 right-8 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-opacity z-10 hover:opacity-90 bg-primary"
                  title="滚动到底部"
                >
                  <ChevronDown className="h-5 w-5 text-white" />
                </button>
              )}
            </div>

            {/* Input Area */}
            <ChatInput
              ref={chatInputRef}
              onSend={handleSendMessageWithScroll}
              disabled={!activeConversationId}
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSelectAgent={handleSelectAgent}
              isGenerating={isGenerating}
              onStop={stopGeneration}
            />
          </main>

          {/* Right Panel */}
          <PanelShell
            tabs={builtinPanels}
            sessionId={activeConversationId}
            agentId={selectedAgentId}
            onCreateConversation={handleCreateConversation}
            onSelectSession={handleSelectConversation}
            busyAgentIds={busyAgentIds}
          />
        </div>
      </div>
    </PanelProvider>
  );
}
