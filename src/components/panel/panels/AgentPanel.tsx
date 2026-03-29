import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { ChevronRight, ArrowLeft, AlertTriangle, Loader2, Plus, FileText, X, FolderOpen } from 'lucide-react'
import { AgentAvatar } from '@/components/ui/AgentAvatar'
import { useAgents } from '@/hooks/useAgents'
import { useToast } from '@/contexts/ToastContext'
import { deleteChannel, createChannel, getAgent } from '@/api/agent'
import { getSessions } from '@/api/session'
import { apiClient } from '@/lib/api-client'
import { FileViewer } from '@/features/file-system/components/FileViewer'
import type { FileItemWithContent } from '@/features/file-system/types'
import type { PanelProps } from '@/types/panel-plugin'
import type { Agent } from '@/api/agent'
import type { Session } from '@/api/session'

interface NestFileItem {
  name: string
  type: 'file' | 'directory'
  size: number | null
  full_path: string
}

type WorkStatus = 'idle' | 'busy' | 'offline'

function formatRelativeTime(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '-'
  // 兼容秒级时间戳（后端 bug）：如果值小于 1e11，认为是秒，转为毫秒
  const ms = timestamp < 1e11 ? timestamp * 1000 : timestamp
  const diff = Date.now() - ms
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return new Date(ms).toLocaleDateString('zh-CN')
}

function getAgentStatus(agent: Agent, busyAgentIds?: Set<string>): WorkStatus {
  if (agent.enabled === false) return 'offline'
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
      {status === 'busy' && <Loader2 className="text-warning" style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />}
      <span className={status === 'offline' ? 'text-muted-foreground' : 'text-foreground'} style={{ opacity: status === 'offline' ? 0.6 : 1 }}>
        {labels[status]}
      </span>
    </span>
  )
}

function MiniStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex-1 text-center bg-muted border border-border rounded-md" style={{ padding: '8px 4px' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{count}</div>
      <div className="text-muted-foreground" style={{ fontSize: 10 }}>{label}</div>
    </div>
  )
}

function renderYamlHighlighted(yaml: string) {
  return yaml.split('\n').map((line, i) => {
    const match = line.match(/^(\s*)([\w-]+)(:)(.*)$/)
    if (match) {
      const [, indent, key, colon, rest] = match
      return (
        <div key={i}>
          {indent}<span style={{ color: 'var(--color-primary)' }}>{key}</span>{colon}{rest}
        </div>
      )
    }
    const boolMatch = line.match(/^(\s*-?\s*)(true|false|null)(\s*)$/)
    if (boolMatch) {
      const [, prefix, value, suffix] = boolMatch
      return (
        <div key={i}>
          {prefix}<span style={{ color: '#4ade80' }}>{value}</span>{suffix}
        </div>
      )
    }
    return <div key={i}>{line || '\u00A0'}</div>
  })
}

export function AgentPanel({ sessionId: _sessionId, agentId: _agentId, isActive: _isActive, onCreateConversation, onSelectSession, busyAgentIds }: PanelProps) {
  const { agents } = useAgents()

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
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentId, setNewAgentId] = useState('')
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [agentDetail, setAgentDetail] = useState<Agent | null>(null)

  // New data sources from nest/{agent_id}/
  const [configYaml, setConfigYaml] = useState<string | null>(null)
  const [loadingConfigYaml, setLoadingConfigYaml] = useState(false)
  const [promptFiles, setPromptFiles] = useState<NestFileItem[]>([])
  const [loadingPromptFiles, setLoadingPromptFiles] = useState(false)
  const [skillDirs, setSkillDirs] = useState<NestFileItem[]>([])
  const [loadingSkills, setLoadingSkills] = useState(false)
  const [memoryItems, setMemoryItems] = useState<NestFileItem[]>([])
  const [loadingMemory, setLoadingMemory] = useState(false)

  // File viewer state
  const [viewingFile, setViewingFile] = useState<FileItemWithContent | null>(null)
  const [loadingFileContent, setLoadingFileContent] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPos = useRef(0)

  // Load recent sessions
  useEffect(() => {
    if (!selectedAgent) return
    setLoadingSessions(true)
    getSessions({ agent_id: selectedAgent.agent_id, limit: 5 })
      .then(res => setRecentSessions(res.sessions || []))
      .catch(() => setRecentSessions([]))
      .finally(() => setLoadingSessions(false))
  }, [selectedAgent])

  // Load agent detail
  useEffect(() => {
    if (!selectedAgent) return
    getAgent(selectedAgent.agent_id)
      .then(detail => setAgentDetail(detail))
      .catch(() => setAgentDetail(null))
  }, [selectedAgent])

  // Load config.yaml
  useEffect(() => {
    if (!selectedAgent) return
    setLoadingConfigYaml(true)
    setConfigYaml(null)
    apiClient.readFile('', `agent-station/nest/${selectedAgent.agent_id}/config.yaml`)
      .then(res => setConfigYaml(res.content))
      .catch(() => setConfigYaml(null))
      .finally(() => setLoadingConfigYaml(false))
  }, [selectedAgent])

  // Load prompt files
  useEffect(() => {
    if (!selectedAgent) return
    setLoadingPromptFiles(true)
    setPromptFiles([])
    apiClient.listFiles('', `agent-station/nest/${selectedAgent.agent_id}/prompts`)
      .then(res => {
        const files = (res.items || [])
          .filter(item => item.type === 'file')
          .map(item => ({
            name: item.name,
            type: item.type as 'file' | 'directory',
            size: item.size,
            full_path: item.full_path || `agent-station/nest/${selectedAgent.agent_id}/prompts/${item.name}`,
          }))
        setPromptFiles(files)
      })
      .catch(() => setPromptFiles([]))
      .finally(() => setLoadingPromptFiles(false))
  }, [selectedAgent])

  // Load skill directories
  useEffect(() => {
    if (!selectedAgent) return
    setLoadingSkills(true)
    setSkillDirs([])
    apiClient.listFiles('', `agent-station/nest/${selectedAgent.agent_id}/skills`)
      .then(res => {
        const dirs = (res.items || [])
          .filter(item => item.type === 'directory')
          .map(item => ({
            name: item.name,
            type: item.type as 'file' | 'directory',
            size: item.size,
            full_path: item.full_path || `agent-station/nest/${selectedAgent.agent_id}/skills/${item.name}`,
          }))
        setSkillDirs(dirs)
      })
      .catch(() => setSkillDirs([]))
      .finally(() => setLoadingSkills(false))
  }, [selectedAgent])

  // Load memory directory
  useEffect(() => {
    if (!selectedAgent) return
    setLoadingMemory(true)
    setMemoryItems([])
    apiClient.listFiles('', `agent-station/nest/${selectedAgent.agent_id}/memory`)
      .then(res => {
        const items = (res.items || []).map(item => ({
          name: item.name,
          type: item.type as 'file' | 'directory',
          size: item.size,
          full_path: item.full_path || `agent-station/nest/${selectedAgent.agent_id}/memory/${item.name}`,
        }))
        setMemoryItems(items)
      })
      .catch(() => setMemoryItems([]))
      .finally(() => setLoadingMemory(false))
  }, [selectedAgent])

  // Open a file in the FileViewer
  const openFile = useCallback(async (file: NestFileItem) => {
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

  // Open a directory — show SKILL.md or first file
  const openDir = useCallback(async (dir: NestFileItem) => {
    setLoadingFileContent(true)
    try {
      const res = await apiClient.listFiles('', dir.full_path)
      const files = (res.items || []).filter(item => item.type === 'file')
      if (files.length > 0) {
        const target = files.find(f => f.name.toUpperCase() === 'SKILL.MD') ?? files.find(f => f.name.toUpperCase() === 'INDEX.MD') ?? files[0]!
        const filePath = `${dir.full_path}/${target.name}`
        const fileRes = await apiClient.readFile('', filePath)
        setViewingFile({
          name: `${dir.name}/${target.name}`,
          type: 'file',
          size: fileRes.size,
          modified_time: new Date().toISOString(),
          path: fileRes.path,
          full_path: fileRes.full_path,
          content: fileRes.content,
        })
      } else {
        showToast('空文件夹', 'info')
      }
    } catch {
      showToast('读取文件失败', 'error')
    } finally {
      setLoadingFileContent(false)
    }
  }, [showToast])

  const goToDetail = useCallback((agent: Agent) => {
    if (scrollRef.current) scrollPos.current = scrollRef.current.scrollTop
    setSelectedAgent(agent)
  }, [])

  const goBack = useCallback(() => {
    setSelectedAgent(null)
    setShowDeleteModal(false)
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollPos.current
    })
  }, [])

  // Detail view
  if (selectedAgent) {
    const status = getAgentStatus(selectedAgent, busyAgentIds)
    return (
      <div className="flex flex-col bg-surface-2" style={{ height: '100%' }}>
        {/* Top bar */}
        <div className="flex items-center border-b border-border shrink-0" style={{
          padding: '8px 12px',
          gap: 8,
        }}>
          <button onClick={goBack} className="text-foreground" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </button>
          <span className="flex-1 text-sm font-semibold text-foreground">Agent 详情</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* Agent Avatar */}
          <div style={{ margin: '0 auto 16px', width: 64, height: 64 }}>
            <AgentAvatar
              agentId={selectedAgent.agent_id}
              avatar={selectedAgent.config?.avatar}
              size={64}
            />
          </div>

          {/* Name (read-only) */}
          <div className="text-base font-semibold text-foreground text-center" style={{ marginBottom: 4 }}>
            {selectedAgent.name}
          </div>
          <div className="text-xs text-muted-foreground text-center" style={{ marginBottom: 12, userSelect: 'all', cursor: 'text' }}>
            {selectedAgent.agent_id}
          </div>

          {/* Status block */}
          <div className="bg-muted border border-border rounded-lg" style={{
            padding: 12,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="text-xs text-muted-foreground">工作状态</span>
              <StatusDot status={status} />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <div><span className="text-muted-foreground">当前任务: </span><span className="text-foreground">-</span></div>
              <div><span className="text-muted-foreground">队列: </span><span className="text-foreground">0</span></div>
              <div><span className="text-muted-foreground">今日完成: </span><span className="text-foreground">0</span></div>
            </div>
          </div>

          {/* config.yaml (expanded by default) */}
          <div style={{ marginBottom: 16 }}>
            <div className="text-xs text-muted-foreground" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText style={{ width: 12, height: 12 }} />
              config.yaml
              <span style={{ fontSize: 10, opacity: 0.6 }}>
                nest/{selectedAgent.agent_id}/
              </span>
            </div>
            {loadingConfigYaml ? (
              <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>加载中...</div>
            ) : configYaml == null ? (
              <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>未配置</div>
            ) : (
              <div className="bg-muted border border-border rounded-md font-mono" style={{
                padding: '10px 12px',
                fontSize: 11,
                lineHeight: 1.7,
                maxHeight: 300,
                overflow: 'auto',
                whiteSpace: 'pre',
              }}>
                {renderYamlHighlighted(configYaml)}
              </div>
            )}
          </div>

          {/* Prompts */}
          <div style={{ marginBottom: 16 }}>
            <div className="text-xs text-muted-foreground" style={{ marginBottom: 6 }}>Prompts</div>
            {loadingPromptFiles ? (
              <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>加载中...</div>
            ) : promptFiles.length === 0 ? (
              <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>暂无 Prompt 文件</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {promptFiles.map(file => (
                  <div
                    key={file.name}
                    onClick={() => openFile(file)}
                    className="flex items-center gap-2 bg-muted border border-border rounded-md cursor-pointer"
                    style={{ padding: '8px 10px' }}
                  >
                    <FileText className="text-primary shrink-0" style={{ width: 14, height: 14 }} />
                    <span className="flex-1 text-sm text-foreground truncate">{file.name}</span>
                    {file.size != null && (
                      <span className="text-muted-foreground shrink-0" style={{ fontSize: 11 }}>
                        {file.size > 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${file.size} B`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills */}
          <div style={{ marginBottom: 16 }}>
            <div className="text-xs text-muted-foreground" style={{ marginBottom: 6 }}>技能</div>
            {loadingSkills ? (
              <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>加载中...</div>
            ) : skillDirs.length === 0 ? (
              <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>暂无技能</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {skillDirs.map(dir => (
                  <div
                    key={dir.name}
                    onClick={() => openDir(dir)}
                    className="flex items-center gap-2 bg-muted border border-border rounded-md cursor-pointer"
                    style={{ padding: '8px 10px' }}
                  >
                    <FolderOpen className="text-primary shrink-0" style={{ width: 14, height: 14 }} />
                    <span className="flex-1 text-sm text-foreground truncate">{dir.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Memory */}
          <div style={{ marginBottom: 16 }}>
            <div className="text-xs text-muted-foreground" style={{ marginBottom: 6 }}>Memory</div>
            {loadingMemory ? (
              <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>加载中...</div>
            ) : memoryItems.length === 0 ? (
              <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>暂无记忆</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {memoryItems.map(item => (
                  <div
                    key={item.name}
                    onClick={() => item.type === 'directory' ? openDir(item) : openFile(item)}
                    className="flex items-center gap-2 bg-muted border border-border rounded-md cursor-pointer"
                    style={{ padding: '8px 10px' }}
                  >
                    {item.type === 'directory' ? (
                      <FolderOpen className="text-primary shrink-0" style={{ width: 14, height: 14 }} />
                    ) : (
                      <FileText className="text-primary shrink-0" style={{ width: 14, height: 14 }} />
                    )}
                    <span className="flex-1 text-sm text-foreground truncate">{item.name}</span>
                    {item.type === 'file' && item.size != null && (
                      <span className="text-muted-foreground shrink-0" style={{ fontSize: 11 }}>
                        {item.size > 1024 ? `${(item.size / 1024).toFixed(1)} KB` : `${item.size} B`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent work */}
          <div style={{ marginBottom: 16 }}>
            <div className="text-xs text-muted-foreground" style={{ marginBottom: 6 }}>最近工作</div>
            {loadingSessions ? (
              <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>加载中...</div>
            ) : recentSessions.length === 0 ? (
              <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>暂无记录</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentSessions.map(session => (
                  <div
                    key={session.session_id}
                    className="bg-muted border border-border rounded-md cursor-pointer"
                    style={{ padding: '8px 10px' }}
                    onClick={() => onSelectSession?.(session.session_id)}
                  >
                    <div className="text-sm text-foreground truncate" style={{ marginBottom: 2 }}>
                      {session.title || '未命名会话'}
                    </div>
                    <div className="text-muted-foreground" style={{ fontSize: 11 }}>
                      {formatRelativeTime(session.updated_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom button */}
        <div className="border-t border-border shrink-0" style={{ padding: 12 }}>
          <button
            onClick={() => onCreateConversation?.(selectedAgent.agent_id)}
            className="w-full bg-primary text-white font-semibold rounded-lg text-sm cursor-pointer"
            style={{
              padding: '10px 0',
              border: 'none',
            }}
          >
            开始对话
          </button>
        </div>

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
            <Loader2 className="text-primary animate-spin" style={{ width: 32, height: 32 }} />
          </div>
        )}

        {/* Full-screen file viewer modal */}
        {viewingFile && (
          <div
            className="fixed inset-0 bg-surface-2 flex flex-col"
            style={{ zIndex: 200 }}
            onKeyDown={(e) => { if (e.key === 'Escape') setViewingFile(null) }}
          >
            <div className="flex items-center gap-2 border-b border-border shrink-0" style={{
              padding: '10px 16px',
              paddingTop: 'max(10px, env(safe-area-inset-top, 10px))',
            }}>
              <button
                onClick={() => setViewingFile(null)}
                className="text-foreground" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
              <FileText className="text-primary" style={{ width: 16, height: 16 }} />
              <span className="text-sm font-semibold text-foreground flex-1 truncate">
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
            <div className="bg-muted border border-border rounded-xl text-center" style={{
              padding: 24,
              width: 320,
            }}>
              <div className="flex justify-center" style={{ marginBottom: 16 }}>
                <AlertTriangle className="text-warning" style={{ width: 40, height: 40 }} />
              </div>
              <div className="text-base font-semibold text-foreground" style={{ marginBottom: 8 }}>确认删除</div>
              <div className="text-sm text-muted-foreground" style={{ marginBottom: 20 }}>
                确定要删除 Agent "{selectedAgent.name}" 吗？此操作无法撤销。
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 border border-border rounded-md text-foreground text-sm cursor-pointer"
                  style={{
                    padding: '8px 0',
                    background: 'transparent',
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
                  className="flex-1 bg-destructive text-white font-semibold rounded-md flex items-center justify-center gap-1.5"
                  style={{
                    padding: '8px 0',
                    border: 'none',
                    fontSize: 13,
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    opacity: isDeleting ? 0.7 : 1,
                  }}
                >
                  {isDeleting && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
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
    <div className="flex flex-col bg-surface-2" style={{ height: '100%' }}>
      <div ref={scrollRef} className="flex-1 overflow-auto" style={{ padding: 12 }}>
        <div className="flex gap-2 border-b border-border" style={{
          marginBottom: 12,
          padding: '0 0 12px',
        }}>
          <MiniStat label="空闲" count={counts.idle} color="#22c55e" />
          <MiniStat label="工作中" count={counts.working} color="#f59e0b" />
          <MiniStat label="离线" count={counts.offline} color="#475569" />
        </div>
        {agents.length === 0 && (
          <div className="text-center text-muted-foreground text-sm" style={{ padding: '40px 0' }}>
            暂无 Agent
          </div>
        )}
        {agents.map(agent => {
          const status = getAgentStatus(agent, busyAgentIds)
          return (
            <button
              key={agent.agent_id}
              onClick={() => goToDetail(agent)}
              className="flex items-center gap-3 w-full bg-muted border border-border rounded-lg cursor-pointer text-left transition-colors hover:bg-muted/80"
              style={{
                padding: 12,
                marginBottom: 8,
              }}
            >
              <AgentAvatar
                agentId={agent.agent_id}
                avatar={agent.config?.avatar}
                size={40}
                className="shrink-0"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-sm font-semibold text-foreground truncate" style={{ marginBottom: 2 }}>
                  {agent.name}
                </div>
                <div className="text-xs text-muted-foreground truncate" style={{ marginBottom: 4 }}>
                  {agent.config?.description || agent.agent_id}
                </div>
                <StatusDot status={status} />
              </div>
              <ChevronRight className="text-muted-foreground shrink-0" style={{ width: 16, height: 16 }} />
            </button>
          )
        })}
      </div>

      {/* Create button / form */}
      <div className="border-t border-border shrink-0" style={{ padding: 12 }}>
        {showCreateForm ? (
          <div className="bg-muted border border-border rounded-lg" style={{
            padding: 12,
          }}>
            <input
              value={newAgentName}
              onChange={e => setNewAgentName(e.target.value)}
              placeholder="Agent 名称"
              className="w-full bg-surface-2 border border-border rounded-md text-foreground outline-none box-border"
              style={{
                padding: '8px 10px',
                fontSize: 13,
                marginBottom: 8,
              }}
            />
            <input
              value={newAgentId}
              onChange={e => setNewAgentId(e.target.value)}
              placeholder="Agent ID"
              className="w-full bg-surface-2 border border-border rounded-md text-foreground outline-none box-border"
              style={{
                padding: '8px 10px',
                fontSize: 13,
                marginBottom: 8,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewAgentName('')
                  setNewAgentId('')
                }}
                className="flex-1 border border-border rounded-md text-foreground text-sm cursor-pointer"
                style={{
                  padding: '8px 0',
                  background: 'transparent',
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
                className="flex-1 bg-primary text-white font-semibold rounded-md flex items-center justify-center gap-1.5"
                style={{
                  padding: '8px 0',
                  border: 'none',
                  fontSize: 13,
                  cursor: isCreatingAgent ? 'not-allowed' : 'pointer',
                  opacity: isCreatingAgent ? 0.7 : 1,
                }}
              >
                {isCreatingAgent && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
                创建
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full border-2 border-dashed border-border rounded-lg text-muted-foreground text-sm cursor-pointer flex items-center justify-center gap-1.5"
            style={{
              padding: '10px 0',
              background: 'transparent',
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
