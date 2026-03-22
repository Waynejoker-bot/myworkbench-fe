/**
 * Button Click Handlers Actually Work
 *
 * Tests that buttons DO SOMETHING meaningful when clicked,
 * not just "the button renders" but "clicking it triggers the right action".
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
;
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

// Mock modules
vi.mock('@/api/agent', () => ({
  getChannels: vi.fn().mockResolvedValue({
    agents: [
      {
        agent_id: 'agent-1',
        name: 'TestAgent',
        enabled: true,
        tools: ['code_exec'],
        config: { description: 'Test' },
      },
    ],
  }),
}));

vi.mock('@/api/session', () => ({
  getSessions: vi.fn().mockResolvedValue({ sessions: [], total: 0 }),
  createSession: vi.fn().mockResolvedValue({
    session_id: 's-new',
    title: '新会话',
    status: 'active',
    agent_id: 'agent-1',
    created_at: 20260322100000,
    updated_at: 20260322100000,
  }),
  deleteSession: vi.fn().mockResolvedValue({}),
  updateSessionTitle: vi.fn().mockResolvedValue({ title: 'Updated' }),
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

describe('Button Click Handlers Actually Work', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('AgentPanel "删除" confirm button should call delete API (not just close modal)', () => {
    // Source code analysis: the delete confirm button onClick is:
    //   onClick={() => setShowDeleteModal(false)}
    // It just closes the modal! No API call.
    const source = readSource('components/panel/panels/AgentPanel.tsx');

    // Find the delete button inside the delete modal
    // Look for the 删除 button that's inside the modal (after "确认删除")
    const modalSection = source.slice(source.indexOf('确认删除'));
    const deleteButtonInModal = modalSection.match(/删除[\s\S]*?<\/button>/);
    expect(deleteButtonInModal).not.toBeNull();

    // Check if the onClick calls an API (deleteAgent, deleteChannel, etc.)
    const deleteOnClick = modalSection.match(/onClick\s*=\s*\{[^}]*\}/g);
    const hasApiCall = deleteOnClick?.some(handler =>
      /delete|remove|api|fetch/i.test(handler) && !/setShowDeleteModal/.test(handler)
    );

    expect(hasApiCall).toBe(true);
  });

  test('AgentPanel "保存" edit button should call update API (not just close edit mode)', () => {
    const source = readSource('components/panel/panels/AgentPanel.tsx');

    // Find the 保存 button
    const saveButtonMatch = source.match(/保存[\s\S]*?<\/button>/);
    expect(saveButtonMatch).not.toBeNull();

    // Get the onClick handler for 保存
    // Current code: onClick={() => setIsEditing(false)} — no API call
    const saveSection = source.slice(
      Math.max(0, source.indexOf('保存') - 300),
      source.indexOf('保存') + 10
    );

    const hasApiCall = /update|patch|put|save.*api|apiClient/i.test(saveSection);
    expect(hasApiCall).toBe(true);
  });

  test('AgentPanel "开始对话" button should call createConversation with agent ID', () => {
    const source = readSource('components/panel/panels/AgentPanel.tsx');

    // Find the 开始对话 button
    const startChatMatch = source.match(/开始对话/);
    expect(startChatMatch).not.toBeNull();

    // Check that the onClick calls onCreateConversation with the agent's ID
    // The button's onClick is: () => onCreateConversation?.(selectedAgent.agent_id)
    const callsCreateConversation = /onCreateConversation\?\.\(selectedAgent\.agent_id\)/.test(source);
    expect(callsCreateConversation).toBe(true);
  });

  test('AgentPanel "+ 创建新 Agent" button should have a real click handler', () => {
    const source = readSource('components/panel/panels/AgentPanel.tsx');

    // Find the create button
    const createIdx = source.indexOf('创建新 Agent');
    expect(createIdx).toBeGreaterThan(-1);

    // Look for onClick in the button wrapping this text
    const buttonSection = source.slice(Math.max(0, createIdx - 600), createIdx);
    const hasOnClick = /onClick\s*=\s*\{/.test(buttonSection);

    expect(hasOnClick).toBe(true);
  });

  test('ConversationList inline edit Enter should call updateConversationTitle API', () => {
    // The inline edit handleEditKeyDown just calls setEditingId(null)
    // It does NOT call updateConversationTitle
    const source = readSource('components/chat/ConversationList.tsx');

    const handleEditKeyDown = source.match(/handleEditKeyDown[\s\S]*?\}\s*,\s*\[/);
    expect(handleEditKeyDown).not.toBeNull();

    const handler = handleEditKeyDown![0];

    // Should call some update function, not just close editing
    const callsUpdate = /updateConversationTitle|onUpdateTitle|onRename|onEdit|saveEdit/i.test(handler);
    expect(callsUpdate).toBe(true);
  });

  test('ConversationList inline edit should have onChange to capture new value', () => {
    // The inline edit input uses defaultValue but has no onChange handler
    // So the edited value is never captured
    const source = readSource('components/chat/ConversationList.tsx');

    // Find the edit input
    const editInputMatch = source.match(/<input[\s\S]*?onBlur\s*=\s*\{handleEditBlur\}[\s\S]*?\/>/);
    expect(editInputMatch).not.toBeNull();

    const editInput = editInputMatch![0];

    // Check for onChange or value (controlled input)
    const hasOnChange = /onChange\s*=/.test(editInput);
    const hasValueBinding = /value\s*=\s*\{/.test(editInput);

    // Either controlled (value + onChange) or at least reads ref value
    expect(hasOnChange || hasValueBinding).toBe(true);
  });

  test('PanelShell collapse button should toggle isCollapsed state', () => {
    // The collapse button in PanelTabBar calls onToggleCollapse which is togglePanel
    const source = readSource('components/panel/PanelShell.tsx');

    // PanelShell uses togglePanel from context - this WORKS
    const hasToggle = /togglePanel/.test(source);
    expect(hasToggle).toBe(true);

    // Also verify PanelContext.togglePanel actually toggles state
    const contextSource = readSource('contexts/PanelContext.tsx');
    const toggleImpl = contextSource.match(/togglePanel\s*=\s*useCallback[\s\S]*?\}\s*,\s*\[/);
    expect(toggleImpl).not.toBeNull();

    const impl = toggleImpl![0];
    const togglesState = /setIsCollapsed\(prev\s*=>\s*!prev\)/.test(impl);
    expect(togglesState).toBe(true);
  });

  test('PanelShell expand button should set isCollapsed to false', () => {
    const source = readSource('components/panel/PanelShell.tsx');

    // When collapsed, clicking the expand button calls togglePanel
    const collapsedSection = source.match(/if\s*\(isCollapsed\)[\s\S]*?return\s*\([\s\S]*?\)\s*\}/);
    expect(collapsedSection).not.toBeNull();

    const section = collapsedSection![0];
    const hasClickHandler = /onClick\s*=\s*\{togglePanel\}/.test(section);
    expect(hasClickHandler).toBe(true);
  });

  test('ChatInput + menu items should trigger file input with correct accept filter', () => {
    const source = readSource('components/chat/ChatInput.tsx');

    // Check that handlePlusMenuItem sets the correct accept and triggers click
    const hasImageAccept = /image\/\*/.test(source);
    const hasDocAccept = /\.docx|\.doc/.test(source);
    const triggersClick = /fileInputRef\.current\?\.click\(\)/.test(source);

    expect(hasImageAccept && hasDocAccept && triggersClick).toBe(true);
  });

  test('MessageBubble retry link should call onRetry callback with message ID', () => {
    const source = readSource('components/chat/message/MessageBubble.tsx');

    // Check that onRetry is called with the message ID
    const retryCall = /onRetry\s*&&[\s\S]*?onClick\s*=\s*\{\(\)\s*=>\s*onRetry\(/.test(source);
    expect(retryCall).toBe(true);

    // Verify it passes the correct argument
    const passesMessageId = /onRetry\(.*?message\.id/.test(source);
    expect(passesMessageId).toBe(true);
  });
});
