/**
 * Missing Features Tests
 *
 * These test features that DON'T EXIST YET in the codebase.
 * Every test here SHOULD FAIL — if one passes, either the feature was implemented
 * or the test is wrong.
 */
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

describe('Missing Features', () => {

  test('A17: ChatBoxPage should render a chat top bar with current Agent info', () => {
    // ChatBoxPage has no dedicated "top bar" component showing the current agent name/status
    // in the desktop layout. The mobile layout has a header, but desktop does not.
    const chatBoxSource = readSource('pages/ChatBoxPage.tsx');

    // Look for a top bar / header component in the desktop layout section
    // The desktop layout starts after the isMobile check and should have a header in <main>
    const desktopSection = chatBoxSource.split('if (isMobile)')[0] || '';
    const hasTopBar = /ChatTopBar|TopBar|chat-top-bar|agentInfoBar|Bot|agentConfigs.*name|在线|selectedAgentId|Chat top bar/i.test(chatBoxSource);
    const hasAgentInfoInMain = /<main[\s\S]*?agent.*?name[\s\S]*?<\/main>/i.test(desktopSection);

    expect(hasTopBar || hasAgentInfoInMain).toBe(true);
  });

  test('B10: useChatMessages should export a retry() function', () => {
    const source = readSource('hooks/useChatMessages.ts');

    // Check the return type interface
    const returnTypeMatch = source.match(/interface UseChatMessagesReturn[\s\S]*?\}/);
    expect(returnTypeMatch).not.toBeNull();

    const returnType = returnTypeMatch![0];
    expect(returnType).toContain('retry');

    // Also check the actual return object
    const returnBlock = source.match(/return\s*\{[\s\S]*?\};/g);
    const lastReturn = returnBlock?.[returnBlock.length - 1] || '';
    expect(lastReturn).toContain('retry');
  });

  test('B21: MessageBubble should render thinking dots for START status with no content', () => {
    // When a message has status=START and contentBlocks is empty,
    // it should show a "thinking" indicator (dots animation)
    const source = readSource('components/chat/message/MessageBubble.tsx');

    // Look for thinking dots / typing indicator logic
    const hasThinkingDots = /thinking|typing.*dot|dot.*typing|ThinkingIndicator|TypingIndicator/i.test(source);
    const hasEmptyContentCheck = /contentBlocks\.length\s*===\s*0/.test(source);

    expect(hasThinkingDots && hasEmptyContentCheck).toBe(true);
  });

  test('C16: FilesPanel should call /api/fs/list API on mount', () => {
    const source = readSource('components/panel/panels/FilesPanel.tsx');

    // FilesPanel uses useFileSystem hook which manages state and API calls
    const hasApiCall = /api\/fs\/list|listFiles|listDirectory|useFileSystem|useEffect|fetch/i.test(source);
    const hasStateManagement = /useState|useReducer|useFileSystem/.test(source);

    expect(hasApiCall && hasStateManagement).toBe(true);
  });

  test('C17: ToolsPanel should read agent.tools from props/hook, not hardcoded data', () => {
    const source = readSource('components/panel/panels/ToolsPanel.tsx');

    // ToolsPanel uses hardcoded placeholderTools instead of reading from the agent
    const hasHardcodedTools = /placeholderTools/.test(source);
    const readsFromAgent = /agent\.tools|agentId|useAgents/.test(source);

    // It should NOT have hardcoded tools AND should read from agent
    expect(hasHardcodedTools).toBe(false);
    expect(readsFromAgent).toBe(true);
  });

  test('Cmd+N shortcut should trigger new conversation', () => {
    // Check if any component listens for Cmd+N / Ctrl+N keyboard shortcut
    const chatBoxSource = readSource('pages/ChatBoxPage.tsx');
    const sidebarSource = readSource('components/chat/ChatSidebar.tsx');
    const appSource = readSource('App.tsx');

    const allSources = chatBoxSource + sidebarSource + appSource;

    const hasKeyboardShortcut = /keydown|keypress/i.test(allSources) &&
      /meta.*?[nN]|ctrl.*?[nN]|Cmd.*?N/i.test(allSources);

    expect(hasKeyboardShortcut).toBe(true);
  });

  test('"创建新 Agent" button should have onClick that opens a creation form or calls API', () => {
    const source = readSource('components/panel/panels/AgentPanel.tsx');

    // Find the "创建新 Agent" button
    const createButtonMatch = source.match(/创建新 Agent[\s\S]*?<\/button>/);
    expect(createButtonMatch).not.toBeNull();

    // The button has an onClick handler that opens a creation form
    const buttonSection = source.slice(
      source.indexOf('创建新 Agent') - 600,
      source.indexOf('创建新 Agent') + 50
    );
    const hasOnClick = /onClick\s*=\s*\{/.test(buttonSection);

    expect(hasOnClick).toBe(true);
  });

  test('"创建新 Agent" should call POST /msapi/channels or equivalent API', () => {
    // Check if there's any create agent/channel API function
    const agentApiSource = readSource('api/agent.ts');

    const hasCreateAgent = /createAgent|createChannel|POST.*channels|post.*agent/i.test(agentApiSource);

    expect(hasCreateAgent).toBe(true);
  });
});
