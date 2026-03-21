import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import type { Conversation } from "@/hooks/useConversations";
import type { Agent } from "@/api/agent";
import { isImageUrl, isEmoji } from "./AgentAvatar";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string;
  isLoading: boolean;
  agents: Map<string, Agent>;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => Promise<boolean>;
}

// 预设渐变色组
const GRADIENT_COLORS = [
  'from-blue-400 to-blue-600',
  'from-green-400 to-green-600',
  'from-purple-400 to-purple-600',
  'from-orange-400 to-orange-600',
  'from-pink-400 to-pink-600',
  'from-cyan-400 to-cyan-600',
  'from-indigo-400 to-indigo-600',
  'from-rose-400 to-rose-600',
  'from-emerald-400 to-emerald-600',
  'from-amber-400 to-amber-600',
];

// 根据 agent_id 生成稳定的渐变色索引
function getGradientIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % GRADIENT_COLORS.length;
}

// 获取头像显示内容
function getAvatarProps(agent: Agent | undefined): {
  type: 'image' | 'emoji' | 'text';
  content: string;
  gradient: string;
} {
  const agentId = agent?.agent_id || 'default';
  const gradientClass = GRADIENT_COLORS[getGradientIndex(agentId)] ?? GRADIENT_COLORS[0]!;
  const avatar = agent?.config?.avatar;

  // 没有头像：显示名称首字符
  if (!avatar) {
    const name = agent?.name || '未知';
    const firstChar = name.charAt(0).toUpperCase();
    return { type: 'text', content: firstChar, gradient: gradientClass };
  }

  // 是图片 URL
  if (isImageUrl(avatar)) {
    return { type: 'image', content: avatar, gradient: gradientClass };
  }

  // 是 emoji
  if (isEmoji(avatar)) {
    return { type: 'emoji', content: avatar, gradient: gradientClass };
  }

  // 其他情况：显示首字符
  const firstChar = avatar.charAt(0).toUpperCase();
  return { type: 'text', content: firstChar, gradient: gradientClass };
}

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString();
};

export function ConversationList({
  conversations,
  activeConversationId,
  isLoading,
  agents,
  onSelectConversation,
  onDeleteConversation,
}: ConversationListProps) {
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = async (conversationId: string) => {
    const success = await onDeleteConversation(conversationId);
    if (success) {
      setDeleteConfirm(null);
    }
    setShowMenu(null);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            加载中...
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            暂无会话
          </div>
        ) : (
          conversations.map((conversation) => {
            const isActive = activeConversationId === conversation.id;
            const agent = agents.get(conversation.agentId || '');
            const avatarProps = getAvatarProps(agent);

            return (
              <div key={conversation.id} className="relative">
                <button
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full text-left p-3 rounded-xl mb-1 transition-all ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/30 shadow-sm"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {/* 微信风格布局：头像 + 内容区 */}
                  <div className="flex items-start gap-3">
                    {/* 头像 */}
                    <div className={`shrink-0 w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center ${
                      isActive ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                    }`}>
                      {avatarProps.type === 'image' ? (
                        <img
                          src={avatarProps.content}
                          alt={agent?.name || 'Agent'}
                          className="w-full h-full object-cover"
                        />
                      ) : avatarProps.type === 'emoji' ? (
                        <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          <span className="text-2xl">{avatarProps.content}</span>
                        </div>
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${avatarProps.gradient} flex items-center justify-center`}>
                          <span className="text-white text-lg font-semibold">
                            {avatarProps.content}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 内容区 */}
                    <div className="flex-1 min-w-0">
                      {/* 第一行：Agent名称 + 时间 + 菜单 */}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={`font-medium text-sm truncate ${
                          isActive
                            ? "text-slate-900 dark:text-slate-100"
                            : "text-slate-700 dark:text-slate-300"
                        }`}>
                          {agent?.name || '未知助手'}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-slate-400">
                            {formatTime(conversation.timestamp)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(showMenu === conversation.id ? null : conversation.id);
                              setDeleteConfirm(null);
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>
                      </div>

                      {/* 第二行：会话标题 */}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">
                          {conversation.title}
                        </p>
                        {conversation.unread && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* 操作菜单 */}
                {showMenu === conversation.id && (
                  <div className="absolute right-2 top-14 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 min-w-[120px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(conversation.id);
                        setShowMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除会话
                    </button>
                  </div>
                )}

                {/* 删除确认 */}
                {deleteConfirm === conversation.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setDeleteConfirm(null)}
                    />
                    <div className="absolute right-2 top-14 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 z-20 w-56">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                          确认删除
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                        确定要删除会话 "{conversation.title}" 吗？
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(null);
                          }}
                          className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(conversation.id);
                          }}
                          className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs text-white transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
