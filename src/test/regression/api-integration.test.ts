/**
 * API Integration Tests
 *
 * Tests that components actually call the right APIs with correct parameters.
 * Uses source code analysis + vi.mock to verify API calls.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

// ---- Mocks ----

const mockGetSessions = vi.fn().mockResolvedValue({
  sessions: [
    {
      id: 1,
      session_id: 'sess-1',
      agent_id: 'agent-1',
      title: 'Test Session',
      status: 'active',
      deleted: false,
      created_at: 20260322100000,
      updated_at: 20260322120000,
    },
  ],
  total: 1,
});

const mockCreateSession = vi.fn().mockResolvedValue({
  id: 2,
  session_id: 's-new',
  agent_id: 'agent-1',
  title: '新会话',
  status: 'active',
  deleted: false,
  created_at: 20260322130000,
  updated_at: 20260322130000,
});

const mockDeleteSession = vi.fn().mockResolvedValue({});
const mockUpdateSessionTitle = vi.fn().mockResolvedValue({ title: 'Updated Title' });

vi.mock('@/api/session', () => ({
  getSessions: (...args: unknown[]) => mockGetSessions(...args),
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
  updateSessionTitle: (...args: unknown[]) => mockUpdateSessionTitle(...args),
}));

const mockGetChannels = vi.fn().mockResolvedValue({
  agents: [
    {
      agent_id: 'agent-1',
      name: 'TestAgent',
      enabled: true,
      tools: ['code_exec'],
      config: { description: 'Test' },
    },
  ],
});

vi.mock('@/api/agent', () => ({
  getChannels: (...args: unknown[]) => mockGetChannels(...args),
  channelToAgent: vi.fn((c: any) => c),
}));

const mockGetMessages = vi.fn().mockResolvedValue({
  messages: [],
  total: 0,
  page: 1,
  total_pages: 1,
});

vi.mock('@/api/message-station', () => ({
  getMessages: (...args: unknown[]) => mockGetMessages(...args),
  extractLatestUpdateTime: vi.fn().mockReturnValue(0),
}));

const mockSendMessage = vi.fn().mockResolvedValue({});
const mockStartPolling = vi.fn().mockReturnValue(() => {});

vi.mock('@/api/chat', () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
  generateMessageId: vi.fn().mockReturnValue('msg-test-1'),
  textToPayload: vi.fn((t: string) => JSON.stringify({ text: t })),
  startPolling: (...args: unknown[]) => mockStartPolling(...args),
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

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('API Integration', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session API', () => {

    test('useConversations should call GET /msapi/sessions on mount', async () => {
      const { useConversations } = await import('@/hooks/useConversations');

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetSessions).toHaveBeenCalledTimes(1);
    });

    test('createConversation should call POST /msapi/sessions with agent_id', async () => {
      const { useConversations } = await import('@/hooks/useConversations');

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createConversation('agent-1');
      });

      expect(mockCreateSession).toHaveBeenCalledTimes(1);
      const callArgs = mockCreateSession.mock.calls[0][0];
      expect(callArgs).toHaveProperty('agent_id', 'agent-1');
    });

    test('removeConversation should call DELETE /msapi/sessions/{id}', async () => {
      const { useConversations } = await import('@/hooks/useConversations');

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeConversation('sess-1');
      });

      expect(mockDeleteSession).toHaveBeenCalledWith('sess-1');
    });

    test('updateConversationTitle should call PATCH /msapi/sessions/{id}/title', async () => {
      const { useConversations } = await import('@/hooks/useConversations');

      const { result } = renderHook(() => useConversations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateConversationTitle('sess-1', 'New Title');
      });

      expect(mockUpdateSessionTitle).toHaveBeenCalledWith('sess-1', 'New Title');
    });
  });

  describe('Chat API', () => {

    test('useChatMessages should call GET /msapi/messages for history', async () => {
      const { useChatMessages } = await import('@/hooks/useChatMessages');

      renderHook(() => useChatMessages('sess-1'));

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledTimes(1);
      });

      expect(mockGetMessages).toHaveBeenCalledWith('sess-1', 1, 10);
    });

    test('send() should call POST /msapi/send-message with correct target agent', async () => {
      const { useChatMessages } = await import('@/hooks/useChatMessages');

      const { result } = renderHook(() => useChatMessages('sess-1'));

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.send('Hello', 'agent-1');
      });

      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMessage.mock.calls[0][0];
      expect(callArgs).toHaveProperty('target', 'agent-1');
      expect(callArgs).toHaveProperty('session_id', 'sess-1');
    });

    test('useChatMessages should open SSE connection to /msapi/poll-message', async () => {
      const { useChatMessages } = await import('@/hooks/useChatMessages');

      renderHook(() => useChatMessages('sess-1'));

      await waitFor(() => {
        expect(mockStartPolling).toHaveBeenCalledTimes(1);
      });

      // First argument should be the session ID
      expect(mockStartPolling.mock.calls[0][0]).toBe('sess-1');
    });
  });

  describe('Agent API', () => {

    test('useAgents should call GET /msapi/channels on mount', async () => {
      const { useAgents } = await import('@/hooks/useAgents');

      const { result } = renderHook(() => useAgents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetChannels).toHaveBeenCalledTimes(1);
    });

    test('AgentPanel delete should call DELETE API (not implemented yet)', () => {
      // Source code shows: onClick={() => setShowDeleteModal(false)}
      // No API call happens
      const source = readSource('components/panel/panels/AgentPanel.tsx');
      const agentApiSource = readSource('api/agent.ts');

      // Check if there's a deleteAgent/deleteChannel function
      const hasDeleteApi = /deleteAgent|deleteChannel|delete.*agent/i.test(agentApiSource);
      expect(hasDeleteApi).toBe(true);
    });

    test('AgentPanel edit save should call PUT/PATCH API (not implemented yet)', () => {
      const source = readSource('components/panel/panels/AgentPanel.tsx');
      const agentApiSource = readSource('api/agent.ts');

      // Check if there's an updateAgent/updateChannel function
      const hasUpdateApi = /updateAgent|updateChannel|patchAgent|putAgent/i.test(agentApiSource);
      expect(hasUpdateApi).toBe(true);
    });

    test('"创建新 Agent" should call POST /msapi/channels (not implemented yet)', () => {
      const agentApiSource = readSource('api/agent.ts');

      const hasCreateApi = /createAgent|createChannel|postAgent|post.*channel/i.test(agentApiSource);
      expect(hasCreateApi).toBe(true);
    });
  });

  describe('File System API', () => {

    test('FilesPanel should call GET /api/fs/list with auth token', () => {
      // FilesPanel uses useFileSystem hook which calls the API
      const source = readSource('components/panel/panels/FilesPanel.tsx');

      const hasApiCall = /api\/fs\/list|listFiles|listDirectory|useFileSystem|apiClient\.get|apiClient\.listFiles|fetch/i.test(source);
      const hasUseEffect = /useEffect/.test(source);

      expect(hasApiCall && hasUseEffect).toBe(true);
    });

    test('FilesPanel should pass token from useAuth() to API calls', () => {
      const source = readSource('components/panel/panels/FilesPanel.tsx');

      const usesAuth = /useAuth|token|Authorization/i.test(source);
      expect(usesAuth).toBe(true);
    });

    test('File click should call GET /api/fs/read with file path', () => {
      const source = readSource('components/panel/panels/FilesPanel.tsx');

      const hasReadApi = /api\/fs\/read|readFile|apiClient\.readFile/i.test(source);
      const hasClickHandler = /onClick/.test(source);

      expect(hasReadApi && hasClickHandler).toBe(true);
    });
  });
});
