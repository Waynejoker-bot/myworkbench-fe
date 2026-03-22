import { useState, useRef, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Loader2, Bot } from "lucide-react";
import { ConversationList } from "./ConversationList";
import type { Conversation } from "@/hooks/useConversations";
import type { Agent } from "@/api/agent";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  isLoading: boolean;
  isCreating: boolean;
  sidebarCollapsed: boolean;
  agents: Map<string, Agent>;
  onSetSidebarCollapsed: (collapsed: boolean) => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => Promise<boolean>;
  onUpdateTitle?: (id: string, title: string) => Promise<boolean>;
  onCreateConversation: (agentId: string) => void;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  isLoading,
  isCreating,
  sidebarCollapsed,
  agents,
  onSetSidebarCollapsed,
  onSelectConversation,
  onDeleteConversation,
  onUpdateTitle,
  onCreateConversation,
}: ChatSidebarProps) {
  const [showAgentPopup, setShowAgentPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    if (!showAgentPopup) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowAgentPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAgentPopup]);

  if (sidebarCollapsed) {
    return (
      <aside
        style={{ background: "#f9fafb", borderRight: "1px solid #d1d5db" }}
        className="flex flex-col w-12 items-center py-4 shrink-0"
      >
        <button
          onClick={() => onSetSidebarCollapsed(false)}
          className="p-2 rounded-lg transition-colors shrink-0"
          style={{ color: "#64748b" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="展开会话列表"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </aside>
    );
  }

  const agentList = Array.from(agents.values());

  return (
    <aside
      style={{ background: "#f9fafb", borderRight: "1px solid #d1d5db" }}
      className="flex flex-col w-64 overflow-hidden shrink-0"
    >
      {/* Header */}
      <header
        style={{ borderBottom: "1px solid #d1d5db" }}
        className="h-14 flex items-center px-4 shrink-0"
      >
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img src="/head/head.png" alt="avatar" className="w-full h-full object-cover" />
          </div>
          <span style={{ color: "#111827" }} className="font-semibold">对话</span>
        </div>
        <button
          onClick={() => onSetSidebarCollapsed(true)}
          className="p-2 rounded-lg transition-colors shrink-0"
          style={{ color: "#64748b" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="收起会话列表"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </header>

      {/* New Conversation & Refresh */}
      <div style={{ borderBottom: "1px solid #d1d5db" }} className="p-4">
        <div className="flex gap-2 relative" ref={popupRef}>
          <button
            onClick={() => {
              if (!isCreating) setShowAgentPopup(!showAgentPopup);
            }}
            disabled={isCreating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors font-medium"
            style={{
              background: "#f3f4f6",
              color: "#111827",
              border: "1px solid #d1d5db",
              opacity: isCreating ? 0.6 : 1,
              cursor: isCreating ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isCreating) e.currentTarget.style.background = "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            新建对话
          </button>

          {/* Agent Selection Popup */}
          {showAgentPopup && (
            <div
              className="absolute left-0 right-0 top-full mt-2 rounded-xl shadow-2xl z-30 overflow-hidden"
              style={{
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                maxHeight: "320px",
                overflowY: "auto",
              }}
            >
              {agentList.length === 0 ? (
                <div
                  className="px-4 py-6 text-center text-sm"
                  style={{ color: "#64748b" }}
                >
                  暂无可用 Agent
                </div>
              ) : (
                agentList.map((agent) => (
                  <button
                    key={agent.agent_id}
                    onClick={() => {
                      onCreateConversation(agent.agent_id);
                      setShowAgentPopup(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                    style={{ borderBottom: "1px solid #d1d5db" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Icon container */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: "#f3f4f6",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <Bot
                        className="h-5 w-5"
                        style={{
                          color: agent.enabled !== false ? "#0ea5e9" : "#64748b",
                        }}
                      />
                    </div>
                    {/* Name + Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium truncate"
                          style={{ color: "#111827" }}
                        >
                          {agent.name}
                        </span>
                        {/* Online status dot */}
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: agent.enabled !== false ? "#22c55e" : "#64748b",
                          }}
                        />
                      </div>
                      {agent.config?.description && (
                        <p
                          className="text-xs truncate mt-0.5"
                          style={{ color: "#64748b" }}
                        >
                          {agent.config.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversationId}
        isLoading={isLoading}
        agents={agents}
        onSelectConversation={onSelectConversation}
        onDeleteConversation={onDeleteConversation}
        onUpdateTitle={onUpdateTitle}
      />
    </aside>
  );
}
