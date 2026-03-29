import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Inbox, MessageSquare } from 'lucide-react';
import { useTaskCardStore } from '@/store/useTaskCardStore';
import { TaskCardCompactItem } from '@/components/workspace/TaskCardCompactItem';
import type { TaskCard } from '@/types/task-card';

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------
type FilterKey = 'all' | 'pending' | 'inProgress' | 'completed';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'inProgress', label: '进行中' },
  { key: 'completed', label: '已完成' },
];

// ---------------------------------------------------------------------------
// Sub-group definitions for display
// ---------------------------------------------------------------------------
interface DisplayGroup {
  key: string;
  label: string;
  cards: TaskCard[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  dimmed?: boolean;
}

const PENDING_STATUSES = [
  'suggested',
  'awaiting_confirmation',
  'draft',
  'awaiting_sales_confirmation',
];
const CONFIRMED_STATUSES = ['confirmed'];
const IN_PROGRESS_STATUSES = ['dispatched', 'accepted', 'in_progress', 'reported'];
const FEEDBACK_STATUSES = ['feedback_submitted', 'received_by_supervisor'];
const COMPLETED_STATUSES = ['completed'];

function buildDisplayGroups(grouped: {
  pending: TaskCard[];
  inProgress: TaskCard[];
  completed: TaskCard[];
}): DisplayGroup[] {
  const all = [...grouped.pending, ...grouped.inProgress, ...grouped.completed];

  const pendingCards = all.filter((c) => PENDING_STATUSES.includes(c.status));
  const confirmedCards = all.filter((c) => CONFIRMED_STATUSES.includes(c.status));
  const inProgressCards = all.filter((c) => IN_PROGRESS_STATUSES.includes(c.status));
  const feedbackCards = all.filter((c) => FEEDBACK_STATUSES.includes(c.status));
  const completedCards = all.filter((c) => COMPLETED_STATUSES.includes(c.status));

  const groups: DisplayGroup[] = [];

  if (pendingCards.length > 0) {
    groups.push({ key: 'pending', label: '待处理', cards: pendingCards });
  }
  if (confirmedCards.length > 0) {
    groups.push({ key: 'confirmed', label: '已确认待派发', cards: confirmedCards });
  }
  if (inProgressCards.length > 0) {
    groups.push({ key: 'inProgress', label: '进行中', cards: inProgressCards });
  }
  if (feedbackCards.length > 0) {
    groups.push({ key: 'feedback', label: '待审阅反馈', cards: feedbackCards });
  }
  if (completedCards.length > 0) {
    groups.push({
      key: 'completed',
      label: '已完成',
      cards: completedCards,
      collapsible: true,
      defaultCollapsed: true,
      dimmed: true,
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TaskWorkspacePage() {
  const navigate = useNavigate();
  const loadCards = useTaskCardStore((s) => s.loadCards);
  const isLoading = useTaskCardStore((s) => s.isLoading);
  const cards = useTaskCardStore((s) => s.cards);

  const grouped = useMemo(() => {
    const all = Object.values(cards);
    const PENDING = ['suggested', 'awaiting_confirmation', 'draft', 'awaiting_sales_confirmation', 'confirmed'];
    const IN_PROGRESS = ['dispatched', 'accepted', 'in_progress', 'reported', 'feedback_submitted', 'received_by_supervisor'];
    return {
      pending: all.filter((c) => PENDING.includes(c.status)),
      inProgress: all.filter((c) => IN_PROGRESS.includes(c.status)),
      completed: all.filter((c) => c.status === 'completed'),
    };
  }, [cards]);

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['completed']));

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Counts for filter tabs
  const counts = useMemo(() => ({
    all: grouped.pending.length + grouped.inProgress.length + grouped.completed.length,
    pending: grouped.pending.length,
    inProgress: grouped.inProgress.length,
    completed: grouped.completed.length,
  }), [grouped]);

  // Build display groups based on active filter
  const displayGroups = useMemo(() => {
    const filtered = {
      pending: activeFilter === 'all' || activeFilter === 'pending' ? grouped.pending : [],
      inProgress: activeFilter === 'all' || activeFilter === 'inProgress' ? grouped.inProgress : [],
      completed: activeFilter === 'all' || activeFilter === 'completed' ? grouped.completed : [],
    };
    return buildDisplayGroups(filtered);
  }, [grouped, activeFilter]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isEmpty = counts.all === 0 && !isLoading;

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg)', color: 'var(--text-1)' }}
    >
      <div className="max-w-[720px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1
            className="font-['DM_Sans'] text-2xl font-bold"
            style={{ letterSpacing: '-0.3px' }}
          >
            任务工作台
          </h1>
          <button
            onClick={() => navigate('/task-card-demo')}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--primary)',
              border: '1px solid var(--primary)',
            }}
          >
            卡片 Demo
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-[13px] cursor-pointer border transition-colors duration-150 ease-out ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-500 border-sky-500'
                    : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-600 hover:bg-[var(--surface-2)]'
                }`}
              >
                {tab.label} ({counts[tab.key]})
              </button>
            );
          })}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg animate-pulse"
                style={{ background: 'var(--surface-2)' }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div
            className="text-center py-16 rounded-lg mt-6"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <Inbox
              className="mx-auto mb-4 opacity-40"
              size={48}
              style={{ color: 'var(--text-3)' }}
            />
            <div
              className="font-['DM_Sans'] text-base font-semibold mb-2"
              style={{ color: 'var(--text-2)' }}
            >
              暂无任务卡片
            </div>
            <div
              className="text-sm mb-4"
              style={{ color: 'var(--text-3)' }}
            >
              Agent 生成的建议将在这里显示
            </div>
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors duration-150 ease-out"
              style={{ background: 'var(--primary)' }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'var(--primary)')}
            >
              <MessageSquare className="inline-block mr-1.5 -mt-0.5" size={14} />
              前往对话
            </button>
          </div>
        )}

        {/* Grouped list */}
        {!isLoading && !isEmpty && displayGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.key);
          return (
            <div key={group.key}>
              {/* Group header */}
              <div
                className={`flex items-center gap-2 mt-6 mb-2 ${
                  group.collapsible ? 'cursor-pointer select-none' : ''
                }`}
                onClick={group.collapsible ? () => toggleGroup(group.key) : undefined}
              >
                {group.collapsible && (
                  isCollapsed
                    ? <ChevronRight size={14} className="text-slate-400" />
                    : <ChevronDown size={14} className="text-slate-400" />
                )}
                <span
                  className="font-['DM_Sans'] text-[13px] font-semibold"
                  style={{ color: 'var(--text-2)' }}
                >
                  {group.label}
                </span>
                <span className="text-xs text-slate-400">
                  ({group.cards.length})
                </span>
              </div>

              {/* Cards */}
              {!isCollapsed && (
                <div
                  className={`rounded-lg overflow-hidden ${
                    group.dimmed ? 'opacity-60' : ''
                  }`}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {group.cards.map((card) => (
                    <TaskCardCompactItem
                      key={card.id}
                      card={card}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
