import { ComponentType } from 'react'

export interface PanelPlugin {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  component: ComponentType<PanelProps>
  closable?: boolean  // false for built-in tabs
}

export interface PanelProps {
  sessionId: string
  agentId: string
  isActive: boolean
  onCreateConversation?: (agentId: string) => void
  onSelectSession?: (sessionId: string) => void
  /** 前端检测到正在流式输出的 agent IDs（后端状态不可靠，需前端补偿） */
  busyAgentIds?: Set<string>
}
