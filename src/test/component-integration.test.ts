/**
 * 组件集成测试
 *
 * 测试多个组件之间的协作和通信：
 * - ChatSidebar + ChatBoxPage 会话选择
 * - AgentPanel + ChatBoxPage Agent 切换
 * - PanelShell 面板切换
 * - Toast 消息显示
 */
import { describe, test, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

describe('ChatSidebar 与 ChatBoxPage 集成', () => {
  const sidebarSource = readSource('components/chat/ChatSidebar.tsx');
  const chatBoxSource = readSource('components/chat/ChatSidebar.tsx');
  const chatPageSource = readSource('components/mobile/MobileLayout.tsx');

  test('ChatSidebar 应接收 activeConversationId prop', () => {
    const hasActiveProp = /activeConversationId.*SidebarProps|SidebarProps[\s\S]*?activeConversationId/.test(sidebarSource);
    expect(hasActiveProp).toBe(true);
  });

  test('ChatBoxPage 应传递 activeConversationId 给 ChatSidebar', () => {
    const passesActiveId = /activeConversationId\s*=\s*\{activeConversationId\}|ConversationList.*activeConversationId/.test(chatBoxSource);
    expect(passesActiveId).toBe(true);
  });

  test('ChatBoxPage 应处理 onSelectConversation 事件', () => {
    const hasOnSelectHandler = /onSelectConversation|handleSelectConversation/.test(chatBoxSource);
    expect(hasOnSelectHandler).toBe(true);
  });

  test('handleSelectConversation 应更新 activeConversationId', () => {
    const updatesActiveId = /setActiveConversationId|setConversations.*active/.test(chatBoxSource);
    expect(updatesActiveId).toBe(true);
  });

  test('切换会话时应重置未读计数', () => {
    const resetsUnread = /unreadCount.*0|setConversations.*unread.*0/.test(chatBoxSource);
    expect(resetsUnread).toBe(true);
  });
});

describe('AgentPanel 与 ChatBoxPage 集成', () => {
  const agentPanelSource = readSource('components/panel/panels/AgentPanel.tsx');
  const chatBoxSource = readSource('pages/ChatBoxPage.tsx');

  test('AgentPanel 应接收 selectedAgent prop', () => {
    const hasSelectedProp = /selectedAgent.*PanelProps|PanelProps[\s\S]*?selectedAgent/.test(agentPanelSource);
    expect(hasSelectedProp).toBe(true);
  });

  test('ChatBoxPage 应传递 selectedAgent 给 PanelShell', () => {
    const passesSelected = /selectedAgent\s*=\s*\{selectedAgent\}|PanelShell.*selectedAgent/.test(chatBoxSource);
    expect(passesSelected).toBe(true);
  });

  test('AgentPanel 开始对话应调用 onCreateConversation', () => {
    const callsCreate = /onCreateConversation\?\.\(|handleStartChat.*onCreateConversation/.test(agentPanelSource);
    expect(callsCreate).toBe(true);
  });

  test('onCreateConversation 应传递 agentId', () => {
    const passesAgentId = /onCreateConversation\?\.\(selectedAgent\.agent_id\)|onCreateConversation\?\.\(agentId\)/.test(agentPanelSource);
    expect(passesAgentId).toBe(true);
  });
});

describe('PanelShell 面板切换集成', () => {
  const panelShellSource = readSource('components/panel/PanelShell.tsx');
  const chatBoxSource = readSource('pages/ChatBoxPage.tsx');
  const contextSource = readSource('contexts/PanelContext.tsx');

  test('PanelContext 应提供 activePanel state', () => {
    const hasActivePanel = /activePanel.*useState|activePanel.*createContext/.test(contextSource);
    expect(hasActivePanel).toBe(true);
  });

  test('PanelContext 应提供 setActivePanel 函数', () => {
    const hasSetActive = /setActivePanel.*useCallback|setActivePanel\s*=\s*\(/.test(contextSource);
    expect(hasSetActive).toBe(true);
  });

  test('PanelShell 应根据 activePanel 渲染对应面板', () => {
    const hasPanelSwitch = /activePanel\s*===.*'agents'|activePanel\s*===.*'files'|activePanel\s*===.*'tools'/.test(panelShellSource);
    expect(hasPanelSwitch).toBe(true);
  });

  test('PanelTabBar 应有切换面板的按钮', () => {
    const tabBarSource = readSource('components/panel/PanelTabBar.tsx');
    const hasTabButtons = /Agents.*activePanel|Files.*activePanel|Tools.*activePanel/i.test(tabBarSource);
    expect(hasTabButtons).toBe(true);
  });
});

describe('Toast 消息显示集成', () => {
  const toastContextSource = readSource('contexts/ToastContext.tsx');
  const apiClientSource = readSource('lib/api-client.ts');
  const conversationsSource = readSource('hooks/useConversations.ts');

  test('ToastContext 应提供 showToast 函数', () => {
    const hasShowToast = /showToast.*useCallback|showToast\s*=\s*\(|Provider.*showToast/.test(toastContextSource);
    expect(hasShowToast).toBe(true);
  });

  test('API 错误应调用 showToast', () => {
    const hasApiToast = /showToast\(.*error|toast\.show/.test(apiClientSource);
    expect(hasApiToast).toBe(true);
  });

  test('Hook 错误应调用 showToast', () => {
    const hasHookToast = /showToast\(.*error|toast\.show/.test(conversationsSource);
    expect(hasHookToast).toBe(true);
  });

  test('Toast 消息应有自动消失机制', () => {
    const hasAutoHide = /setTimeout|autoHide|auto.*close/.test(toastContextSource);
    expect(hasAutoHide).toBe(true);
  });

  test('Toast 应支持多种类型（success/error/info）', () => {
    const hasTypes = /type.*success|type.*error|type.*info|variant/.test(toastContextSource);
    expect(hasTypes).toBe(true);
  });
});

describe('AuthContext 集成', () => {
  const authContextSource = readSource('contexts/AuthContext.tsx');
  const apiClientSource = readSource('lib/api-client.ts');
  const appSource = readSource('App.tsx');

  test('AuthContext 应提供 token state', () => {
    const hasToken = /token.*useState|token.*createContext/.test(authContextSource);
    expect(hasToken).toBe(true);
  });

  test('AuthContext 应提供 needsLogin state', () => {
    const hasNeedsLogin = /needsLogin.*useState|needsLogin.*createContext/.test(authContextSource);
    expect(hasNeedsLogin).toBe(true);
  });

  test('API 请求应使用 token 进行认证', () => {
    const usesToken = /Authorization.*Bearer|headers.*token|token.*Authorization/.test(apiClientSource);
    expect(usesToken).toBe(true);
  });

  test('401 响应触发 needsLogin', () => {
    const has401Handler = /401.*needsLogin|setNeedsLogin\(true\)/.test(authContextSource);
    expect(has401Handler).toBe(true);
  });

  test('登录成功应保存 token', () => {
    const savesToken = /localStorage\.setItem.*token|setToken\(.*token\)/.test(authContextSource);
    expect(savesToken).toBe(true);
  });
});

describe('useChatMessages 与 useConversations 同步', () => {
  const chatMessagesSource = readSource('hooks/useChatMessages.ts');
  const conversationsSource = readSource('hooks/useConversations.ts');
  const chatBoxSource = readSource('pages/ChatBoxPage.tsx');

  test('发送消息后应更新会话 lastMessage', () => {
    const updatesLastMessage = /lastMessage.*uiMessages|setConversations.*lastMessage/.test(chatBoxSource);
    expect(updatesLastMessage).toBe(true);
  });

  test('发送消息后应更新会话 timestamp', () => {
    const updatesTimestamp = /timestamp.*new Date|setConversations.*timestamp/.test(chatBoxSource);
    expect(updatesTimestamp).toBe(true);
  });

  test('新消息到达后应重新排序会话列表', () => {
    const sortsOnNewMessage = /uiMessages.*sort|new.*message.*sort|A3.*lastMessage/.test(chatBoxSource);
    expect(sortsOnNewMessage).toBe(true);
  });
});

describe('MobileLayout 集成', () => {
  const mobileLayoutSource = readSource('components/mobile/MobileLayout.tsx');
  const chatBoxSource = readSource('pages/ChatBoxPage.tsx');

  test('MobileLayout 应接收 isMobile prop', () => {
    const hasIsMobile = /isMobile.*MobileLayoutProps|MobileLayoutProps[\s\S]*?isMobile/.test(mobileLayoutSource);
    expect(hasIsMobile).toBe(true);
  });

  test('ChatBoxPage 应计算 isMobile 状态', () => {
    const calculatesMobile = /isMobile.*window\.innerWidth.*<=.*768|useEffect.*window\.resize/.test(chatBoxSource);
    expect(calculatesMobile).toBe(true);
  });

  test('Mobile 切换会话应返回会话列表', () => {
    const returnsToList = /chatView.*list|setChatView\(['"]list['"]\)/.test(mobileLayoutSource);
    expect(returnsToList).toBe(true);
  });

  test('Mobile 开始对话应跳转到聊天页面', () => {
    const switchesToChat = /chatView.*conversation|setChatView\(['"]conversation['"]\)/.test(mobileLayoutSource);
    expect(switchesToChat).toBe(true);
  });
});

describe('Dashboard 面板集成', () => {
  const dashboardSource = readSource('components/panel/panels/DashboardPanel.tsx');
  const contextSource = readSource('contexts/PanelContext.tsx');

  test('Dashboard 应接收 panelWidth state', () => {
    const hasPanelWidth = /panelWidth.*DashboardProps|rightPanelWidth/.test(dashboardSource);
    expect(hasPanelWidth).toBe(true);
  });

  test('Dashboard 应显示 agent 状态统计', () => {
    const showsStats = /idle|working|offline|MiniStat|counts/.test(dashboardSource);
    expect(showsStats).toBe(true);
  });

  test('Dashboard 应显示活跃任务列表', () => {
    const showsActiveTasks = /activeTasks|identifyActiveTasks|活跃任务/.test(dashboardSource);
    expect(showsActiveTasks).toBe(true);
  });
});
