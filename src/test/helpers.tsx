import React, { type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { PanelProvider } from '@/contexts/PanelContext';
import type { Conversation } from '@/hooks/useConversations';
import type { Agent } from '@/api/agent';
import type { UIMessage } from '@/types/message-station';
import { MessageStatus, DeliveryStatus } from '@/types/message-station';
import { ContentType } from '@/types/content-block';

// ========================
// Mock Data Factories
// ========================

export function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    title: '测试会话',
    lastMessage: '',
    timestamp: new Date('2026-03-22T10:00:00'),
    unreadCount: 0,
    status: 'active',
    agentId: 'agent-1',
    ...overrides,
  };
}

export function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    agent_id: 'agent-1',
    name: 'TestAgent',
    enabled: true,
    tools: ['code_execution', 'web_search'],
    config: {
      description: 'A test agent',
    },
    ...overrides,
  };
}

export function makeUIMessage(overrides: Partial<UIMessage> = {}): UIMessage {
  return {
    id: 'msg-1',
    source: 'user-zc',
    target: 'agent-1',
    role: 'user',
    content: 'Hello',
    contentBlocks: [{ type: ContentType.MARKDOWN, content: 'Hello' }],
    chunks: [{ seq: 0, status: MessageStatus.END, content: 'Hello', timestamp: Date.now() }],
    messageStatus: MessageStatus.END,
    deliveryStatus: DeliveryStatus.ACKED,
    startTime: Date.now(),
    timestamp: Date.now(),
    context: {},
    hasError: false,
    ...overrides,
  } as UIMessage;
}

export function makeAgentsMap(agents: Agent[]): Map<string, Agent> {
  const map = new Map<string, Agent>();
  for (const a of agents) map.set(a.agent_id, a);
  return map;
}

// ========================
// Provider Wrapper
// ========================

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <PanelProvider>
          {children}
        </PanelProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// ========================
// Mock Session API responses
// ========================

export const mockSessionResponse = {
  sessions: [
    {
      id: 1,
      session_id: 'sess-1',
      agent_id: 'agent-1',
      title: '会话A',
      status: 'active' as const,
      deleted: false,
      created_at: 20260322100000,
      updated_at: 20260322120000,
    },
    {
      id: 2,
      session_id: 'sess-2',
      agent_id: 'agent-2',
      title: '会话B',
      status: 'active' as const,
      deleted: false,
      created_at: 20260322090000,
      updated_at: 20260322110000,
    },
  ],
  total: 2,
};

export const mockAgentResponse = {
  agents: [
    makeAgent({ agent_id: 'agent-1', name: 'Agent Alpha' }),
    makeAgent({ agent_id: 'agent-2', name: 'Agent Beta', tools: ['database'] }),
  ],
};
