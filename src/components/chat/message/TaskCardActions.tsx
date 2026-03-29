import { useState } from 'react';
import { useTaskCardStore } from '@/store/useTaskCardStore';
import type { TaskCard, VisitReportCard, ActionSuggestionCard } from '@/types/task-card';
import { DispatchPopover } from './DispatchPopover';
import { TaskCardFeedbackForm } from './TaskCardFeedbackForm';

// ── Agent 中转：发消息给自己的 Agent ─────────────────────────────────
//
// 所有按钮操作都通过当前 session 的 send-message 发消息给自己的 Agent。
// Agent 收到后通过 task tool 与其他 Agent 通信。
// 前端不直接跨 Agent 投递消息。

async function sendToMyAgent(
  text: string,
  context: Record<string, string>,
): Promise<void> {
  const token = localStorage.getItem('access_token');
  if (!token) { console.warn('[TaskCardActions] No token'); return; }
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // 获取当前激活的 session（从 URL hash 或 channels API）
  const chResp = await fetch('/msapi/channels', { headers });
  const chData = await chResp.json();
  const channels: Array<{ channel_id: string; current_session_id: string | null; status: string }> =
    chData.channels || [];

  // 找到 context 里指定的 agent，或者找第一个有活跃 session 的
  const targetAgentId = context._current_agent || '';
  let ch = channels.find((c) => c.channel_id === targetAgentId && c.current_session_id);
  if (!ch) {
    // Fuzzy match
    ch = channels.find((c) =>
      c.current_session_id && (
        c.channel_id.includes(targetAgentId) ||
        targetAgentId.includes(c.channel_id)
      ),
    );
  }
  if (!ch?.current_session_id) {
    console.warn(`[TaskCardActions] No active session for agent: ${targetAgentId}`);
    return;
  }

  const timestamp = Date.now();
  const payload = JSON.stringify({
    type: 'text',
    data: [{ itemType: 'text', textItem: { text } }],
  });

  // 清理 context：移除内部字段，确保值都是 string
  const cleanContext: Record<string, string> = {};
  for (const [k, v] of Object.entries(context)) {
    if (!k.startsWith('_') && v !== undefined && v !== null) {
      cleanContext[k] = String(v);
    }
  }

  await fetch('/msapi/send-message', {
    method: 'POST', headers,
    body: JSON.stringify({
      session_id: ch.current_session_id,
      round_id: `r-action-${timestamp}`,
      message_id: `m-action-${timestamp}`,
      source: 'user',
      target: ch.channel_id,
      payload,
      seq: 0,
      status: 3,
      timestamp,
      context: cleanContext,
    }),
  });
  console.log(`[TaskCardActions] Sent to ${ch.channel_id}: "${text.substring(0, 40)}..."`);
}

// ── Types ────────────────────────────────────────────────────────────

interface CardActions {
  updateStatus: (newStatus: string) => void;
  dispatch: (assignee: string) => void;
  acceptTask: () => void;
  confirmReport: () => void;
  submitFeedback: (result: string) => void;
  confirmFeedback: () => void;
}

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'success';

interface ButtonDef {
  label: string;
  variant: ButtonVariant;
  action: () => void;
}

// ── Styles ───────────────────────────────────────────────────────────

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700',
  ghost:
    'bg-transparent border border-slate-200 dark:border-slate-600 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-foreground',
  danger:
    'bg-transparent text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10',
  success:
    'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700',
};

// ── Component ────────────────────────────────────────────────────────

interface TaskCardActionsProps {
  card: TaskCard;
}

export function TaskCardActions({ card }: TaskCardActionsProps) {
  const [showDispatch, setShowDispatch] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [actionState, setActionState] = useState<'idle' | 'loading' | 'done'>('idle');

  // 获取当前 Agent ID（卡片是自己的 Agent 生成的，所以 sourceAgent 就是当前 Agent）
  const currentAgent = card.sourceAgent || card.assigneeName || '';

  const actions: CardActions = {
    updateStatus: (newStatus: string) => {
      const existing = useTaskCardStore.getState().cards[card.id];
      const base = existing ?? card;
      const updated = { ...base, status: newStatus, updatedAt: new Date().toISOString() } as TaskCard;
      useTaskCardStore.setState((s) => ({
        cards: { ...s.cards, [card.id]: updated },
      }));
    },

    // 确认并汇报：告诉自己的 Agent，让它通过 task tool 发给主管 Agent
    confirmReport: async () => {
      setActionState('loading');
      actions.updateStatus('reported');
      try {
        const target = card.assigneeName || 'liu-jianming-bp';
        await sendToMyAgent(
          `我确认了「${card.title}」的汇报内容，请通过 task tool 发送给 ${target}。`,
          {
            _current_agent: currentAgent,
            task_action: 'confirm_and_report',
            card_id: card.id,
            card_title: card.title,
            target_agent: target,
          },
        );
      } catch (e) {
        console.warn('[TaskCardActions] confirmReport error:', e);
      }
      setActionState('done');
    },

    // 确认并派发：告诉自己的 Agent，让它通过 task tool 派发给指定销售 Agent
    dispatch: async (assignee: string) => {
      setActionState('loading');
      actions.updateStatus('dispatched');
      try {
        await sendToMyAgent(
          `我确认了「${card.title}」，请通过 task tool 派发给 ${assignee}。`,
          {
            _current_agent: currentAgent,
            task_action: 'confirm_and_dispatch',
            card_id: card.id,
            card_title: card.title,
            target_agent: assignee,
          },
        );
      } catch (e) {
        console.warn('[TaskCardActions] dispatch error:', e);
      }
      setActionState('done');
    },

    // 确认接收：告诉自己的 Agent，开始执行任务
    acceptTask: async () => {
      setActionState('loading');
      actions.updateStatus('accepted');
      try {
        await sendToMyAgent(
          `我已确认接收任务「${card.title}」，请帮我制定执行计划。`,
          {
            _current_agent: currentAgent,
            task_action: 'accept_task',
            card_id: card.id,
            card_title: card.title,
          },
        );
      } catch (e) {
        console.warn('[TaskCardActions] acceptTask error:', e);
      }
      setActionState('done');
    },

    // 提交反馈：告诉自己的 Agent，通过 task tool report 回报
    submitFeedback: async (result: string) => {
      setActionState('loading');
      actions.updateStatus('feedback_submitted');
      try {
        await sendToMyAgent(
          `任务「${card.title}」执行完成。\n执行反馈: ${result}\n请通过 task tool 回报给主管。`,
          {
            _current_agent: currentAgent,
            task_action: 'submit_feedback',
            card_id: card.id,
            card_title: card.title,
            feedback_result: result,
          },
        );
      } catch (e) {
        console.warn('[TaskCardActions] submitFeedback error:', e);
      }
      setActionState('done');
    },

    // 确认反馈：主管确认销售的反馈，闭环完成
    confirmFeedback: async () => {
      setActionState('loading');
      actions.updateStatus('completed');
      try {
        await sendToMyAgent(
          `我已确认「${card.title}」的反馈，任务闭环完成。`,
          {
            _current_agent: currentAgent,
            task_action: 'confirm_feedback',
            card_id: card.id,
            card_title: card.title,
          },
        );
      } catch (e) {
        console.warn('[TaskCardActions] confirmFeedback error:', e);
      }
      setActionState('done');
    },
  };

  const buttons = getButtons(card, actions, setShowDispatch, setShowFeedback);

  if (buttons.length === 0 && !showFeedback) return null;

  return (
    <div className="mt-3">
      {/* Feedback form (expands inside card) */}
      {showFeedback && (
        <TaskCardFeedbackForm
          cardId={card.id}
          onClose={() => setShowFeedback(false)}
        />
      )}

      {/* Button row */}
      {buttons.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 relative">
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              disabled={actionState === 'loading'}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${VARIANT_CLASSES[btn.variant]} ${actionState === 'loading' ? 'opacity-50 cursor-wait' : ''}`}
              style={{ minHeight: 32 }}
            >
              {actionState === 'loading' ? '处理中...' : btn.label}
            </button>
          ))}

          {/* Dispatch popover */}
          {showDispatch && (
            <DispatchPopover
              cardId={card.id}
              onClose={() => setShowDispatch(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Button mapping ───────────────────────────────────────────────────

function getButtons(
  card: TaskCard,
  actions: CardActions,
  setShowDispatch: (v: boolean) => void,
  setShowFeedback: (v: boolean) => void,
): ButtonDef[] {
  if (card.cardType === 'visit_report') {
    return getVisitReportButtons(card as VisitReportCard, actions);
  }
  if (card.cardType === 'action_suggestion') {
    return getActionSuggestionButtons(card as ActionSuggestionCard, actions, setShowDispatch, setShowFeedback);
  }
  return [];
}

function getVisitReportButtons(
  card: VisitReportCard,
  actions: CardActions,
): ButtonDef[] {
  switch (card.status) {
    case 'draft':
    case 'awaiting_sales_confirmation':
      return [
        { label: '确认并汇报', variant: 'primary', action: () => actions.confirmReport() },
        { label: '编辑内容', variant: 'ghost', action: () => actions.updateStatus('draft') },
        { label: '重新生成', variant: 'ghost', action: () => actions.updateStatus('regenerating') },
        { label: '播放录音', variant: 'ghost', action: () => { /* TODO */ } },
      ];
    case 'reported':
      return [
        { label: '查看详情', variant: 'ghost', action: () => { /* TODO */ } },
      ];
    default:
      return [];
  }
}

function getActionSuggestionButtons(
  card: ActionSuggestionCard,
  actions: CardActions,
  setShowDispatch: (v: boolean) => void,
  setShowFeedback: (v: boolean) => void,
): ButtonDef[] {
  switch (card.status) {
    case 'suggested':
    case 'awaiting_confirmation': {
      // 判断视角：创建者（主管）还是接收者（销售）
      // _messageTarget 标记了这条消息发给谁
      // 如果消息发给 sourceAgent（创建者自己），是主管视角
      // 如果发给别人，是接收者视角
      const msgTarget = (card as any)._messageTarget || '';
      const isCreatorView = !msgTarget || msgTarget === card.sourceAgent;

      if (!isCreatorView) {
        // 销售端：收到主管派发的任务
        return [
          { label: '确认接收', variant: 'primary', action: () => actions.acceptTask() },
          { label: '查看详情', variant: 'ghost', action: () => { /* TODO */ } },
          { label: '有问题?', variant: 'ghost', action: () => { /* TODO */ } },
        ];
      }

      // 主管端：确认并派发
      return [
        {
          label: '确认并派发', variant: 'primary',
          action: () => {
            const assignee = card.assigneeName || card.assigneeRole || '';
            if (assignee) {
              actions.dispatch(assignee);
            } else {
              setShowDispatch(true);
            }
          },
        },
        { label: '编辑', variant: 'ghost', action: () => actions.updateStatus('suggested') },
        { label: '查看证据', variant: 'ghost', action: () => { /* TODO */ } },
        { label: '驳回', variant: 'danger', action: () => actions.updateStatus('completed') },
      ];
    }
    case 'confirmed':
      return [
        { label: '派发给...', variant: 'primary', action: () => setShowDispatch(true) },
        { label: '查看证据', variant: 'ghost', action: () => { /* TODO */ } },
      ];
    case 'dispatched':
      // 派发后主管只能查看，销售端会收到新卡片
      return [
        { label: '查看详情', variant: 'ghost', action: () => { /* TODO */ } },
      ];
    case 'accepted':
      return [
        { label: '提交反馈', variant: 'primary', action: () => setShowFeedback(true) },
        { label: '有问题?', variant: 'ghost', action: () => { /* TODO */ } },
      ];
    case 'feedback_submitted':
      return [
        { label: '确认反馈', variant: 'success', action: () => actions.confirmFeedback() },
        { label: '查看详情', variant: 'ghost', action: () => { /* TODO */ } },
        { label: '要求重做', variant: 'danger', action: () => actions.updateStatus('dispatched') },
      ];
    case 'completed':
    default:
      return [];
  }
}
