import { MessageSquare, Settings } from "lucide-react";

type TabType = "chat" | "settings";

interface BottomTabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { key: TabType; label: string; icon: typeof MessageSquare }[] = [
  { key: "chat", label: "对话", icon: MessageSquare },
  { key: "settings", label: "配置", icon: Settings },
];

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#f9fafb",
        borderTop: "1px solid #d1d5db",
        display: "flex",
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: "8px 0",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: isActive ? "#0ea5e9" : "#475569",
              transition: "color 0.15s",
            }}
          >
            <Icon style={{ width: 22, height: 22 }} />
            <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
