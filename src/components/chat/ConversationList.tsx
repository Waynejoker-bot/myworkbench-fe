import { useState, useRef, useCallback } from "react";
import { MoreHorizontal, Trash2, Loader2, Pencil } from "lucide-react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import type { Conversation } from "@/hooks/useConversations";
import type { Agent } from "@/api/agent";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string;
  isLoading: boolean;
  agents: Map<string, Agent>;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => Promise<boolean>;
  onUpdateTitle?: (id: string, title: string) => Promise<boolean>;
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
  onUpdateTitle,
}: ConversationListProps) {
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editOriginalValue, setEditOriginalValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const handleDelete = async (conversationId: string) => {
    setDeletingId(conversationId);
    const success = await onDeleteConversation(conversationId);
    if (success) {
      setDeleteConfirm(null);
    }
    setDeletingId(null);
    setShowMenu(null);
  };

  const saveEdit = useCallback(async () => {
    const trimmed = editValue.trim();
    if (editingId && trimmed && trimmed !== editOriginalValue && onUpdateTitle) {
      await onUpdateTitle(editingId, trimmed);
    }
    setEditingId(null);
  }, [editingId, editValue, editOriginalValue, onUpdateTitle]);

  const handleEditBlur = useCallback(() => {
    saveEdit();
  }, [saveEdit]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  }, [saveEdit]);

  // Sort conversations by timestamp descending
  const sortedConversations = [...conversations].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2">
        {isLoading ? (
          <div
            className="flex items-center justify-center h-32 text-sm"
            style={{ color: "#64748b" }}
          >
            加载中...
          </div>
        ) : sortedConversations.length === 0 ? (
          <div
            className="flex items-center justify-center h-32 text-sm"
            style={{ color: "#64748b" }}
          >
            暂无会话
          </div>
        ) : (
          sortedConversations.map((conversation) => {
            const isActive = activeConversationId === conversation.id;
            const agent = agents.get(conversation.agentId || "");
            const agentIds = conversation.agentIds || (conversation.agentId ? [conversation.agentId] : []);
            const multiAgent = agentIds.length > 1;

            return (
              <div key={conversation.id} className="relative">
                <button
                  onClick={() => onSelectConversation(conversation.id)}
                  className="w-full text-left p-3 rounded-xl mb-1 transition-all"
                  style={{
                    background: isActive ? "rgba(14, 165, 233, 0.08)" : "transparent",
                    borderLeft: isActive ? "2px solid #0ea5e9" : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#e5e7eb";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar(s) */}
                    <div className="relative shrink-0">
                      <AgentAvatar
                        agentId={conversation.agentId}
                        avatar={agent?.config?.avatar}
                        size={40}
                      />
                      {multiAgent && (
                        <span
                          className="absolute -bottom-1 -right-1 text-xs font-medium rounded px-1"
                          style={{
                            background: "#f3f4f6",
                            color: "#0ea5e9",
                            border: "1px solid #d1d5db",
                            fontSize: "10px",
                            lineHeight: "14px",
                          }}
                        >
                          +{agentIds.length - 1}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Title + Time + Menu */}
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className="font-medium text-sm truncate flex-1"
                          style={{
                            color: "#111827",
                          }}
                        >
                          {agent?.name || conversation.title || "新对话"}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs" style={{ color: "#475569" }}>
                            {formatTime(conversation.timestamp)}
                          </span>
                          {/* Unread badge - only on non-active conversations */}
                          {!isActive && conversation.unreadCount > 0 && (
                            <span
                              className="flex items-center justify-center rounded-full text-white font-medium"
                              style={{
                                background: "#0ea5e9",
                                minWidth: "18px",
                                height: "18px",
                                fontSize: "11px",
                                padding: "0 4px",
                              }}
                            >
                              {conversation.unreadCount}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(
                                showMenu === conversation.id ? null : conversation.id
                              );
                              setDeleteConfirm(null);
                            }}
                            className="p-1 rounded transition-colors cursor-pointer"
                            style={{ color: "#475569" }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#e5e7eb")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Row 2: Conversation title (editable) */}
                      {editingId === conversation.id ? (
                        <input
                          ref={editRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          maxLength={50}
                          className="text-xs mt-0.5 w-full bg-transparent outline-none"
                          style={{
                            color: "#64748b",
                            borderBottom: "1px solid #0ea5e9",
                          }}
                          onBlur={handleEditBlur}
                          onKeyDown={handleEditKeyDown}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <p
                          className="text-xs truncate mt-0.5"
                          style={{ color: "#64748b" }}
                        >
                          {conversation.title}
                        </p>
                      )}

                      {/* Row 3: Last message preview */}
                      {conversation.lastMessage && (
                        <p
                          className="text-xs truncate mt-0.5"
                          style={{ color: "#475569" }}
                        >
                          {conversation.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                {/* Action Menu */}
                {showMenu === conversation.id && (
                  <div
                    className="absolute right-2 top-14 rounded-lg shadow-lg py-1 z-20 min-w-[120px]"
                    style={{
                      background: "#f3f4f6",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(null);
                        setEditingId(conversation.id);
                        setEditValue(conversation.title);
                        setEditOriginalValue(conversation.title);
                        setTimeout(() => editRef.current?.select(), 0);
                      }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                      style={{ color: "#111827" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#e5e7eb")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Pencil className="h-4 w-4" />
                      重命名
                    </button>
                    <div style={{ height: 1, background: "#d1d5db", margin: "2px 0" }} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(conversation.id);
                        setShowMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                      style={{ color: "#ef4444" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      删除会话
                    </button>
                  </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirm === conversation.id && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: "rgba(0, 0, 0, 0.6)" }}
                    onClick={() => setDeleteConfirm(null)}
                  >
                    <div
                      className="rounded-xl shadow-2xl p-5 w-80"
                      style={{
                        background: "#f3f4f6",
                        border: "1px solid #d1d5db",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "rgba(239, 68, 68, 0.15)" }}
                        >
                          <Trash2 className="h-5 w-5" style={{ color: "#ef4444" }} />
                        </div>
                        <span
                          className="font-semibold text-base"
                          style={{ color: "#111827" }}
                        >
                          确认删除
                        </span>
                      </div>
                      <p className="text-sm mb-5" style={{ color: "#64748b" }}>
                        确定要删除会话 &ldquo;{conversation.title}&rdquo; 吗？此操作不可撤销。
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            background: "#e5e7eb",
                            color: "#111827",
                            border: "1px solid #d1d5db",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#d1d5db")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "#e5e7eb")
                          }
                        >
                          取消
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(conversation.id);
                          }}
                          disabled={deletingId === conversation.id}
                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
                          style={{
                            background: deletingId === conversation.id ? "#991b1b" : "#ef4444",
                            opacity: deletingId === conversation.id ? 0.7 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (deletingId !== conversation.id)
                              e.currentTarget.style.background = "#dc2626";
                          }}
                          onMouseLeave={(e) => {
                            if (deletingId !== conversation.id)
                              e.currentTarget.style.background = "#ef4444";
                          }}
                        >
                          {deletingId === conversation.id && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
