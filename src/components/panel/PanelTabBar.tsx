import { ChevronRight } from 'lucide-react'
import type { PanelPlugin } from '@/types/panel-plugin'

interface PanelTabBarProps {
  tabs: PanelPlugin[]
  activeTabId: string
  onTabSelect: (id: string) => void
  onToggleCollapse: () => void
}

export function PanelTabBar({ tabs, activeTabId, onTabSelect, onToggleCollapse }: PanelTabBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: '#f9fafb',
        borderBottom: '1px solid #d1d5db',
        height: 56,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId
          return (
            <button
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 14px',
                height: 56,
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #0ea5e9' : '2px solid transparent',
                color: isActive ? '#0ea5e9' : '#64748b',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              <tab.icon className="w-[15px] h-[15px]" />
              {tab.label}
            </button>
          )
        })}
      </div>
      <button
        onClick={onToggleCollapse}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          marginRight: 4,
          background: 'transparent',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          borderRadius: 4,
        }}
        title="折叠面板"
      >
        <ChevronRight style={{ width: 16, height: 16 }} />
      </button>
    </div>
  )
}
