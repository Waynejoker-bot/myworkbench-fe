import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskCardStore } from '@/store/useTaskCardStore';
import { TaskCardBlock } from '@/components/chat/message/TaskCardBlock';
import { parsePayloadToBlocks } from '@/utils/message-converters';
import type { TaskCardContentBlock } from '@/types/content-block';
import { ContentType } from '@/types/content-block';

// ── Config ───────────────────────────────────────────────────────────

type ViewRole = 'manager' | 'sales';

const MANAGER_CARD_IDS = [
  'card-003',
  'card-004',
  'card-005',
  'card-006',
  'card-007',
  'card-008',
  'card-009',
];

const SALES_CARD_IDS = [
  'card-001',
  'card-002',
  'card-006',
  'card-007',
];

interface CardMeta {
  id: string;
  agentLabel: string;
  timeLabel: string;
}

const MANAGER_CARDS: CardMeta[] = [
  { id: 'card-003', agentLabel: '主管 BPAgent', timeLabel: '刚刚' },
  { id: 'card-004', agentLabel: '主管 BPAgent', timeLabel: '2分钟前' },
  { id: 'card-005', agentLabel: '主管 BPAgent', timeLabel: '5分钟前' },
  { id: 'card-006', agentLabel: '主管 BPAgent', timeLabel: '10分钟前' },
  { id: 'card-007', agentLabel: '主管 BPAgent', timeLabel: '30分钟前' },
  { id: 'card-008', agentLabel: '主管 BPAgent', timeLabel: '1天前' },
  { id: 'card-009', agentLabel: '主管 BPAgent', timeLabel: '刚刚' },
];

const SALES_CARDS: CardMeta[] = [
  { id: 'card-001', agentLabel: '销售 BPAgent', timeLabel: '3小时前' },
  { id: 'card-002', agentLabel: '销售 BPAgent', timeLabel: '1天前' },
  { id: 'card-006', agentLabel: '销售 BPAgent', timeLabel: '10分钟前' },
  { id: 'card-007', agentLabel: '销售 BPAgent', timeLabel: '30分钟前' },
];

// ── Page component ───────────────────────────────────────────────────

export default function TaskCardDemoPage() {
  const [role, setRole] = useState<ViewRole>('manager');
  const navigate = useNavigate();
  const loadCards = useTaskCardStore((s) => s.loadCards);
  const cards = useTaskCardStore((s) => s.cards);
  const isLoading = useTaskCardStore((s) => s.isLoading);
  const error = useTaskCardStore((s) => s.error);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const cardMetas = role === 'manager' ? MANAGER_CARDS : SALES_CARDS;
  const cardIds = role === 'manager' ? MANAGER_CARD_IDS : SALES_CARD_IDS;
  const visibleCards = cardMetas.filter((m) => cards[m.id]);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-1)' }}
    >
      <div className="mx-auto" style={{ maxWidth: 800, padding: 32 }}>
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.5px',
              color: 'var(--text-1)',
            }}
          >
            任务卡片系统 Demo
          </h1>

          <div className="flex items-center gap-2">
            <RoleButton
              label="主管视角"
              active={role === 'manager'}
              onClick={() => setRole('manager')}
            />
            <RoleButton
              label="销售视角"
              active={role === 'sales'}
              onClick={() => setRole('sales')}
            />
            <button
              onClick={() => navigate('/agent-task-cards')}
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 bg-slate-800 text-sky-400 border border-sky-500/50 hover:bg-slate-700"
              style={{ minHeight: 36 }}
            >
              任务工作台
            </button>
          </div>
        </div>

        <div
          className="my-4"
          style={{ height: 1, backgroundColor: 'var(--border)' }}
        />

        {/* Error state */}
        {error && (
          <div
            className="text-sm py-2 px-3 mb-4 rounded-md"
            style={{ backgroundColor: 'rgba(244,63,94,0.1)', color: 'var(--error, #F43F5E)' }}
          >
            操作失败: {error}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div
            className="text-sm py-8 text-center"
            style={{ color: 'var(--text-3)' }}
          >
            加载中...
          </div>
        )}

        {/* Card list */}
        {!isLoading && (
          <div className="flex flex-col" style={{ gap: 16 }}>
            {visibleCards.map((meta) => (
              <div key={`${role}-${meta.id}`}>
                {/* Agent header */}
                <AgentHeader
                  role={role}
                  label={meta.agentLabel}
                  time={meta.timeLabel}
                />
                {/* Task card */}
                <TaskCardBlock taskCardId={meta.id} />
              </div>
            ))}

            {visibleCards.length === 0 && !isLoading && (
              <div
                className="text-sm py-8 text-center"
                style={{ color: 'var(--text-3)' }}
              >
                暂无任务卡片
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function RoleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
        active
          ? 'bg-sky-500 text-white'
          : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700'
      }`}
      style={{ minHeight: 36 }}
    >
      {label}
    </button>
  );
}

function AgentHeader({
  role,
  label,
  time,
}: {
  role: ViewRole;
  label: string;
  time: string;
}) {
  const avatarBg = role === 'manager' ? 'var(--primary)' : 'var(--success)';
  const avatarChar = role === 'manager' ? '主' : '销';

  return (
    <div className="flex items-center gap-2 mb-2">
      {/* Avatar */}
      <div
        className="flex items-center justify-center rounded-full text-xs font-semibold text-white flex-shrink-0"
        style={{
          width: 28,
          height: 28,
          backgroundColor: avatarBg,
          fontSize: 12,
        }}
      >
        {avatarChar}
      </div>

      {/* Name + time */}
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--text-1)' }}
      >
        {label}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>
        {time}
      </span>
    </div>
  );
}
