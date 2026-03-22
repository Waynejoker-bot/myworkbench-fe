import { Wrench } from 'lucide-react'
import { useAgents } from '@/hooks/useAgents'
import type { PanelProps } from '@/types/panel-plugin'

export function ToolsPanel({ agentId }: PanelProps) {
  const { agents } = useAgents()
  const agent = agents.find(a => a.agent_id === agentId)
  const tools = agent?.tools || []

  return (
    <div style={{ height: '100%', background: '#f9fafb', padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
        {agent?.name ? `${agent.name} 的工具` : '工具'}
      </div>
      {tools.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569', fontSize: 13 }}>
          暂无工具信息
        </div>
      ) : (
        tools.map(tool => (
          <div key={tool} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', marginBottom: 6,
            background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8,
          }}>
            <Wrench style={{ width: 16, height: 16, color: '#64748b', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#111827' }}>{tool}</span>
          </div>
        ))
      )}
    </div>
  )
}
