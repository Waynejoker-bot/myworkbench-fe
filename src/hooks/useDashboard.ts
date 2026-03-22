import { useState, useEffect, useCallback } from 'react';
import type { Channel, ChannelListResponse } from '@/api/agent';
import { getSessions } from '@/api/session';
import { apiClient } from '@/lib/api-client';

export interface StatusCounts {
  idle: number;
  working: number;
  offline: number;
}

export function aggregateChannelStatus(channels: Channel[]): StatusCounts {
  const counts: StatusCounts = { idle: 0, working: 0, offline: 0 };
  for (const ch of channels) {
    if (ch.status === 'SESSION_IDLE') counts.idle++;
    else if (ch.status === 'SESSION_BUSY') counts.working++;
    else counts.offline++;
  }
  return counts;
}

export function identifyActiveTasks(channels: Channel[]): Channel[] {
  return channels
    .filter(ch => ch.current_session_id)
    .slice(0, 5);
}

export interface ActiveTask {
  agentId: string;
  agentName: string;
  sessionId: string;
  sessionTitle: string;
}

export interface RecentActivity {
  agentId: string;
  sessionId: string;
  title: string;
  updatedAt: number;
}

export interface DashboardData {
  counts: StatusCounts;
  activeTasks: ActiveTask[];
  recentActivity: RecentActivity[];
  isLoading: boolean;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData>({
    counts: { idle: 0, working: 0, offline: 0 },
    activeTasks: [],
    recentActivity: [],
    isLoading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const [channelsResp, sessionsResp] = await Promise.all([
        apiClient.get<ChannelListResponse>('/msapi/channels'),
        getSessions({ limit: 10 }),
      ]);

      const channels = channelsResp.channels || [];
      const counts = aggregateChannelStatus(channels);
      const activeChannels = identifyActiveTasks(channels);

      const activeTasks: ActiveTask[] = activeChannels.map(ch => ({
        agentId: ch.channel_id,
        agentName: ch.agent_name || ch.channel_id,
        sessionId: ch.current_session_id!,
        sessionTitle: ch.current_session_id || 'Working...',
      }));

      const recentActivity: RecentActivity[] = (sessionsResp.sessions || []).slice(0, 10).map(s => ({
        agentId: s.agent_id || '',
        sessionId: s.session_id,
        title: s.title || s.session_id,
        updatedAt: s.updated_at,
      }));

      setData({ counts, activeTasks, recentActivity, isLoading: false });
    } catch (error) {
      console.error('Dashboard refresh failed:', error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { ...data, refresh };
}
