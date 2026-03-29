import { Bot, FolderOpen } from 'lucide-react'
import { AgentPanel } from './panels/AgentPanel'
import { FilesPanel } from './panels/FilesPanel'
import type { PanelPlugin } from '@/types/panel-plugin'

export const builtinPanels: PanelPlugin[] = [
  { id: 'agents', label: 'Agents', icon: Bot, component: AgentPanel, closable: false },
  { id: 'files', label: '文件', icon: FolderOpen, component: FilesPanel, closable: false },
]
