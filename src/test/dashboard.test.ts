import { describe, it, expect } from 'vitest';
import { aggregateChannelStatus, identifyActiveTasks } from '@/hooks/useDashboard';

describe('aggregateChannelStatus', () => {
  it('counts statuses correctly', () => {
    const channels = [
      { channel_id: 'a', status: 'SESSION_IDLE' },
      { channel_id: 'b', status: 'SESSION_BUSY' },
      { channel_id: 'c', status: 'SESSION_IDLE' },
      { channel_id: 'd', status: 'OFFLINE' },
    ];
    expect(aggregateChannelStatus(channels as any)).toEqual({ idle: 2, working: 1, offline: 1 });
  });

  it('returns all zeros for empty array', () => {
    expect(aggregateChannelStatus([])).toEqual({ idle: 0, working: 0, offline: 0 });
  });

  it('treats unknown status as offline', () => {
    const channels = [{ channel_id: 'x', status: 'UNKNOWN' }];
    expect(aggregateChannelStatus(channels as any)).toEqual({ idle: 0, working: 0, offline: 1 });
  });
});

describe('identifyActiveTasks', () => {
  it('filters channels with current_session_id', () => {
    const channels = [
      { channel_id: 'a', status: 'SESSION_BUSY', current_session_id: 'sess-1' },
      { channel_id: 'b', status: 'SESSION_IDLE', current_session_id: null },
      { channel_id: 'c', status: 'SESSION_BUSY', current_session_id: 'sess-2' },
    ];
    const active = identifyActiveTasks(channels as any);
    expect(active).toHaveLength(2);
    expect(active.map(a => a.channel_id)).toEqual(['a', 'c']);
  });

  it('caps at 5 results', () => {
    const channels = Array.from({ length: 10 }, (_, i) => ({
      channel_id: `agent-${i}`,
      status: 'SESSION_BUSY',
      current_session_id: `sess-${i}`,
    }));
    expect(identifyActiveTasks(channels as any)).toHaveLength(5);
  });
});

import { channelToAgent } from '@/api/agent';

describe('channelToAgent', () => {
  it('preserves SESSION_BUSY status', () => {
    const channel = {
      channel_id: 'agent-1',
      status: 'SESSION_BUSY',
      agent_name: 'Test Agent',
      batch_size: 1,
      created_at: 0,
      updated_at: 0,
    };
    const agent = channelToAgent(channel as any);
    expect(agent.status).toBe('SESSION_BUSY');
    expect(agent.enabled).toBe(true);
  });

  it('preserves SESSION_IDLE status', () => {
    const channel = {
      channel_id: 'agent-2',
      status: 'SESSION_IDLE',
      agent_name: 'Idle Agent',
      batch_size: 1,
      created_at: 0,
      updated_at: 0,
    };
    const agent = channelToAgent(channel as any);
    expect(agent.status).toBe('SESSION_IDLE');
    expect(agent.enabled).toBe(true);
  });

  it('marks OFFLINE agents as disabled', () => {
    const channel = {
      channel_id: 'agent-3',
      status: 'OFFLINE',
      agent_name: 'Offline Agent',
      batch_size: 1,
      created_at: 0,
      updated_at: 0,
    };
    const agent = channelToAgent(channel as any);
    expect(agent.status).toBe('OFFLINE');
    expect(agent.enabled).toBe(false);
  });

  it('preserves agent_name and description', () => {
    const channel = {
      channel_id: 'agent-4',
      status: 'SESSION_IDLE',
      agent_name: 'My Agent',
      description: 'A test agent',
      batch_size: 1,
      created_at: 0,
      updated_at: 0,
    };
    const agent = channelToAgent(channel as any);
    expect(agent.name).toBe('My Agent');
    expect(agent.config?.description).toBe('A test agent');
  });
});
