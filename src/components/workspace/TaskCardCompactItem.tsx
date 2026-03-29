import type { TaskCard, CardType, Priority } from '../../types/task-card';

// ---------------------------------------------------------------------------
// Color bar mapping (cardType -> CSS color variable)
// ---------------------------------------------------------------------------
const BAR_COLOR: Record<CardType, string> = {
  visit_report: 'var(--success)',
  action_suggestion: 'var(--primary)',
  insight: 'var(--info)',
  escalation: 'var(--warning)',
  sync_result: 'var(--success)',
};

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------
const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  awaiting_sales_confirmation: '待确认',
  reported: '已上报',
  received_by_supervisor: '已接收',
  suggested: '待确认',
  awaiting_confirmation: '待确认',
  confirmed: '已确认',
  dispatched: '已派发',
  accepted: '执行中',
  feedback_submitted: '待审阅',
  completed: '已完成',
};

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400',
  awaiting_sales_confirmation: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400',
  suggested: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400',
  awaiting_confirmation: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400',
  confirmed: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400',
  reported: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400',
  received_by_supervisor: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/15 dark:text-sky-400',
  dispatched: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/15 dark:text-sky-400',
  accepted: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/15 dark:text-sky-400',
  feedback_submitted: 'bg-sky-300/10 text-sky-700 dark:bg-sky-300/15 dark:text-sky-300',
  completed: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const PRIORITY_STYLE: Record<Priority, string> = {
  high: 'bg-rose-500/8 text-rose-500',
  medium: 'bg-amber-500/8 text-amber-500',
  low: 'text-slate-400',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return '昨天';
  if (diffDay < 30) return `${diffDay}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

function buildSubtitle(card: TaskCard): { text: string; isError?: boolean } {
  // sync_failed trust flag
  if (card.trustFlags.includes('sync_failed')) {
    return { text: '\u26A0 同步失败 \u2014 点击重试', isError: true };
  }

  if (card.cardType === 'visit_report') {
    const date = relativeTime(card.updatedAt);
    const conf = card.explainability.confidence;
    return { text: `基于 ${date} 拜访录音... \u00B7 ${conf}%` };
  }

  if (card.cardType === 'action_suggestion') {
    if (card.status === 'dispatched' || card.status === 'accepted') {
      const name = card.assigneeName || '未指定';
      const date = relativeTime(card.updatedAt);
      return { text: `已派发给 ${name} \u00B7 ${date}` };
    }

    if (card.status === 'feedback_submitted' && card.feedback) {
      const name = card.assigneeName || '销售';
      const summary = card.feedback.customerReaction.length > 20
        ? card.feedback.customerReaction.slice(0, 20) + '...'
        : card.feedback.customerReaction;
      return { text: `${name}已反馈: ${summary}` };
    }
  }

  // Default
  const summaryTrunc = card.summary.length > 30
    ? card.summary.slice(0, 30) + '...'
    : card.summary;
  const conf = card.explainability.confidence;
  const time = relativeTime(card.updatedAt);
  return { text: `${summaryTrunc} \u00B7 ${conf}% \u00B7 ${time}` };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface TaskCardCompactItemProps {
  card: TaskCard;
  onClick?: () => void;
}

export function TaskCardCompactItem({ card, onClick }: TaskCardCompactItemProps) {
  const isCompleted = card.status === 'completed';
  const subtitle = buildSubtitle(card);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 h-16 px-3 border-b cursor-pointer transition-colors duration-150 ease-out hover:bg-[var(--surface-2)]"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Left color bar */}
      <div
        className="w-[3px] h-10 rounded-sm shrink-0"
        style={{ background: BAR_COLOR[card.cardType] }}
      />

      {/* Middle: title + subtitle */}
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-medium truncate ${
            isCompleted ? 'text-slate-400' : 'text-[var(--text-1)]'
          }`}
        >
          {card.title}
        </div>
        <div
          className={`text-[13px] truncate ${
            subtitle.isError ? 'text-[var(--error)]' : 'text-slate-400'
          }`}
        >
          {subtitle.text}
        </div>
      </div>

      {/* Right: status badge + priority */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${
            STATUS_STYLE[card.status] || 'bg-slate-500/10 text-slate-500'
          }`}
        >
          {STATUS_LABEL[card.status] || card.status}
        </span>
        {card.priority !== 'low' && (
          <span
            className={`text-xs px-2 py-0.5 rounded-sm ${PRIORITY_STYLE[card.priority]}`}
          >
            {PRIORITY_LABEL[card.priority]}
          </span>
        )}
        {card.priority === 'low' && (
          <span className="text-xs text-slate-400">
            {PRIORITY_LABEL[card.priority]}
          </span>
        )}
      </div>
    </div>
  );
}
