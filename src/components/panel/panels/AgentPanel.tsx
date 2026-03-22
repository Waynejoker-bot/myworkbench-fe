import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Bot, ChevronRight, ArrowLeft, Pencil, Trash2, AlertTriangle, Loader2, Plus, FileText, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useAgents } from '@/hooks/useAgents'
import { useToast } from '@/contexts/ToastContext'
import { deleteChannel, updateChannel, createChannel, getAgent } from '@/api/agent'
import { getSessions } from '@/api/session'
import { apiClient } from '@/lib/api-client'
import { FileViewer } from '@/features/file-system/components/FileViewer'
import type { FileItemWithContent } from '@/features/file-system/types'
import type { PanelProps } from '@/types/panel-plugin'
import type { Agent } from '@/api/agent'
import type { Session } from '@/api/session'

interface ConfigFileItem {
  name: string
  type: 'file' | 'directory'
  size: number | null
  full_path: string
}

type WorkStatus = 'idle' | 'busy' | 'offline'

function formatRelativeTime(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '-'
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function getAgentStatus(agent: Agent, busyAgentIds?: Set<string>): WorkStatus {
  if (agent.enabled === false) return 'offline'
  // 前端检测到正在流式输出，优先于后端状态
  if (busyAgentIds?.has(agent.agent_id)) return 'busy'
  if (agent.status === 'SESSION_BUSY') return 'busy'
  if (agent.status === 'SESSION_IDLE') return 'idle'
  if (agent.status === 'OFFLINE') return 'offline'
  return 'idle'
}

function StatusDot({ status }: { status: WorkStatus }) {
  const colors: Record<WorkStatus, string> = { idle: '#22c55e', busy: '#f59e0b', offline: '#475569' }
  const labels: Record<WorkStatus, string> = { idle: '空闲', busy: '工作中', offline: '离线' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: colors[status],
        display: 'inline-block',
        flexShrink: 0,
      }} />
      {status === 'busy' && <Loader2 style={{ width: 12, height: 12, color: '#f59e0b', animation: 'spin 1s linear infinite' }} />}
      <span style={{ color: status === 'offline' ? '#475569' : '#111827', opacity: status === 'offline' ? 0.6 : 1 }}>
        {labels[status]}
      </span>
    </span>
  )
}

function MiniStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: 10, color: '#64748b' }}>{label}</div>
    </div>
  )
}

export function AgentPanel({ sessionId: _sessionId, agentId: _agentId, isActive: _isActive, onCreateConversation, onSelectSession, busyAgentIds }: PanelProps) {
  const { agents } = useAgents()

  // 直接从 agents 列表计算 counts，结合前端 busyAgentIds 补偿后端状态不实时的问题
  const counts = useMemo(() => {
    const result = { idle: 0, working: 0, offline: 0 }
    for (const agent of agents) {
      const status = getAgentStatus(agent, busyAgentIds)
      if (status === 'idle') result.idle++
      else if (status === 'busy') result.working++
      else result.offline++
    }
    return result
  }, [agents, busyAgentIds])
  const { showToast } = useToast()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentId, setNewAgentId] = useState('')
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [agentDetail, setAgentDetail] = useState<Agent | null>(null)
  const [configFiles, setConfigFiles] = useState<ConfigFileItem[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [viewingFile, setViewingFile] = useState<FileItemWithContent | null>(null)
  const [loadingFileContent, setLoadingFileContent] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPos = useRef(0)

  useEffect(() => {
    if (!selectedAgent) return
    setLoadingSessions(true)
    getSessions({ agent_id: selectedAgent.agent_id, limit: 5 })
      .then(res => setRecentSessions(res.sessions || []))
      .catch(() => setRecentSessions([]))
      .finally(() => setLoadingSessions(false))
  }, [selectedAgent])

  // Load full agent detail and config files
  useEffect(() => {
    if (!selectedAgent) return
    const agentId = selectedAgent.agent_id

    // Fetch full agent data (includes prompt)
    getAgent(agentId)
      .then(detail => setAgentDetail(detail))
      .catch(() => setAgentDetail(null))

    // Fetch config files from agent directory
    setLoadingFiles(true)
    setConfigFiles([])
    const tryPaths = [
      `/opt/claude/business/${agentId}`,
      `/opt/claude/agent-service/agents/${agentId}`,
    ]

    async function loadConfigFiles() {
      for (const dirPath of tryPaths) {
        try {
          const res = await apiClient.listFiles('', dirPath)
          if (res.items && res.items.length > 0) {
            const files = res.items
              .filter(item => item.type === 'file')
              .map(item => ({
                name: item.name,
                type: item.type as 'file' | 'directory',
                size: item.size,
                full_path: item.full_path || `${dirPath}/${item.name}`,
              }))
            if (files.length > 0) {
              setConfigFiles(files)
              break
            }
          }
        } catch {
          // try next path
        }
      }
      setLoadingFiles(false)
    }
    loadConfigFiles()
  }, [selectedAgent])

  const openConfigFile = useCallback(async (file: ConfigFileItem) => {
    setLoadingFileContent(true)
    try {
      const res = await apiClient.readFile('', file.full_path)
      setViewingFile({
        name: file.name,
        type: 'file',
        size: res.size,
        modified_time: new Date().toISOString(),
        path: res.path,
        full_path: res.full_path,
        content: res.content,
      })
    } catch {
      showToast('读取文件失败', 'error')
    } finally {
      setLoadingFileContent(false)
    }
  }, [showToast])

  const goToDetail = useCallback((agent: Agent) => {
    if (scrollRef.current) scrollPos.current = scrollRef.current.scrollTop
    setSelectedAgent(agent)
    setIsEditing(false)
  }, [])

  const goBack = useCallback(() => {
    setSelectedAgent(null)
    setIsEditing(false)
    setShowDeleteModal(false)
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollPos.current
    })
  }, [])

  const startEdit = useCallback(() => {
    if (!selectedAgent) return
    setEditName(selectedAgent.name)
    setEditDescription(selectedAgent.config?.description ?? '')
    setIsEditing(true)
  }, [selectedAgent])

  // Detail view
  if (selectedAgent) {
    const status = getAgentStatus(selectedAgent, busyAgentIds)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #d1d5db',
          gap: 8,
          flexShrink: 0,
        }}>
          <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: '#111827', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </button>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#111827' }}>Agent 详情</span>
          {!isEditing && (
            <>
              <button onClick={startEdit} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <Pencil style={{ width: 15, height: 15 }} />
              </button>
              <button onClick={() => setShowDeleteModal(true)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <Trash2 style={{ width: 15, height: 15 }} />
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* Icon */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Bot style={{ width: 32, height: 32, color: '#0ea5e9' }} />
          </div>

          {/* Name */}
          {isEditing ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                color: '#111827',
                fontSize: 16,
                fontWeight: 600,
                textAlign: 'center',
                marginBottom: 12,
                outline: 'none',
              }}
            />
          ) : (
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', textAlign: 'center', marginBottom: 12 }}>
              {selectedAgent.name}
            </div>
          )}

          {/* Status block */}
          <div style={{
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>工作状态</span>
              <StatusDot status={status} />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <div><span style={{ color: '#64748b' }}>当前任务: </span><span style={{ color: '#111827' }}>-</span></div>
              <div><span style={{ color: '#64748b' }}>队列: </span><span style={{ color: '#111827' }}>0</span></div>
              <div><span style={{ color: '#64748b' }}>今日完成: </span><span style={{ color: '#111827' }}>0</span></div>
            </div>
          </div>

          {/* Description (edit mode) */}
          {isEditing && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>描述</div>
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  color: '#111827',
                  fontSize: 13,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* System Prompt (collapsible) */}
          {!isEditing && agentDetail?.prompt && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setPromptExpanded(!promptExpanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: '#64748b',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  marginBottom: 6,
                }}
              >
                System Prompt
                {promptExpanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
              </button>
              {promptExpanded && (
                <div style={{
                  padding: '8px 10px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#111827',
                  lineHeight: 1.6,
                  maxHeight: 200,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {agentDetail.prompt}
                </div>
              )}
            </div>
          )}

          {/* Config Files */}
          {!isEditing && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>配置文件</div>
              {loadingFiles ? (
                <div style={{ fontSize: 12, color: '#475569', padding: '8px 0' }}>加载中...</div>
              ) : configFiles.length === 0 ? (
                <div style={{ fontSize: 12, color: '#475569', padding: '8px 0' }}>未找到配置文件</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {configFiles.map(file => (
                    <div
                      key={file.name}
                      onClick={() => openConfigFile(file)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <FileText style={{ width: 14, height: 14, color: '#0ea5e9', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      {file.size != null && (
                        <span style={{ fontSize: 11, color: '#475569', flexShrink: 0 }}>
                          {file.size > 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${file.size} B`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description (read-only, show if exists) */}
          {!isEditing && selectedAgent.config?.description && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>描述</div>
              <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.5 }}>
                {selectedAgent.config.description}
              </div>
            </div>
          )}

          {/* Skills / tools */}
          {selectedAgent.tools && selectedAgent.tools.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>技能</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedAgent.tools.map(tool => (
                  <span key={tool} style={{
                    padding: '3px 10px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#38bdf8',
                  }}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Config info */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>配置信息</div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8 }}>
              <div>agent_id: <span style={{ color: '#111827' }}>{selectedAgent.agent_id}</span></div>
              {selectedAgent.llm_model && <div>model: <span style={{ color: '#111827' }}>{selectedAgent.llm_model}</span></div>}
            </div>
          </div>

          {/* Recent work */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>最近工作</div>
            {loadingSessions ? (
              <div style={{ fontSize: 12, color: '#475569', padding: '8px 0' }}>加载中...</div>
            ) : recentSessions.length === 0 ? (
              <div style={{ fontSize: 12, color: '#475569', padding: '8px 0' }}>暂无记录</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentSessions.map(session => (
                  <div
                    key={session.session_id}
                    style={{
                      padding: '8px 10px',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                    onClick={() => onSelectSession?.(session.session_id)}
                  >
                    <div style={{
                      fontSize: 13,
                      color: '#111827',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 2,
                    }}>
                      {session.title || '未命名会话'}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      {formatRelativeTime(session.updated_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit buttons */}
          {isEditing && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  color: '#111827',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={async () => {
                  setIsSaving(true)
                  try {
                    await updateChannel(selectedAgent.agent_id, { name: editName, description: editDescription })
                    showToast('Agent 已更新', 'success')
                    setIsEditing(false)
                  } catch {
                    showToast('保存失败', 'error')
                  } finally {
                    setIsSaving(false)
                  }
                }}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: isSaving ? '#0284c7' : '#0ea5e9',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {isSaving && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                保存
              </button>
            </div>
          )}
        </div>

        {/* Bottom button */}
        {!isEditing && (
          <div style={{ padding: 12, borderTop: '1px solid #d1d5db', flexShrink: 0 }}>
            <button
              onClick={() => onCreateConversation?.(selectedAgent.agent_id)}
              style={{
                width: '100%',
                padding: '10px 0',
                background: '#0ea5e9',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              开始对话
            </button>
          </div>
        )}

        {/* File viewer loading overlay */}
        {loadingFileContent && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}>
            <Loader2 style={{ width: 32, height: 32, color: '#0ea5e9', animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* Full-screen file viewer modal */}
        {viewingFile && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: '#f9fafb',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
            }}
            onKeyDown={(e) => { if (e.key === 'Escape') setViewingFile(null) }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              paddingTop: 'max(10px, env(safe-area-inset-top, 10px))',
              borderBottom: '1px solid #d1d5db',
              flexShrink: 0,
            }}>
              <button
                onClick={() => setViewingFile(null)}
                style={{ background: 'transparent', border: 'none', color: '#111827', cursor: 'pointer', padding: 4, display: 'flex' }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
              <FileText style={{ width: 16, height: 16, color: '#0ea5e9' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {viewingFile.name}
              </span>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <FileViewer file={viewingFile} loading={false} error={null} onNavigateUp={() => setViewingFile(null)} />
            </div>
          </div>
        )}

        {/* Delete modal */}
        {showDeleteModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}>
            <div style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: 12,
              padding: 24,
              width: 320,
              textAlign: 'center',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle style={{ width: 40, height: 40, color: '#f59e0b' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>确认删除</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                确定要删除 Agent "{selectedAgent.name}" 吗？此操作无法撤销。
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    background: 'transparent',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    color: '#111827',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    setIsDeleting(true)
                    try {
                      await deleteChannel(selectedAgent.agent_id)
                      showToast('Agent 已删除', 'success')
                      goBack()
                    } catch {
                      showToast('删除失败', 'error')
                    } finally {
                      setIsDeleting(false)
                    }
                  }}
                  disabled={isDeleting}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    background: isDeleting ? '#991b1b' : '#ef4444',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    opacity: isDeleting ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {isDeleting && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // List view
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb' }}>
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
          padding: '0 0 12px',
          borderBottom: '1px solid #d1d5db',
        }}>
          <MiniStat label="空闲" count={counts.idle} color="#22c55e" />
          <MiniStat label="工作中" count={counts.working} color="#f59e0b" />
          <MiniStat label="离线" count={counts.offline} color="#475569" />
        </div>
        {agents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569', fontSize: 13 }}>
            暂无 Agent
          </div>
        )}
        {agents.map(agent => {
          const status = getAgentStatus(agent, busyAgentIds)
          return (
            <button
              key={agent.agent_id}
              onClick={() => goToDetail(agent)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: 12,
                marginBottom: 8,
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Bot style={{ width: 20, height: 20, color: '#0ea5e9' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                  {agent.config?.description || agent.agent_id}
                </div>
                <StatusDot status={status} />
              </div>
              <ChevronRight style={{ width: 16, height: 16, color: '#475569', flexShrink: 0 }} />
            </button>
          )
        })}
      </div>

      {/* Create button / form */}
      <div style={{ padding: 12, borderTop: '1px solid #d1d5db', flexShrink: 0 }}>
        {showCreateForm ? (
          <div style={{
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            padding: 12,
          }}>
            <input
              value={newAgentName}
              onChange={e => setNewAgentName(e.target.value)}
              placeholder="Agent 名称"
              style={{
                width: '100%',
                padding: '8px 10px',
                background: '#f9fafb',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                color: '#111827',
                fontSize: 13,
                marginBottom: 8,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <input
              value={newAgentId}
              onChange={e => setNewAgentId(e.target.value)}
              placeholder="Agent ID"
              style={{
                width: '100%',
                padding: '8px 10px',
                background: '#f9fafb',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                color: '#111827',
                fontSize: 13,
                marginBottom: 8,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewAgentName('')
                  setNewAgentId('')
                }}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  color: '#111827',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!newAgentName.trim() || !newAgentId.trim()) {
                    showToast('请填写名称和 ID', 'warning')
                    return
                  }
                  setIsCreatingAgent(true)
                  try {
                    await createChannel({ agent_id: newAgentId.trim(), name: newAgentName.trim() })
                    showToast('Agent 已创建', 'success')
                    setShowCreateForm(false)
                    setNewAgentName('')
                    setNewAgentId('')
                  } catch {
                    showToast('创建失败', 'error')
                  } finally {
                    setIsCreatingAgent(false)
                  }
                }}
                disabled={isCreatingAgent}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: isCreatingAgent ? '#0284c7' : '#0ea5e9',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isCreatingAgent ? 'not-allowed' : 'pointer',
                  opacity: isCreatingAgent ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {isCreatingAgent && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                创建
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              width: '100%',
              padding: '10px 0',
              background: 'transparent',
              border: '2px dashed #d1d5db',
              borderRadius: 8,
              color: '#64748b',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            创建新 Agent
          </button>
        )}
      </div>
    </div>
  )
}
