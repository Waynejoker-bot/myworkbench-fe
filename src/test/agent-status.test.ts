import { describe, it, expect } from 'vitest';

// Test the getAgentStatus logic used in AgentPanel
type WorkStatus = 'idle' | 'busy' | 'offline';

function getAgentStatus(agent: {
  enabled?: boolean;
  status?: string;
}): WorkStatus {
  if (agent.enabled === false) return 'offline';
  if (agent.status === 'SESSION_BUSY') return 'busy';
  if (agent.status === 'SESSION_IDLE') return 'idle';
  if (agent.status === 'OFFLINE') return 'offline';
  return 'idle';
}

describe('getAgentStatus', () => {
  it('returns busy for SESSION_BUSY', () => {
    expect(getAgentStatus({ enabled: true, status: 'SESSION_BUSY' })).toBe(
      'busy',
    );
  });

  it('returns idle for SESSION_IDLE', () => {
    expect(getAgentStatus({ enabled: true, status: 'SESSION_IDLE' })).toBe(
      'idle',
    );
  });

  it('returns offline for OFFLINE status', () => {
    expect(getAgentStatus({ enabled: true, status: 'OFFLINE' })).toBe(
      'offline',
    );
  });

  it('returns offline when enabled is false regardless of status', () => {
    expect(getAgentStatus({ enabled: false, status: 'SESSION_BUSY' })).toBe(
      'offline',
    );
  });

  it('returns idle for unknown status', () => {
    expect(getAgentStatus({ enabled: true, status: 'UNKNOWN' })).toBe('idle');
  });

  it('returns idle when status is undefined', () => {
    expect(getAgentStatus({ enabled: true })).toBe('idle');
  });

  it('returns offline when enabled is explicitly false and no status', () => {
    expect(getAgentStatus({ enabled: false })).toBe('offline');
  });
});
