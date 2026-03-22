import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface PanelState {
  activeTabId: string
  rightPanelWidth: number
  isCollapsed: boolean
  switchTab: (id: string) => void
  togglePanel: () => void
  setWidth: (n: number) => void
}

const STORAGE_KEY = 'panel-state'

function loadPersistedState(): { width: number; collapsed: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { width?: number; collapsed?: boolean }
      return {
        width: typeof parsed.width === 'number' ? parsed.width : 320,
        collapsed: typeof parsed.collapsed === 'boolean' ? parsed.collapsed : false,
      }
    }
  } catch {
    // ignore
  }
  return { width: 320, collapsed: false }
}

const PanelContext = createContext<PanelState | null>(null)

export function PanelProvider({ children }: { children: ReactNode }) {
  const [persisted] = useState(loadPersistedState)
  const [activeTabId, setActiveTabId] = useState('agents')
  const [rightPanelWidth, setRightPanelWidth] = useState(persisted.width)
  const [isCollapsed, setIsCollapsed] = useState(persisted.collapsed)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ width: rightPanelWidth, collapsed: isCollapsed }))
  }, [rightPanelWidth, isCollapsed])

  const switchTab = useCallback((id: string) => {
    setActiveTabId(id)
    if (isCollapsed) setIsCollapsed(false)
  }, [isCollapsed])

  const togglePanel = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  const setWidth = useCallback((n: number) => {
    setRightPanelWidth(n)
  }, [])

  return (
    <PanelContext.Provider value={{ activeTabId, rightPanelWidth, isCollapsed, switchTab, togglePanel, setWidth }}>
      {children}
    </PanelContext.Provider>
  )
}

export function usePanelContext(): PanelState {
  const ctx = useContext(PanelContext)
  if (!ctx) throw new Error('usePanelContext must be used within PanelProvider')
  return ctx
}
