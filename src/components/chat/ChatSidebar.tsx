import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, Loader2, LogOut, User, Settings } from "lucide-react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { ConversationList } from "./ConversationList";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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

  if (sidebarCollapsed) {
    return (
      <aside
        className="flex flex-col w-12 items-center py-3 shrink-0 relative bg-muted/50 border-r border-border"
      >
        <button
          onClick={() => onSetSidebarCollapsed(false)}
          className="p-2 rounded-lg transition-colors duration-150 text-primary hover:bg-muted"
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
      className="flex flex-col w-64 overflow-hidden shrink-0 bg-muted/50 border-r border-border"
    >
      {/* Header — Brand + Collapse */}
      <header
        className="h-14 flex items-center px-4 shrink-0 border-b border-border"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-primary font-bold text-base tracking-tight truncate">引力引擎 ARM</span>
        </div>
        <button
          onClick={() => onSetSidebarCollapsed(true)}
          className="p-2 rounded-lg transition-colors duration-150 shrink-0 text-muted-foreground hover:bg-muted"
          title="收起会话列表"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </header>

      {/* New Conversation & Refresh */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2 relative" ref={popupRef}>
          <button
            onClick={() => {
              if (!isCreating) setShowAgentPopup(!showAgentPopup);
            }}
            disabled={isCreating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors duration-150 font-medium bg-muted text-foreground border border-border"
            style={{
              opacity: isCreating ? 0.6 : 1,
              cursor: isCreating ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isCreating) e.currentTarget.style.background = "hsl(var(--muted))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "";
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
              className="absolute left-0 right-0 top-full mt-2 rounded-xl shadow-2xl z-30 overflow-hidden bg-muted border border-border"
              style={{
                maxHeight: "320px",
                overflowY: "auto",
              }}
            >
              {agentList.length === 0 ? (
                <div
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
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
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors duration-150 text-left border-b border-border"
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
                          className="text-sm font-medium truncate text-foreground"
                        >
                          {agent.name}
                        </span>
                        {/* Online status dot */}
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${agent.enabled !== false ? "bg-success" : "bg-muted-foreground"}`}
                        />
                      </div>
                      {agent.config?.description && (
                        <p
                          className="text-xs truncate mt-0.5 text-muted-foreground"
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

      {/* Footer — User + Menu */}
      <div className="px-3 py-3 border-t border-border mt-auto relative" ref={userMenuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-2 px-1 py-1 rounded-lg transition-colors duration-150 hover:bg-muted"
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-muted shrink-0">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground truncate flex-1 text-left">{username}</span>
          <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>

        {/* User Menu Popup */}
        {showUserMenu && (
          <div className="absolute left-3 right-3 bottom-full mb-2 rounded-xl shadow-2xl z-30 overflow-hidden bg-background border border-border">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs text-muted-foreground">外观</span>
              <ThemeToggle />
            </div>
            <button
              onClick={() => { logout(); setShowUserMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors duration-150 text-left hover:bg-muted"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">退出登录</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
