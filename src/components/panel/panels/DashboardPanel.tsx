import { useDashboard } from '@/hooks/useDashboard'
import { RefreshCw, Loader2 } from 'lucide-react'
import { AgentAvatar } from '@/components/ui/AgentAvatar'

export function DashboardPanel() {
  const { counts, activeTasks, recentActivity, isLoading, refresh } = useDashboard()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid #d1d5db',
        flexShrink: 0,
      }}>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#111827' }}>团队概览</span>
        <button
          onClick={refresh}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
          }}
          title="刷新"
        >
          <RefreshCw style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader2 style={{ width: 24, height: 24, color: '#0ea5e9', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <>
            {/* Status Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              <StatusCard label="空闲" count={counts.idle} color="#22c55e" />
              <StatusCard label="工作中" count={counts.working} color="#f59e0b" />
              <StatusCard label="离线" count={counts.offline} color="#475569" />
            </div>

            {/* Active Tasks */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>进行中的任务</div>
              {activeTasks.length === 0 ? (
                <div style={{ fontSize: 12, color: '#475569', padding: '8px 0' }}>当前没有进行中的任务</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeTasks.map(task => (
                    <div
                      key={task.sessionId}
                      style={{
                        padding: '8px 10px',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <AgentAvatar
                        agentId={task.agentId}
                        size={28}
                        className="shrink-0"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.agentName}
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.sessionTitle}
                        </div>
                      </div>
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#f59e0b',
                        animation: 'pulse 1.4s ease-in-out infinite',
                        flexShrink: 0,
                      }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>最近活动</div>
              {recentActivity.length === 0 ? (
                <div style={{ fontSize: 12, color: '#475569', padding: '8px 0' }}>暂无活动记录</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {recentActivity.map(activity => (
                    <div
                      key={activity.sessionId}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                      }}
                    >
                      <div style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: '#d1d5db',
                        flexShrink: 0,
                      }} />
                      <span style={{ color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activity.title}
                      </span>
                      <span style={{ color: '#475569', fontSize: 11, flexShrink: 0 }}>
                        {formatTime(activity.updatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{
      padding: '12px 8px',
      background: '#f3f4f6',
      border: '1px solid #d1d5db',
      borderRadius: 8,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginBottom: 2 }}>{count}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
    </div>
  )
}

function formatTime(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '-'
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}
