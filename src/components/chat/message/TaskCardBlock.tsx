import { useMemo, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTaskCardStore, selectCardById } from '@/store/useTaskCardStore';
import type {
  TaskCard,
  CardType,
  Priority,
  TrustFlag,
  VisitReportCard,
  ActionSuggestionCard,
} from '@/types/task-card';
import { TaskCardActions } from './TaskCardActions';

// ── Helpers ──────────────────────────────────────────────────────────

// Use hex colors directly (DESIGN.md tokens) since CSS vars are HSL-only in shadcn
const COLORS = {
  primary: '#0EA5E9',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#F43F5E',
  info: '#38BDF8',
  text1: '#0F172A',
  text2: '#475569',
  text3: '#94A3B8',
  surface2: '#F1F5F9',
  border: '#E2E8F0',
};

const CARD_TYPE_CONFIG: Record<
  CardType,
  { color: string; icon: string; label: string; badgeBg: string }
> = {
  visit_report: { color: COLORS.success, icon: '✎', label: '拜访汇报', badgeBg: 'rgba(16,185,129,0.1)' },
  action_suggestion: { color: COLORS.primary, icon: '▶', label: '行动建议', badgeBg: 'rgba(14,165,233,0.1)' },
  insight: { color: COLORS.info, icon: '◆', label: '分析洞察', badgeBg: 'rgba(56,189,248,0.1)' },
  escalation: { color: COLORS.warning, icon: '▲', label: '风险升级', badgeBg: 'rgba(245,158,11,0.1)' },
  sync_result: { color: COLORS.success, icon: '✓', label: '同步结果', badgeBg: 'rgba(16,185,129,0.1)' },
};

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  awaiting_sales_confirmation: '待销售确认',
  reported: '已汇报',
  received_by_supervisor: '主管已收',
  suggested: '已建议',
  awaiting_confirmation: '待确认',
  confirmed: '已确认',
  dispatched: '已派发',
  accepted: '已接收',
  feedback_submitted: '已提交反馈',
  completed: '已完成',
};

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  high: { label: '高', className: 'bg-rose-500/10 text-rose-500' },
  medium: { label: '中', className: 'bg-amber-500/10 text-amber-500' },
  low: { label: '低', className: 'bg-slate-500/10 text-slate-500' },
};

/** Normalize value to 0-100 display percentage. Values <= 1 are treated as 0-1 ratios. */
function displayPct(v: number): number {
  if (v <= 1 && v > 0) return Math.round(v * 100);
  return Math.round(v);
}

/** Format ISO timestamp or date string to relative time (e.g. "3分钟前", "昨天 14:30") */
function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (diff < 0) return '刚刚'; // future dates
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days === 1) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    if (days < 7) return `${days}天前`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  } catch {
    return dateStr;
  }
}

function confidenceColor(confidence: number): string {
  if (confidence >= 80) return COLORS.success;
  if (confidence >= 50) return COLORS.warning;
  return COLORS.error;
}

function isCompleted(card: TaskCard): boolean {
  return card.status === 'completed' || card.status === 'received_by_supervisor';
}

// ── Component ────────────────────────────────────────────────────────

interface TaskCardBlockProps {
  taskCardId: string;
  /** Inline card data from the content block — used for lazy store registration */
  taskCardData?: TaskCard;
}

export function TaskCardBlock({ taskCardId, taskCardData }: TaskCardBlockProps) {
  // Lazy-register card into store if not already present
  useEffect(() => {
    if (taskCardData) {
      const existing = useTaskCardStore.getState().cards[taskCardId];
      if (!existing) {
        useTaskCardStore.setState((s) => ({
          cards: { ...s.cards, [taskCardId]: taskCardData },
        }));
      }
    }
  }, [taskCardId, taskCardData]);

  const storeCard = useTaskCardStore((s) => selectCardById(s, taskCardId));
  // Use store card if available, otherwise fallback to inline data
  const card = storeCard ?? taskCardData ?? null;

  if (!card) {
    return (
      <div className="rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground">
        任务卡片加载失败（ID: {taskCardId}）
      </div>
    );
  }

  const typeConfig = CARD_TYPE_CONFIG[card.cardType] ?? CARD_TYPE_CONFIG.action_suggestion;
  const completed = isCompleted(card);
  const hasSyncFailed = card.trustFlags.includes('sync_failed');
  const hasLowConfidence = card.trustFlags.includes('low_confidence');
  const hasDataStale = card.trustFlags.includes('data_stale');
  const hasMissingData = card.trustFlags.includes('missing_data');
  const { explainability } = card;

  return (
    <div
      className="relative overflow-visible rounded-lg border border-border bg-surface"
      style={{
        borderLeft: `3px solid ${typeConfig.color}`,
        opacity: completed ? 0.6 : 1,
      }}
    >
      {/* ── Trust flag banners ── */}
      {hasSyncFailed && <SyncFailedBanner cardId={card.id} />}
      {hasLowConfidence && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          低置信度 — 数据不充分，建议人工核实后再确认
        </div>
      )}

      <div className="px-3 pt-3 pb-4">
        {/* 1. Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={card.status} />
          <TypeTag icon={typeConfig.icon} label={typeConfig.label} color={typeConfig.color} />
          <div className="ml-auto">
            <PriorityTag priority={card.priority} />
          </div>
        </div>

        {/* 2. Title */}
        <h4
          className="mt-2 text-base font-semibold"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-0.3px',
            color: completed ? COLORS.text3 : undefined,
          }}
        >
          {card.title}
        </h4>

        {/* 3. Summary */}
        <p
          className="mt-1 text-sm leading-relaxed"
          style={{
            color: COLORS.text2,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
        >
          {card.summary}
        </p>

        {/* 4. Key reasons */}
        {explainability.keyReasons.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {explainability.keyReasons.map((reason, i) => (
              <div
                key={i}
                className="pl-3 text-xs leading-relaxed"
                style={{
                  color: COLORS.text2,
                  borderLeft: `2px solid ${COLORS.border}`,
                }}
              >
                {reason}
              </div>
            ))}
          </div>
        )}

        {/* 5. Metadata row */}
        <MetadataRow
          confidence={explainability.confidence}
          coverage={explainability.coverage}
          freshness={explainability.freshness}
          missingData={explainability.missingData}
          hasDataStale={hasDataStale}
          hasMissingData={hasMissingData}
        />

        {/* 6. Visit report specifics OR suggested action */}
        {card.cardType === 'visit_report' && (
          <VisitReportSection card={card as VisitReportCard} />
        )}
        {card.cardType === 'action_suggestion' && (
          <ActionSuggestionSection card={card as ActionSuggestionCard} />
        )}

        {/* 7. Action buttons */}
        <TaskCardActions card={card} />
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold"
      style={{
        fontSize: 12,
        backgroundColor: 'rgba(14,165,233,0.12)',
        color: COLORS.primary,
      }}
    >
      {label}
    </span>
  );
}

function TypeTag({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs"
      style={{ fontSize: 12, color }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function PriorityTag({ priority }: { priority: Priority }) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function MetadataRow({
  confidence,
  coverage,
  freshness,
  missingData,
  hasDataStale,
  hasMissingData,
}: {
  confidence: number;
  coverage: number;
  freshness: string;
  missingData: string[];
  hasDataStale: boolean;
  hasMissingData: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.text3 }}>
        <span style={{ color: confidenceColor(displayPct(confidence)) }}>
          置信度 {displayPct(confidence)}%
        </span>
        <span>·</span>
        <span>覆盖率 {displayPct(coverage)}%</span>
        <span>·</span>
        <span style={{ color: hasDataStale ? COLORS.error : undefined }}>
          {formatRelativeTime(freshness)}
          {hasDataStale && ' — 数据可能过期'}
        </span>
      </div>
      {hasMissingData && missingData.length > 0 && (
        <div className="mt-1 text-xs" style={{ color: COLORS.warning }}>
          缺少数据：{missingData.join('、')}
        </div>
      )}
    </div>
  );
}

function SyncFailedBanner({ cardId }: { cardId: string }) {
  const updateCardStatus = useTaskCardStore((s) => s.updateCardStatus);

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium bg-rose-500/10 text-rose-500">
      <span>同步失败，数据可能不是最新</span>
      <button
        onClick={() => updateCardStatus(cardId, 'retry_sync')}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:bg-rose-500/20 transition-colors duration-150"
      >
        <RefreshCw className="h-3 w-3" />
        重试
      </button>
    </div>
  );
}

function VisitReportSection({ card }: { card: VisitReportCard }) {
  if (!card.meetingNotes?.length && !card.customerAttitude && !card.suggestedNextSteps?.length) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* Meeting notes */}
      {(card.meetingNotes || []).map((note, i) => (
        <div key={i}>
          <div className="text-xs font-medium" style={{ color: COLORS.text2 }}>
            {note.label}
          </div>
          <div className="mt-0.5 text-sm" style={{ color: COLORS.text1 }}>
            {note.content}
          </div>
        </div>
      ))}

      {/* Customer attitude */}
      {card.customerAttitude && (
        <div>
          <div className="text-xs font-medium" style={{ color: COLORS.text2 }}>
            客户态度
          </div>
          <div className="mt-0.5 text-sm" style={{ color: COLORS.text1 }}>
            {card.customerAttitude}
          </div>
        </div>
      )}

      {/* Suggested next steps */}
      {(card.suggestedNextSteps || []).length > 0 && (
        <div>
          <div className="text-xs font-medium" style={{ color: COLORS.text2 }}>
            建议下一步
          </div>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {(card.suggestedNextSteps || []).map((step, i) => (
              <li key={i} className="text-sm" style={{ color: COLORS.text1 }}>
                · {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActionSuggestionSection({ card }: { card: ActionSuggestionCard }) {
  const updateDraft = useTaskCardStore((s) => s.updateDraft);
  const { suggestedAction } = card;

  if (!suggestedAction) return null;

  return (
    <div className="mt-3 rounded-md p-2.5" style={{ backgroundColor: COLORS.surface2 }}>
      <div className="text-xs font-medium" style={{ color: COLORS.text2 }}>
        {suggestedAction.label}
      </div>
      <textarea
        className="mt-1 w-full resize-none rounded border bg-transparent px-2 py-1.5 text-sm outline-none transition-colors duration-150 focus:border-sky-500"
        style={{
          color: COLORS.text1,
          borderColor: COLORS.border,
          backgroundColor: 'transparent',
          minHeight: 56,
        }}
        value={suggestedAction.editableDraft}
        onChange={(e) => updateDraft(card.id, e.target.value)}
      />
      {suggestedAction.dueDate && (
        <div className="mt-1 text-xs" style={{ color: COLORS.text3 }}>
          截止日期：{suggestedAction.dueDate}
        </div>
      )}
    </div>
  );
}
