import { Bot, FolderOpen, Wrench } from 'lucide-react'
import { AgentPanel } from './panels/AgentPanel'
import { FilesPanel } from './panels/FilesPanel'
import { ToolsPanel } from './panels/ToolsPanel'
import type { PanelPlugin } from '@/types/panel-plugin'

export const builtinPanels: PanelPlugin[] = [
  { id: 'agents', label: 'Agents', icon: Bot, component: AgentPanel, closable: false },
  { id: 'files', label: '文件', icon: FolderOpen, component: FilesPanel, closable: false },
  { id: 'tools', label: '工具', icon: Wrench, component: ToolsPanel, closable: false },
]
