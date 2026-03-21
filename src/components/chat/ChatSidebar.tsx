import { Plus, Search, ChevronLeft, ChevronRight, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { ConversationList } from "./ConversationList";
import type { Conversation } from "@/hooks/useConversations";
import type { Agent } from "@/api/agent";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  isLoading: boolean;
  sidebarCollapsed: boolean;
  agents: Map<string, Agent>;
  onSetSidebarCollapsed: (collapsed: boolean) => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => Promise<boolean>;
  onCreateConversation: () => void;
  onRefresh: () => void;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  isLoading,
  sidebarCollapsed,
  agents,
  onSetSidebarCollapsed,
  onSelectConversation,
  onDeleteConversation,
  onCreateConversation,
  onRefresh,
}: ChatSidebarProps) {
  if (sidebarCollapsed) {
    return (
      <aside className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col w-12 items-center py-4 shrink-0">
        <button
          onClick={() => onSetSidebarCollapsed(false)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          title="展开会话列表"
        >
          <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col w-64 overflow-hidden shrink-0">
      {/* Header */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 shrink-0">
        <Link
          to="/"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors mr-2"
          title="返回首页"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img src="/head/head.png" alt="avatar" className="w-full h-full object-cover" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">对话</span>
        </div>
        <button
          onClick={() => onSetSidebarCollapsed(true)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          title="收起会话列表"
        >
          <ChevronLeft className="h-4 w-4 text-slate-400" />
        </button>
      </header>

      {/* Search & New Conversation */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={onCreateConversation}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-700 dark:text-slate-300 font-medium"
          >
            <Plus className="h-4 w-4" />
            新建对话
          </button>
          <button
            onClick={onRefresh}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-700 dark:text-slate-300"
            title="刷新会话列表"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索对话..."
            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300 placeholder-slate-400"
          />
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
      />
    </aside>
  );
}
