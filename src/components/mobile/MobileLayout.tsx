import { useState, useRef, useCallback } from "react";
import { ArrowLeft, Plus, Bot, FolderOpen, Wrench, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { BottomTabBar } from "./BottomTabBar";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput, ChatInputRef } from "@/components/chat/ChatInput";
import { AgentPanel } from "@/components/panel/panels/AgentPanel";
import { FilesPanel } from "@/components/panel/panels/FilesPanel";
import { ToolsPanel } from "@/components/panel/panels/ToolsPanel";
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
  const [activeTab, setActiveTab] = useState<"chat" | "settings">("chat");
  const [chatView, setChatView] = useState<"list" | "conversation">("list");
  const [settingsView, setSettingsView] = useState<"menu" | "panel">("menu");
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>("agents");
  const [showAgentPopup, setShowAgentPopup] = useState(false);
  const chatInputRef = useRef<ChatInputRef>(null);

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
  }, []);

  const activeAgent = agentsMap.get(
    conversations.find((c) => c.id === activeConversationId)?.agentId || ""
  );

  // ---- Render views ----

  const renderChatListView = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#ffffff",
      }}
    >
      {/* Header */}
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid #d1d5db",
          background: "#f9fafb",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#111827", fontSize: 18, fontWeight: 600 }}>
          对话
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowAgentPopup(!showAgentPopup)}
            disabled={isCreating}
            style={{
              background: "transparent",
              border: "none",
              color: isCreating ? "#475569" : "#0ea5e9",
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
          style={{
            background: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: 12,
            margin: "8px 16px 0",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {agents.length === 0 ? (
            <div
              style={{ padding: "24px 16px", textAlign: "center", color: "#64748b", fontSize: 14 }}
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
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid #d1d5db",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#111827",
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
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
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
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#ffffff",
      }}
    >
      {/* Header */}
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 12px",
          borderBottom: "1px solid #d1d5db",
          background: "#f9fafb",
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleBackToList}
          style={{
            background: "transparent",
            border: "none",
            color: "#0ea5e9",
            padding: 4,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
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
            style={{
              color: "#111827",
              fontSize: 15,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {activeAgent?.name || "对话"}
          </div>
          {activeAgent?.config?.description && (
            <div
              style={{
                color: "#64748b",
                fontSize: 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {activeAgent.config.description}
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
              style={{ textAlign: "center", padding: "8px 0", fontSize: 14, color: "#64748b" }}
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
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#0ea5e9",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <ChevronDown style={{ width: 20, height: 20, color: "#fff" }} />
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
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#ffffff",
      }}
    >
      {/* Header */}
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid #d1d5db",
          background: "#f9fafb",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#111827", fontSize: 18, fontWeight: 600 }}>
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
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #d1d5db",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon style={{ width: 20, height: 20, color: "#0ea5e9" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ color: "#111827", fontSize: 15, fontWeight: 500 }}
                >
                  {item.label}
                </div>
                <div
                  style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}
                >
                  {item.description}
                </div>
              </div>
              <ChevronRight
                style={{ width: 18, height: 18, color: "#475569", flexShrink: 0 }}
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
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: "#ffffff",
        }}
      >
        {/* Header */}
        <header
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 12px",
            borderBottom: "1px solid #d1d5db",
            background: "#f9fafb",
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleBackToMenu}
            style={{
              background: "transparent",
              border: "none",
              color: "#0ea5e9",
              padding: 4,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft style={{ width: 22, height: 22 }} />
          </button>
          <span style={{ color: "#111827", fontSize: 16, fontWeight: 600 }}>
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
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
      }}
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
