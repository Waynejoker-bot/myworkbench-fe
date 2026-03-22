import { describe, it, expect } from 'vitest';
import { aggregateChannelStatus } from '@/hooks/useDashboard';
import { channelToAgent, type Channel } from '@/api/agent';

/**
 * Bug: AgentPanel 的 MiniStat 计数与 Agent 列表显示的状态不一致
 *
 * 根因: AgentPanel 使用 useDashboard().counts（基于 aggregateChannelStatus）
 * 显示顶部统计，但使用 useAgents() 的 agents + getAgentStatus() 显示每个 Agent 的状态。
 * 两个 hook 各自独立请求 /msapi/channels，时间差导致数据不同步。
 * 而且两套状态判断逻辑（aggregateChannelStatus vs getAgentStatus）行为不完全一致。
 *
 * 修复方案: AgentPanel 应基于同一数据源（agents 列表）计算 counts，
 * 而不是依赖独立的 useDashboard hook。
 */

type WorkStatus = 'idle' | 'busy' | 'offline';

// 复制 AgentPanel 中的 getAgentStatus 逻辑
function getAgentStatus(agent: { enabled?: boolean; status?: string }): WorkStatus {
  if (agent.enabled === false) return 'offline';
  if (agent.status === 'SESSION_BUSY') return 'busy';
  if (agent.status === 'SESSION_IDLE') return 'idle';
  if (agent.status === 'OFFLINE') return 'offline';
  return 'idle';
}

// 基于 agents 列表直接计算 counts（修复后的方案）
function aggregateAgentStatus(agents: { enabled?: boolean; status?: string }[]): { idle: number; working: number; offline: number } {
  const counts = { idle: 0, working: 0, offline: 0 };
  for (const agent of agents) {
    const status = getAgentStatus(agent);
    if (status === 'idle') counts.idle++;
    else if (status === 'busy') counts.working++;
    else counts.offline++;
  }
  return counts;
}

function makeChannel(id: string, status: string): Channel {
  return {
    channel_id: id,
    status,
    agent_name: id,
    batch_size: 1,
    created_at: 0,
    updated_at: 0,
  };
}

describe('Bug: AgentPanel MiniStat 计数与 Agent 列表状态不一致', () => {

  describe('aggregateChannelStatus 和 getAgentStatus 的逻辑差异', () => {

    it('SESSION_BUSY: aggregateChannelStatus 计为 working, getAgentStatus 计为 busy — 语义一致', () => {
      const channel = makeChannel('nvwa', 'SESSION_BUSY');
      const channelCounts = aggregateChannelStatus([channel]);
      const agent = channelToAgent(channel);
      const agentStatus = getAgentStatus(agent);

      expect(channelCounts.working).toBe(1);
      expect(agentStatus).toBe('busy');
      // 这里语义一致：都认为是"工作中"
    });

    it('enabled=false 但 status=SESSION_BUSY 时两套逻辑不一致', () => {
      // channelToAgent 把 status !== "OFFLINE" 的都设为 enabled=true
      // 所以正常流程不会出现 enabled=false + SESSION_BUSY
      // 但如果手动构造这种情况，两套逻辑的结果不同
      const agent = { enabled: false, status: 'SESSION_BUSY' };

      // getAgentStatus: enabled=false → offline
      expect(getAgentStatus(agent)).toBe('offline');

      // aggregateChannelStatus 不检查 enabled，只看 status
      // 它会把 SESSION_BUSY 计为 working
      const channel = makeChannel('test', 'SESSION_BUSY');
      expect(aggregateChannelStatus([channel]).working).toBe(1);
    });

    it('未知 status 时两套逻辑不一致', () => {
      const channel = makeChannel('test', 'SOME_UNKNOWN_STATUS');
      const channelCounts = aggregateChannelStatus([channel]);
      const agent = channelToAgent(channel);
      const agentStatus = getAgentStatus(agent);

      // aggregateChannelStatus: 未知状态 → offline
      expect(channelCounts.offline).toBe(1);
      expect(channelCounts.idle).toBe(0);

      // getAgentStatus: 未知状态 + enabled=true → idle
      expect(agent.enabled).toBe(true);  // status !== "OFFLINE" → enabled=true
      expect(agentStatus).toBe('idle');

      // 不一致！Dashboard 说 offline，Agent 列表说 idle
    });
  });

  describe('修复方案: 基于 agents 列表计算 counts 保证一致', () => {

    it('SESSION_BUSY agent 应计入 working', () => {
      const channels = [
        makeChannel('nvwa', 'SESSION_BUSY'),
        makeChannel('coder', 'SESSION_IDLE'),
        makeChannel('offline-bot', 'OFFLINE'),
      ];
      const agents = channels.map(channelToAgent);
      const counts = aggregateAgentStatus(agents);

      expect(counts.working).toBe(1);
      expect(counts.idle).toBe(1);
      expect(counts.offline).toBe(1);

      // 同时验证各 agent 的列表状态和计数一致
      expect(getAgentStatus(agents[0]!)).toBe('busy');   // nvwa → busy → counts.working
      expect(getAgentStatus(agents[1]!)).toBe('idle');    // coder → idle → counts.idle
      expect(getAgentStatus(agents[2]!)).toBe('offline'); // offline-bot → offline → counts.offline
    });

    it('多个 SESSION_BUSY agents 应全部计入 working', () => {
      const channels = [
        makeChannel('nvwa', 'SESSION_BUSY'),
        makeChannel('coder', 'SESSION_BUSY'),
        makeChannel('helper', 'SESSION_IDLE'),
      ];
      const agents = channels.map(channelToAgent);
      const counts = aggregateAgentStatus(agents);

      expect(counts.working).toBe(2);
      expect(counts.idle).toBe(1);
    });

    it('未知 status 时 counts 和列表状态一致（都为 idle）', () => {
      const channels = [makeChannel('mystery', 'SOME_UNKNOWN')];
      const agents = channels.map(channelToAgent);
      const counts = aggregateAgentStatus(agents);

      // 修复后：counts 基于 getAgentStatus，未知状态 → idle
      expect(counts.idle).toBe(1);
      expect(counts.offline).toBe(0);
      expect(getAgentStatus(agents[0]!)).toBe('idle');
    });

    it('空列表返回全零', () => {
      expect(aggregateAgentStatus([])).toEqual({ idle: 0, working: 0, offline: 0 });
    });

    it('所有 agents 为 idle', () => {
      const channels = [
        makeChannel('a', 'SESSION_IDLE'),
        makeChannel('b', 'SESSION_IDLE'),
        makeChannel('c', 'SESSION_IDLE'),
      ];
      const agents = channels.map(channelToAgent);
      const counts = aggregateAgentStatus(agents);

      expect(counts).toEqual({ idle: 3, working: 0, offline: 0 });
    });

    it('所有 agents 为 offline', () => {
      const channels = [
        makeChannel('a', 'OFFLINE'),
        makeChannel('b', 'OFFLINE'),
      ];
      const agents = channels.map(channelToAgent);
      const counts = aggregateAgentStatus(agents);

      expect(counts).toEqual({ idle: 0, working: 0, offline: 2 });
    });
  });

  describe('数据源分离问题的本质', () => {

    it('同一 channel 数据在两套系统中应得到一致的 working 计数', () => {
      // 模拟：nvwa 是 SESSION_BUSY
      const channels = [
        makeChannel('nvwa', 'SESSION_BUSY'),
        makeChannel('coder', 'SESSION_IDLE'),
        makeChannel('helper', 'SESSION_IDLE'),
      ];

      // Dashboard 的计数（旧逻辑）
      const dashboardCounts = aggregateChannelStatus(channels);

      // Agent 列表的计数（新逻辑 - 基于 agents 列表）
      const agents = channels.map(channelToAgent);
      const agentListCounts = aggregateAgentStatus(agents);

      // 对于标准的 SESSION_BUSY/SESSION_IDLE/OFFLINE 状态
      // 两者应该一致
      expect(agentListCounts.working).toBe(dashboardCounts.working);
      expect(agentListCounts.idle).toBe(dashboardCounts.idle);
      expect(agentListCounts.offline).toBe(dashboardCounts.offline);
    });

    it('非标准 status 在两套系统中得到不同计数 — 这是 bug', () => {
      const channels = [
        makeChannel('mystery', 'INITIALIZING'),
      ];

      const dashboardCounts = aggregateChannelStatus(channels);
      const agents = channels.map(channelToAgent);
      const agentListCounts = aggregateAgentStatus(agents);

      // Dashboard 把未知状态计为 offline
      expect(dashboardCounts.offline).toBe(1);
      expect(dashboardCounts.idle).toBe(0);

      // Agent 列表把未知状态（enabled=true）计为 idle
      expect(agentListCounts.idle).toBe(1);
      expect(agentListCounts.offline).toBe(0);

      // 不一致！这就是 bug — 修复方案应统一使用 agentListCounts
    });
  });
});
