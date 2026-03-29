import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { ArrowLeft, Plus, Bot, FolderOpen, Wrench, ChevronRight, ChevronDown, Loader2, User, LogOut } from "lucide-react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { BottomTabBar } from "./BottomTabBar";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput, ChatInputRef } from "@/components/chat/ChatInput";
import { AgentPanel } from "@/components/panel/panels/AgentPanel";
import { FilesPanel } from "@/components/panel/panels/FilesPanel";
import { ToolsPanel } from "@/components/panel/panels/ToolsPanel";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation } from "@/hooks/useConversations";
import type { Agent } from "@/api/agent";
import type { UIMessage, ReplyRelation } from "@/types/message-station";

interface AgentConfig {
  name?: string;
  avatar?: string;
}

interface MobileLayoutProps {
  conversations: Conversation[];
  activeConversationId: string;
  isLoadingConversations: boolean;
  isCreating: boolean;
  agents: Agent[];
  agentsMap: Map<string, Agent>;
  agentConfigs: Map<string, AgentConfig>;
  selectedAgentId: string;
  messages: Array<{
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: Date;
  }>;
  uiMessages: UIMessage[];
  replyRelations: ReplyRelation[];
  hasMore: boolean;
  isLoadingMore: boolean;
  isNearBottom: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => Promise<boolean>;
  onCreateConversation: (agentId: string) => void;
  onSendMessage: (content: string, agentId: string) => Promise<boolean>;
  onSelectAgent: (agentId: string) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollToBottom: (behavior: "smooth" | "auto") => void;
  isGenerating?: boolean;
  onStop?: () => void;
}

type SettingsPanel = "agents" | "files" | "tools";

const BOTTOM_TAB_HEIGHT = 56;

const settingsMenuItems: {
  key: SettingsPanel;
  label: string;
  description: string;
  icon: typeof Bot;
}[] = [
  { key: "agents", label: "Agents", description: "管理和配置 AI 助手", icon: Bot },
  { key: "files", label: "文件", description: "浏览和管理文件", icon: FolderOpen },
  { key: "tools", label: "工具", description: "查看可用工具", icon: Wrench },
];

export function MobileLayout({
  conversations,
  activeConversationId,
  isLoadingConversations,
  isCreating,
  agents,
  agentsMap,
  agentConfigs,
  selectedAgentId,
  messages,
  uiMessages,
  replyRelations,
  isLoadingMore,
  isNearBottom,
  messagesContainerRef,
  messagesEndRef,
  onSelectConversation,
  onDeleteConversation,
  onCreateConversation,
  onSendMessage,
  onSelectAgent,
  onScroll,
  scrollToBottom,
  isGenerating,
  onStop,
}: MobileLayoutProps) {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"chat" | "settings">("chat");
  const [chatView, setChatView] = useState<"list" | "conversation">("list");
  const [settingsView, setSettingsView] = useState<"menu" | "panel">("menu");
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>("agents");
  const [showAgentPopup, setShowAgentPopup] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  // 从 localStorage 获取用户名
  const username = useMemo(() => {
    return localStorage.getItem('username') || '用户';
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  // 关闭用户菜单（点击外部）
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      onSelectConversation(id);
      setChatView("conversation");
    },
    [onSelectConversation]
  );

  const handleBackToList = useCallback(() => {
    setChatView("list");
  }, []);

  const handleOpenPanel = useCallback((panel: SettingsPanel) => {
    setSettingsPanel(panel);
    setSettingsView("panel");
  }, []);

  const handleBackToMenu = useCallback(() => {
    setSettingsView("menu");
  }, []);

  const handleTabChange = useCallback((tab: "chat" | "settings") => {
    setActiveTab(tab);
    // When switching to chat tab, reset to list view
    if (tab === "chat") {
      setChatView("list");
    }
  }, []);

  const activeAgent = agentsMap.get(
    conversations.find((c) => c.id === activeConversationId)?.agentId || ""
  );

  // ---- Render views ----

  const renderChatListView = () => (
    <div
      className="flex flex-col bg-card"
      style={{ height: "100%" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between border-b border-border bg-surface-2 shrink-0"
        style={{ height: 56, padding: "0 16px" }}
      >
        <span className="text-foreground text-lg font-semibold">
          对话
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* User Menu Button */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="text-muted-foreground rounded-lg"
              style={{
                background: "transparent",
                border: "none",
                padding: 8,
                cursor: "pointer",
              }}
            >
              <User style={{ width: 20, height: 20 }} />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div
                className="bg-card border border-border rounded-xl shadow-lg"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: 4,
                  minWidth: 160,
                  overflow: "hidden",
                  zIndex: 50,
                }}
              >
                <div
                  className="border-b border-border"
                  style={{ padding: "12px 16px" }}
                >
                  <div className="text-muted-foreground" style={{ fontSize: 11, marginBottom: 2 }}>当前用户</div>
                  <div className="text-foreground font-semibold" style={{ fontSize: 14 }}>{username}</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <LogOut className="text-muted-foreground" style={{ width: 16, height: 16 }} />
                  <span className="text-foreground" style={{ fontSize: 14 }}>退出登录</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowAgentPopup(!showAgentPopup)}
            disabled={isCreating}
            className={isCreating ? "text-muted-foreground" : "text-primary"}
            style={{
              background: "transparent",
              border: "none",
              padding: 8,
              cursor: isCreating ? "not-allowed" : "pointer",
              borderRadius: 8,
            }}
          >
            {isCreating ? (
              <Loader2
                style={{ width: 20, height: 20 }}
                className="animate-spin"
              />
            ) : (
              <Plus style={{ width: 20, height: 20 }} />
            )}
          </button>
        </div>
      </header>

      {/* Agent selection popup */}
      {showAgentPopup && (
        <div
          className="bg-muted border border-border rounded-xl"
          style={{
            margin: "8px 16px 0",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {agents.length === 0 ? (
            <div
              className="text-center text-muted-foreground text-sm"
              style={{ padding: "24px 16px" }}
            >
              暂无可用 Agent
            </div>
          ) : (
            agents.map((agent) => (
              <button
                key={agent.agent_id}
                onClick={() => {
                  onCreateConversation(agent.agent_id);
                  setShowAgentPopup(false);
                }}
                className="w-full flex items-center gap-3 border-b border-border text-left cursor-pointer text-foreground"
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <AgentAvatar
                  agentId={agent.agent_id}
                  avatar={agent.config?.avatar}
                  size={28}
                  className="shrink-0"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{agent.name}</div>
                  {agent.config?.description && (
                    <div
                      className="text-muted-foreground truncate"
                      style={{ fontSize: 12 }}
                    >
                      {agent.config.description}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Conversation list */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          isLoading={isLoadingConversations}
          agents={agentsMap}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={onDeleteConversation}
        />
      </div>
    </div>
  );

  const renderChatConversationView = () => (
    <div
      className="flex flex-col bg-card"
      style={{ height: "100%" }}
    >
      {/* Header */}
      <header
        className="flex items-center border-b border-border bg-surface-2 shrink-0"
        style={{ height: 56, gap: 12, padding: "0 12px" }}
      >
        <button
          onClick={handleBackToList}
          className="text-primary flex items-center"
          style={{
            background: "transparent",
            border: "none",
            padding: 4,
            cursor: "pointer",
          }}
        >
          <ArrowLeft style={{ width: 22, height: 22 }} />
        </button>
        <AgentAvatar
          agentId={activeAgent?.agent_id}
          avatar={activeAgent?.config?.avatar}
          size={28}
          className="shrink-0"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="text-foreground font-semibold truncate"
            style={{ fontSize: 15 }}
          >
            {activeAgent?.name || "对话"}
          </div>
          {activeAgent?.config?.description && (
            <div
              className="text-muted-foreground truncate"
              style={{ fontSize: 12 }}
            >
              {activeAgent.config.description}
            </div>
          )}
        </div>

        {/* User Menu Button */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="text-muted-foreground rounded-lg"
            style={{
              background: "transparent",
              border: "none",
              padding: 8,
              cursor: "pointer",
            }}
          >
            <User style={{ width: 20, height: 20 }} />
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div
              className="bg-card border border-border rounded-xl shadow-lg"
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: 4,
                minWidth: 160,
                overflow: "hidden",
                zIndex: 50,
              }}
            >
              <div
                className="border-b border-border"
                style={{ padding: "12px 16px" }}
              >
                <div className="text-muted-foreground" style={{ fontSize: 11, marginBottom: 2 }}>当前用户</div>
                <div className="text-foreground font-semibold" style={{ fontSize: 14 }}>{username}</div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <LogOut className="text-muted-foreground" style={{ width: 16, height: 16 }} />
                <span className="text-foreground" style={{ fontSize: 14 }}>退出登录</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div
          ref={messagesContainerRef}
          style={{
            position: "absolute",
            inset: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "16px 12px",
          }}
          onScroll={onScroll}
        >
          {isLoadingMore && (
            <div
              className="text-center text-muted-foreground text-sm"
              style={{ padding: "8px 0" }}
            >
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

        {/* Scroll to bottom */}
        {!isNearBottom && (
          <button
            onClick={() => scrollToBottom("smooth")}
            className="absolute bg-primary border-none flex items-center justify-center cursor-pointer rounded-full"
            style={{
              bottom: 12,
              right: 12,
              width: 36,
              height: 36,
              zIndex: 10,
            }}
          >
            <ChevronDown className="text-white" style={{ width: 20, height: 20 }} />
          </button>
        )}
      </div>

      {/* Input */}
      <ChatInput
        ref={chatInputRef}
        onSend={onSendMessage}
        disabled={!activeConversationId}
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={onSelectAgent}
        isGenerating={isGenerating}
        onStop={onStop}
      />
    </div>
  );

  const renderSettingsMenuView = () => (
    <div
      className="flex flex-col bg-card"
      style={{ height: "100%" }}
    >
      {/* Header */}
      <header
        className="flex items-center border-b border-border bg-surface-2 shrink-0"
        style={{ height: 56, padding: "0 16px" }}
      >
        <span className="text-foreground text-lg font-semibold">
          配置
        </span>
      </header>

      {/* Menu items */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {settingsMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => handleOpenPanel(item.key)}
              className="w-full flex items-center border-b border-border text-left cursor-pointer"
              style={{
                gap: 14,
                padding: "14px 16px",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                className="bg-muted border border-border flex items-center justify-center shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                }}
              >
                <Icon className="text-primary" style={{ width: 20, height: 20 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-foreground" style={{ fontSize: 15, fontWeight: 500 }}>
                  {item.label}
                </div>
                <div className="text-muted-foreground" style={{ fontSize: 12, marginTop: 2 }}>
                  {item.description}
                </div>
              </div>
              <ChevronRight
                className="text-muted-foreground shrink-0"
                style={{ width: 18, height: 18 }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSettingsPanelView = () => {
    const panelInfo = settingsMenuItems.find((i) => i.key === settingsPanel);
    const PanelComponent =
      settingsPanel === "agents"
        ? AgentPanel
        : settingsPanel === "files"
          ? FilesPanel
          : ToolsPanel;

    return (
      <div
        className="flex flex-col bg-card"
        style={{ height: "100%" }}
      >
        {/* Header */}
        <header
          className="flex items-center border-b border-border bg-surface-2 shrink-0"
          style={{ height: 56, gap: 12, padding: "0 12px" }}
        >
          <button
            onClick={handleBackToMenu}
            className="text-primary flex items-center"
            style={{
              background: "transparent",
              border: "none",
              padding: 4,
              cursor: "pointer",
            }}
          >
            <ArrowLeft style={{ width: 22, height: 22 }} />
          </button>
          <span className="text-foreground font-semibold" style={{ fontSize: 16 }}>
            {panelInfo?.label || ""}
          </span>
        </header>

        {/* Panel content */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <PanelComponent
            sessionId={activeConversationId}
            agentId={selectedAgentId}
            isActive={true}
            onCreateConversation={(agentId: string) => {
              onCreateConversation(agentId);
              // Switch to chat conversation view after creating
              setChatView("conversation");
              setActiveTab("chat");
            }}
            onSelectSession={(sessionId: string) => {
              onSelectConversation(sessionId);
              // Switch to chat conversation view
              setChatView("conversation");
              setActiveTab("chat");
            }}
          />
        </div>
      </div>
    );
  };

  // Determine which view to render
  let content: React.ReactNode;
  if (activeTab === "chat") {
    content =
      chatView === "list"
        ? renderChatListView()
        : renderChatConversationView();
  } else {
    content =
      settingsView === "menu"
        ? renderSettingsMenuView()
        : renderSettingsPanelView();
  }

  return (
    <div
      className="flex flex-col bg-card"
      style={{ height: "100vh" }}
    >
      {/* Main content area above bottom tab */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          paddingBottom: BOTTOM_TAB_HEIGHT,
        }}
      >
        {content}
      </div>

      <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
