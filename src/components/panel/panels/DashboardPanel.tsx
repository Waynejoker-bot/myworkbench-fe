import { useDashboard } from '@/hooks/useDashboard'
import { RefreshCw, Loader2 } from 'lucide-react'
import { AgentAvatar } from '@/components/ui/AgentAvatar'

export function DashboardPanel() {
  const { counts, activeTasks, recentActivity, isLoading, refresh } = useDashboard()

  return (
    <div className="flex flex-col bg-surface-2" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex items-center border-b border-border shrink-0" style={{ padding: '8px 12px' }}>
        <span className="flex-1 text-sm font-semibold text-foreground">团队概览</span>
        <button
          onClick={refresh}
          className="text-muted-foreground"
          style={{
            background: 'transparent',
            border: 'none',
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
            <Loader2 className="text-primary animate-spin" style={{ width: 24, height: 24 }} />
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
              <div className="text-xs text-muted-foreground font-semibold" style={{ marginBottom: 8 }}>进行中的任务</div>
              {activeTasks.length === 0 ? (
                <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>当前没有进行中的任务</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeTasks.map(task => (
                    <div
                      key={task.sessionId}
                      className="bg-muted border border-border rounded-md flex items-center"
                      style={{
                        padding: '8px 10px',
                        gap: 8,
                      }}
                    >
                      <AgentAvatar
                        agentId={task.agentId}
                        size={28}
                        className="shrink-0"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="text-xs text-foreground truncate">
                          {task.agentName}
                        </div>
                        <div className="text-muted-foreground truncate" style={{ fontSize: 11 }}>
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
              <div className="text-xs text-muted-foreground font-semibold" style={{ marginBottom: 8 }}>最近活动</div>
              {recentActivity.length === 0 ? (
                <div className="text-xs text-muted-foreground" style={{ padding: '8px 0' }}>暂无活动记录</div>
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
                      <div className="bg-border rounded-full shrink-0" style={{
                        width: 4,
                        height: 4,
                      }} />
                      <span className="text-foreground flex-1 truncate">
                        {activity.title}
                      </span>
                      <span className="text-muted-foreground shrink-0" style={{ fontSize: 11 }}>
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
    <div className="bg-muted border border-border rounded-lg text-center" style={{ padding: '12px 8px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginBottom: 2 }}>{count}</div>
      <div className="text-muted-foreground" style={{ fontSize: 11 }}>{label}</div>
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
