import { useCallback, useEffect, useRef, useState } from 'react'
import { PanelRightOpen } from 'lucide-react'
import { usePanelContext } from '@/contexts/PanelContext'
import { PanelTabBar } from './PanelTabBar'
import type { PanelPlugin } from '@/types/panel-plugin'

interface PanelShellProps {
  tabs: PanelPlugin[]
  sessionId: string
  agentId: string
  onCreateConversation?: (agentId: string) => void
  onSelectSession?: (sessionId: string) => void
  busyAgentIds?: Set<string>
}

export function PanelShell({ tabs, sessionId, agentId, onCreateConversation, onSelectSession, busyAgentIds }: PanelShellProps) {
  const { activeTabId, rightPanelWidth, isCollapsed, switchTab, togglePanel, setWidth } = usePanelContext()
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartWidth.current = rightPanelWidth
    e.preventDefault()
  }, [rightPanelWidth])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartX.current - e.clientX
      const newWidth = Math.max(280, Math.min(600, dragStartWidth.current + delta))
      setWidth(newWidth)
    }

    const handleMouseUp = () => setIsDragging(false)

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, setWidth])

  if (isCollapsed) {
    return (
      <div
        style={{
          width: 40,
          flexShrink: 0,
          background: '#f9fafb',
          borderLeft: '1px solid #d1d5db',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={togglePanel}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 4,
          }}
          title="展开面板"
        >
          <PanelRightOpen style={{ width: 18, height: 18 }} />
        </button>
      </div>
    )
  }

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0]

  return (
    <div style={{ display: 'flex', flexShrink: 0 }}>
      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        style={{
          width: 4,
          cursor: 'col-resize',
          background: isDragging ? '#0ea5e9' : '#d1d5db',
          transition: 'background 0.15s',
        }}
      />
      <div
        style={{
          width: rightPanelWidth,
          background: '#f9fafb',
          borderLeft: '1px solid #d1d5db',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <PanelTabBar
          tabs={tabs}
          activeTabId={activeTab?.id ?? ''}
          onTabSelect={switchTab}
          onToggleCollapse={togglePanel}
        />
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab && (
            <activeTab.component
              sessionId={sessionId}
              agentId={agentId}
              isActive={true}
              onCreateConversation={onCreateConversation}
              onSelectSession={onSelectSession}
              busyAgentIds={busyAgentIds}
            />
          )}
        </div>
      </div>
    </div>
  )
}
