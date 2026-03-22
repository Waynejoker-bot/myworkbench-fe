/**
 * Mobile Layout Behavior Tests
 *
 * Tests for mobile-specific layout, navigation, and tab behavior.
 */
import { describe, test, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

// Mocks
vi.mock('@/api/session', () => ({
  getSessions: vi.fn().mockResolvedValue({ sessions: [], total: 0 }),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  updateSessionTitle: vi.fn(),
}));

vi.mock('@/api/agent', () => ({
  getChannels: vi.fn().mockResolvedValue({ agents: [] }),
}));

vi.mock('@/api/message-station', () => ({
  getMessages: vi.fn().mockResolvedValue({ messages: [], total: 0, page: 1, total_pages: 1 }),
  extractLatestUpdateTime: vi.fn().mockReturnValue(0),
}));

vi.mock('@/api/chat', () => ({
  sendMessage: vi.fn().mockResolvedValue({}),
  generateMessageId: vi.fn().mockReturnValue('msg-1'),
  textToPayload: vi.fn((t: string) => JSON.stringify({ text: t })),
  startPolling: vi.fn().mockReturnValue(() => {}),
  SendMessageError: class extends Error {
    isAgentBusy() { return false; }
  },
}));

vi.mock('@/lib/session-storage', () => ({
  sessionStorage: {
    getSessionTimestamp: vi.fn().mockReturnValue(0),
    saveSessionTimestamp: vi.fn(),
  },
}));

describe('Mobile Layout', () => {

  test('Window width <=768px should render MobileLayout', () => {
    const source = readSource('pages/ChatBoxPage.tsx');

    // ChatBoxPage checks isMobile = window.innerWidth <= 768
    const hasBreakpoint = /innerWidth\s*<=\s*768|max-width:\s*768/.test(source);
    expect(hasBreakpoint).toBe(true);

    // When isMobile is true, it renders MobileLayout
    const rendersMobile = /if\s*\(isMobile\)[\s\S]*?<MobileLayout/.test(source);
    expect(rendersMobile).toBe(true);
  });

  test('Window width >768px should render desktop three-column layout', () => {
    const source = readSource('pages/ChatBoxPage.tsx');

    // After the isMobile check, the desktop layout has ChatSidebar + main + PanelShell
    const hasThreeColumns = /ChatSidebar/.test(source) &&
      /<main/.test(source) &&
      /PanelShell/.test(source);

    expect(hasThreeColumns).toBe(true);
  });

  test('Mobile chat tab should show conversation list by default', () => {
    const source = readSource('components/mobile/MobileLayout.tsx');

    // Default state: chatView = "list"
    const defaultList = /useState.*["']list["']/.test(source);
    expect(defaultList).toBe(true);

    // Default tab: activeTab = "chat"
    const defaultChat = /useState.*["']chat["']/.test(source);
    expect(defaultChat).toBe(true);
  });

  test('Mobile: clicking conversation should switch to chat view', () => {
    const source = readSource('components/mobile/MobileLayout.tsx');

    // handleSelectConversation sets chatView to "conversation"
    const switchesToConversation = /setChatView\(["']conversation["']\)/.test(source);
    expect(switchesToConversation).toBe(true);
  });

  test('Mobile: back button in chat should return to list', () => {
    const source = readSource('components/mobile/MobileLayout.tsx');

    // handleBackToList sets chatView to "list"
    const backsToList = /handleBackToList[\s\S]*?setChatView\(["']list["']\)/.test(source);
    expect(backsToList).toBe(true);

    // Check ArrowLeft button calls handleBackToList
    const hasBackButton = /onClick\s*=\s*\{handleBackToList\}/.test(source);
    expect(hasBackButton).toBe(true);
  });

  test('Mobile: settings tab should show menu with 3 items', () => {
    const source = readSource('components/mobile/MobileLayout.tsx');

    // settingsMenuItems has 3 items: agents, files, tools
    const hasAgents = /key:\s*["']agents["']/.test(source);
    const hasFiles = /key:\s*["']files["']/.test(source);
    const hasTools = /key:\s*["']tools["']/.test(source);
    expect(hasAgents && hasFiles && hasTools).toBe(true);

    // Count the items in settingsMenuItems array
    const itemMatches = source.match(/key:\s*["'](?:agents|files|tools)["']/g);
    expect(itemMatches).not.toBeNull();
    expect(itemMatches!.length).toBe(3);
  });

  test('Mobile: clicking Agents menu should show agent list', () => {
    const source = readSource('components/mobile/MobileLayout.tsx');

    // handleOpenPanel sets settingsPanel and switches to panel view
    const opensPanel = /handleOpenPanel[\s\S]*?setSettingsPanel[\s\S]*?setSettingsView\(["']panel["']\)/.test(source);
    expect(opensPanel).toBe(true);

    // Settings panel "agents" renders AgentPanel
    const rendersAgentPanel = /settingsPanel\s*===\s*["']agents["'][\s\S]*?AgentPanel/.test(source);
    expect(rendersAgentPanel).toBe(true);
  });

  test('Mobile: + button should open agent selection popup', () => {
    const source = readSource('components/mobile/MobileLayout.tsx');

    // The + button toggles showAgentPopup
    const togglesPopup = /setShowAgentPopup\(!showAgentPopup\)|setShowAgentPopup\(true\)/.test(source);
    expect(togglesPopup).toBe(true);

    // Popup renders agent list
    const hasPopup = /showAgentPopup[\s\S]*?agents\.map/.test(source);
    expect(hasPopup).toBe(true);
  });

  test('Mobile: bottom tab bar should have 2 tabs', () => {
    const source = readSource('components/mobile/BottomTabBar.tsx');

    // tabs array has chat and settings entries
    const chatTab = /key:\s*["']chat["']/.test(source);
    const settingsTab = /key:\s*["']settings["']/.test(source);
    expect(chatTab && settingsTab).toBe(true);

    // Count exactly 2 tab entries
    const tabEntries = source.match(/key:\s*["'](?:chat|settings)["']/g);
    expect(tabEntries).not.toBeNull();
    expect(tabEntries!.length).toBe(2);
  });

  test('Mobile: active tab should use primary color', () => {
    const source = readSource('components/mobile/BottomTabBar.tsx');

    // Active tab uses #0ea5e9 (primary blue), inactive uses #475569
    const hasActiveColor = /isActive\s*\?[\s\S]*?#0ea5e9/.test(source);
    const hasInactiveColor = /#475569/.test(source);

    expect(hasActiveColor && hasInactiveColor).toBe(true);
  });
});

describe('Mobile: AgentPanel Props Wiring', () => {

  const source = readSource('components/mobile/MobileLayout.tsx');

  test('PanelComponent should receive onCreateConversation prop', () => {
    const passesOnCreate = /PanelComponent[\s\S]*?onCreateConversation\s*=\s*\{/.test(source);
    expect(passesOnCreate).toBe(true);
  });

  test('PanelComponent should receive onSelectSession prop', () => {
    const passesOnSelect = /PanelComponent[\s\S]*?onSelectSession\s*=\s*\{/.test(source);
    expect(passesOnSelect).toBe(true);
  });

  test('onCreateConversation should switch to chat conversation view after creating', () => {
    // After creating conversation, mobile should navigate to chat view
    const switchesView = /onCreateConversation[\s\S]*?setChatView\(["']conversation["']\)[\s\S]*?setActiveTab\(["']chat["']\)/s.test(source);
    expect(switchesView).toBe(true);
  });

  test('onSelectSession should switch to chat conversation view after selecting', () => {
    // After selecting a session, mobile should navigate to chat view
    const switchesView = /onSelectSession[\s\S]*?setChatView\(["']conversation["']\)[\s\S]*?setActiveTab\(["']chat["']\)/s.test(source);
    expect(switchesView).toBe(true);
  });

  test('onSelectSession should call parent onSelectConversation', () => {
    const callsParent = /onSelectSession[\s\S]*?onSelectConversation\(sessionId\)/.test(source);
    expect(callsParent).toBe(true);
  });

  test('onCreateConversation should call parent onCreateConversation', () => {
    const callsParent = /onCreateConversation[\s\S]*?onCreateConversation\(agentId\)/.test(source);
    expect(callsParent).toBe(true);
  });
});

describe('Mobile: ChatInput Layout Compatibility', () => {

  const source = readSource('components/chat/ChatInput.tsx');

  test('ChatInput should use flex-column layout (two rows, not single inline row)', () => {
    // The outer container should NOT use flex-row with items-stretch (old layout)
    const hasOldLayout = /flex items-stretch.*gap-2.*rounded-2xl/.test(source);
    expect(hasOldLayout).toBe(false);

    // Should have rounded-2xl border container wrapping both rows
    const hasContainerWrapper = /rounded-2xl border/.test(source);
    expect(hasContainerWrapper).toBe(true);
  });

  test('ChatInput textarea should have no fixed width constraints (adapts to container)', () => {
    // Textarea uses w-full to fill parent width
    const hasFullWidth = /w-full.*bg-transparent.*resize-none/.test(source);
    expect(hasFullWidth).toBe(true);
  });

  test('ChatInput toolbar should use justify-between for left/right button spacing', () => {
    const hasJustifyBetween = /justify-between/.test(source);
    expect(hasJustifyBetween).toBe(true);
  });

  test('ChatInput is shared between mobile and desktop (same component)', () => {
    const mobileSource = readSource('components/mobile/MobileLayout.tsx');
    // Mobile uses the same ChatInput component
    const importsChatInput = /import.*ChatInput.*from.*chat\/ChatInput/.test(mobileSource);
    const rendersChatInput = /<ChatInput/.test(mobileSource);
    expect(importsChatInput).toBe(true);
    expect(rendersChatInput).toBe(true);
  });
});

describe('Mobile: Full-Screen File Viewer Safe Area', () => {

  const source = readSource('components/panel/panels/AgentPanel.tsx');

  test('file viewer modal should use position fixed with inset 0', () => {
    const hasFixedInset = /viewingFile[\s\S]*?position:\s*['"]fixed['"][\s\S]*?inset:\s*0/.test(source);
    expect(hasFixedInset).toBe(true);
  });

  test('file viewer modal header should have safe-area-inset-top padding', () => {
    const hasSafeArea = /safe-area-inset-top/.test(source);
    expect(hasSafeArea).toBe(true);
  });

  test('file viewer modal should have high z-index to overlay mobile UI', () => {
    // z-index should be >= 200 to cover mobile bottom tab bar (z-50) and other elements
    const hasHighZIndex = /viewingFile[\s\S]*?zIndex:\s*200/.test(source);
    expect(hasHighZIndex).toBe(true);
  });
});
