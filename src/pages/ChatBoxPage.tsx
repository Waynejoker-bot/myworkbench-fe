import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PanelRightOpen } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useAgents } from "@/hooks/useAgents";
import { useAuth } from "@/contexts/AuthContext";
import { LoginDialog } from "@/components/LoginDialog";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput, ChatInputRef } from "@/components/chat/ChatInput";
import { WorkbenchAppWrapper } from "@/workbench/components";
import type { WorkbenchAppWrapperRef, InputAPI } from "@/workbench/components";
import type { HostConfig, SessionAPI } from "@/workbench";
import type { Session } from "@/workbench/types/common";

const COLLAPSED_WIDTH = 40; // 折叠后的宽度（显示一个图标）

export default function ChatBoxPage() {
  const { isAuthenticated, needsLogin } = useAuth();

  // 未登录或需要重新登录时显示登录对话框
  if (!isAuthenticated || needsLogin) {
    return <LoginDialog />;
  }
  const [activeConversationId, setActiveConversationId] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(560);
  const [isDragging, setIsDragging] = useState(false);
  const [showWorkbench, setShowWorkbench] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true); // 跟踪用户是否在底部
  const [isWorkbenchFullscreen, setIsWorkbenchFullscreen] = useState(false); // 全屏模式状态
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(560);
  const workbenchRef = useRef<WorkbenchAppWrapperRef>(null);
  const chatInputRef = useRef<ChatInputRef>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    isLoading: isLoadingConversations,
    isCreating,
    createConversation,
    removeConversation,
    updateConversationTitle,
    refreshConversations,
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
  } = useChatMessages(activeConversationId);

  // 滚动到底部
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    // 更新是否在底部附近的状态（距离底部 150px 以内）
    const nearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setIsNearBottom(nearBottom);

    // 当滚动到顶部附近时（距离顶部小于 100px），加载更多
    if (scrollTop < 100 && hasMore && !isLoadingMore) {
      const prevScrollHeight = target.scrollHeight;
      loadMore().then(() => {
        // 加载完成后，恢复滚动位置（防止跳动）
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      });
    }
  }, [hasMore, isLoadingMore, loadMore]);

  // 只在用户在底部附近时才自动滚动
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom('smooth');
    }
  }, [uiMessages, isNearBottom, scrollToBottom]);

  // 发送消息后滚动到底部
  const handleSendMessageWithScroll = useCallback(async (content: string, agentId: string) => {
    setIsNearBottom(true); // 发送消息时重置状态
    const success = await sendMessage(content, agentId);
    if (success) {
      scrollToBottom('auto');
    }

    // 如果发送成功且当前会话标题是"新会话"，则更新标题
    const activeConversation = conversations.find(c => c.id === activeConversationId);
    if (success && activeConversation?.title === '新会话') {
      const newTitle = content.slice(0, 20) + (content.length > 20 ? '...' : '');
      await updateConversationTitle(activeConversationId, newTitle);
    }

    return success;
  }, [sendMessage, conversations, activeConversationId, updateConversationTitle, scrollToBottom]);

  const {
    agents,
    selectedAgentId,
    selectAgent,
  } = useAgents();

  // 跟踪用户是否手动选择了 Agent
  const userManuallySelectedAgent = useRef(false);

  // Auto-select agent based on last message source
  // When loading session or receiving new messages, set agent to the last message's source
  // Only do this if user hasn't manually selected an agent
  useEffect(() => {
    // 如果用户手动选择了 Agent，不再自动切换
    if (userManuallySelectedAgent.current) {
      return;
    }

    if (lastMessageSource && !lastMessageSource.startsWith('user')) {
      // Check if this agent exists in our agent list
      const agentExists = agents.some(a => a.agent_id === lastMessageSource);
      if (agentExists && lastMessageSource !== selectedAgentId) {
        selectAgent(lastMessageSource);
      }
    }
  }, [lastMessageSource, agents, selectedAgentId, selectAgent]);

  // 包装 selectAgent，标记用户手动选择
  const handleSelectAgent = useCallback((agentId: string) => {
    userManuallySelectedAgent.current = true;
    selectAgent(agentId);
  }, [selectAgent]);

  // 当切换会话时，重置手动选择标志
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

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = rightPanelWidth;
    e.preventDefault();
  }, [rightPanelWidth]);

  // Handle drag move and end
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = dragStartX.current - e.clientX;
      // 基于视窗宽度计算最大值，允许工作台最多占屏幕的 75%
      const maxWidth = window.innerWidth * 0.75;
      const newWidth = Math.max(280, Math.min(maxWidth, dragStartWidth.current + deltaX));
      setRightPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Auto-create conversation when none exists
  useEffect(() => {
    if (conversations.length === 0 && !isLoadingConversations && !isCreating) {
      createConversation().then((newConv) => {
        if (newConv) {
          setActiveConversationId(newConv.id);
        }
      });
    }
  }, [conversations.length, isLoadingConversations, isCreating, createConversation]);

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

  const handleCreateConversation = async () => {
    const newConv = await createConversation();
    if (newConv) {
      setActiveConversationId(newConv.id);
    }
  };

  // 构建 Workbench Host 配置
  const hostConfig: Partial<Omit<HostConfig, 'messageAPI' | 'sessionAPI'>> = useMemo(
    () => ({
      context: {
        sessionId: activeConversationId || '',
        currentAgent: selectedAgentId,
        metadata: {}
      },
      security: {
        allowedOrigins: ['*'],
        allowedPermissions: ['*']
      }
    }),
    [activeConversationId, selectedAgentId]
  );

  // 构建 InputAPI，让组件可以控制聊天输入框
  const inputAPI: InputAPI = useMemo(
    () => ({
      append: (text: string) => {
        chatInputRef.current?.appendInputValue(text);
      },
      replace: (text: string) => {
        chatInputRef.current?.setInputValue(text);
      },
      insert: (text: string, position: number) => {
        const currentValue = chatInputRef.current?.getInputValue() || '';
        const newValue = currentValue.slice(0, position) + text + currentValue.slice(position);
        chatInputRef.current?.setInputValue(newValue);
      },
      clear: () => {
        chatInputRef.current?.clearInput();
      },
      getValue: () => {
        return chatInputRef.current?.getInputValue() || '';
      },
      subscribe: () => () => {}, // 暂不实现订阅功能
    }),
    []
  );

  // 用于存储 session 订阅者
  const sessionSubscribersRef = useRef<Set<(session: Session) => void>>(new Set());

  // 构建 SessionAPI，让组件可以切换会话
  const sessionAPI: SessionAPI = useMemo(
    () => ({
      // 获取当前会话
      getCurrent: () => {
        if (!activeConversationId) return null;
        const currentConv = conversations.find(c => c.id === activeConversationId);
        if (!currentConv) return null;
        return {
          id: currentConv.id,
          title: currentConv.title,
          createdAt: currentConv.timestamp.getTime(),
          updatedAt: currentConv.timestamp.getTime(),
          status: currentConv.status,
        };
      },

      // 切换到指定会话
      switch: async (sessionId: string) => {
        // 检查会话是否存在
        const targetConv = conversations.find(c => c.id === sessionId);
        if (!targetConv) {
          throw new Error(`Session not found: ${sessionId}`);
        }

        // 切换会话
        setActiveConversationId(sessionId);

        // 通知订阅者
        const session: Session = {
          id: targetConv.id,
          title: targetConv.title,
          createdAt: targetConv.timestamp.getTime(),
          updatedAt: targetConv.timestamp.getTime(),
          status: targetConv.status,
        };
        sessionSubscribersRef.current.forEach(callback => {
          try {
            callback(session);
          } catch (error) {
            console.error('Error in session subscriber:', error);
          }
        });
      },

      // 创建新会话
      create: async () => {
        const newConv = await createConversation();
        if (!newConv) {
          throw new Error('Failed to create session');
        }
        return {
          id: newConv.id,
          title: newConv.title,
          createdAt: newConv.timestamp.getTime(),
          updatedAt: newConv.timestamp.getTime(),
          status: newConv.status,
        };
      },

      // 获取所有会话列表
      list: () => conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        createdAt: conv.timestamp.getTime(),
        updatedAt: conv.timestamp.getTime(),
        status: conv.status,
      })),

      // 订阅会话变化
      subscribe: (callback: (session: Session) => void) => {
        sessionSubscribersRef.current.add(callback);
        return () => {
          sessionSubscribersRef.current.delete(callback);
        };
      },
    }),
    [activeConversationId, conversations, createConversation]
  );

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          isLoading={isLoadingConversations}
          sidebarCollapsed={sidebarCollapsed}
          agents={agentsMap}
          onSetSidebarCollapsed={setSidebarCollapsed}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onCreateConversation={handleCreateConversation}
          onRefresh={refreshConversations}
        />

        {/* Center - Chat Area */}
        <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-w-0 overflow-hidden">
          {/* Messages */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4"
            onScroll={handleScroll}
          >
            {/* Loading indicator */}
            {isLoadingMore && (
              <div className="text-center py-2 text-sm text-slate-400">
                加载更多...
              </div>
            )}
            <ChatMessages
              messages={messages}
              uiMessages={uiMessages}
              replyRelations={replyRelations}
              agentConfigs={agentConfigs}
            />
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <ChatInput
            ref={chatInputRef}
            onSend={handleSendMessageWithScroll}
            disabled={!activeConversationId}
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={handleSelectAgent}
          />
        </main>

        {/* Resizable Divider - 非全屏时显示 */}
        {showWorkbench && !isWorkbenchFullscreen && (
          <div
            className={`w-1 bg-slate-200 dark:bg-slate-800 hover:bg-blue-400 dark:hover:bg-blue-600 cursor-col-resize transition-colors flex items-center justify-center group ${
              isDragging ? 'bg-blue-400 dark:bg-blue-600' : ''
            }`}
            onMouseDown={handleDragStart}
          >
            <div className={`w-1 h-8 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-white dark:group-hover:bg-slate-400 transition-colors ${
              isDragging ? 'bg-white dark:bg-slate-400' : ''
            }`} />
          </div>
        )}

        {/* Right Panel - Workbench with Tab System */}
        <div
          className={`bg-white dark:bg-slate-900 flex flex-col flex-shrink-0 h-full transition-all duration-200 ${
            showWorkbench && !isWorkbenchFullscreen ? 'border-l border-slate-200 dark:border-slate-800' : ''
          }`}
          style={{ width: showWorkbench && !isWorkbenchFullscreen ? rightPanelWidth : COLLAPSED_WIDTH }}
        >
          {/* Collapsed Strip - 仅在非全屏且未显示 workbench 时 */}
          {!showWorkbench && !isWorkbenchFullscreen && (
            <button
              onClick={() => setShowWorkbench(true)}
              className="w-full h-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center group"
              title="显示工作台"
            >
              <PanelRightOpen className="h-5 w-5 text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" />
            </button>
          )}
        </div>

        {/* Workbench - 始终保持一个实例，通过 CSS 控制全屏/分屏 */}
        {showWorkbench && (
          <div
            className={`transition-all duration-200 ${
              isWorkbenchFullscreen
                ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900'
                : 'absolute right-0 top-0 bottom-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800'
            }`}
            style={{
              width: isWorkbenchFullscreen ? '100%' : rightPanelWidth,
            }}
          >
            <WorkbenchAppWrapper
              ref={workbenchRef}
              loadFromStorage={true}
              hostConfig={hostConfig}
              inputAPI={inputAPI}
              sessionAPI={sessionAPI}
              onToggleCollapse={() => {
                if (isWorkbenchFullscreen) {
                  setIsWorkbenchFullscreen(false);
                } else {
                  setShowWorkbench(false);
                }
              }}
              isFullscreen={isWorkbenchFullscreen}
              onEnterFullscreen={() => setIsWorkbenchFullscreen(true)}
              onExitFullscreen={() => setIsWorkbenchFullscreen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
