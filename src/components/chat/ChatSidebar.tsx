import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, Loader2, LogOut, User, MessageSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { ConversationList } from "./ConversationList";
import { useAuth } from "@/contexts/AuthContext";
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
  const { logout } = useAuth();
  const location = useLocation();
  const [showAgentPopup, setShowAgentPopup] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 从 localStorage 获取用户名
  const username = useMemo(() => {
    return localStorage.getItem('username') || '用户';
  }, []);

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

  // Close user menu when clicking outside
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

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  if (sidebarCollapsed) {
    return (
      <aside
        style={{ background: "#f9fafb", borderRight: "1px solid #d1d5db" }}
        className="flex flex-col w-12 items-center py-4 shrink-0 relative"
      >
        <div className="flex flex-col gap-2 items-center">
          {/* User Menu Button */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-2 rounded-lg transition-colors shrink-0"
              style={{ color: "#64748b" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              title="用户菜单"
            >
              <User className="h-5 w-5" />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div
                className="absolute left-full ml-2 top-0 rounded-xl shadow-2xl z-30 overflow-hidden min-w-48"
                style={{
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid #d1d5db" }}
                >
                  <div className="text-xs" style={{ color: "#64748b" }}>当前用户</div>
                  <div className="font-medium" style={{ color: "#111827" }}>{username}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut className="h-4 w-4" style={{ color: "#64748b" }} />
                  <span style={{ color: "#111827" }}>退出登录</span>
                </button>
              </div>
            )}
          </div>

          {/* Expand Button */}
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
        </div>
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
        {/* User Menu */}
        <div className="flex items-center gap-2 flex-1 relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 flex-1 rounded-lg transition-colors p-1"
            style={{ color: "#111827" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            title="用户菜单"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "#0ea5e9" }}>
              <User className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold truncate">{username}</span>
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div
              className="absolute left-0 top-full mt-2 rounded-xl shadow-2xl z-30 overflow-hidden min-w-48"
              style={{
                background: "#ffffff",
                border: "1px solid #d1d5db",
              }}
            >
              <div
                className="px-4 py-3 border-b border-gray-200"
                style={{ borderBottom: "1px solid #d1d5db" }}
              >
                <div className="text-xs" style={{ color: "#64748b" }}>当前用户</div>
                <div className="font-medium" style={{ color: "#111827" }}>{username}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut className="h-4 w-4" style={{ color: "#64748b" }} />
                <span style={{ color: "#111827" }}>退出登录</span>
              </button>
            </div>
          )}
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

      {/* Nav Links */}
      <div style={{ borderBottom: "1px solid #d1d5db" }} className="px-2 py-2 flex flex-col gap-1">
        <Link
          to="/chat"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors"
          style={{
            background: location.pathname === "/chat" ? "rgba(14, 165, 233, 0.12)" : "transparent",
            color: location.pathname === "/chat" ? "#0ea5e9" : "#4b5563",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            if (location.pathname !== "/chat") e.currentTarget.style.background = "#e5e7eb";
          }}
          onMouseLeave={(e) => {
            if (location.pathname !== "/chat") e.currentTarget.style.background = "transparent";
          }}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">AI 对话</span>
        </Link>
      </div>

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
                    {/* Agent Avatar */}
                    <AgentAvatar
                      agentId={agent.agent_id}
                      avatar={agent.config?.avatar}
                      size={36}
                      className="shrink-0"
                    />
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
