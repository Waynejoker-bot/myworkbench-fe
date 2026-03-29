import { useState } from 'react';
import { useTaskCardStore } from '@/store/useTaskCardStore';
import type { FeedbackPayload } from '@/types/task-card';

// ── Types ────────────────────────────────────────────────────────────

type ResultOption = FeedbackPayload['result'];

const RESULT_OPTIONS: { value: ResultOption; label: string }[] = [
  { value: 'completed', label: '已完成' },
  { value: 'partial', label: '部分完成' },
  { value: 'not_executed', label: '未执行' },
];

// ── Component ────────────────────────────────────────────────────────

interface TaskCardFeedbackFormProps {
  cardId: string;
  onClose: () => void;
}

export function TaskCardFeedbackForm({ cardId, onClose }: TaskCardFeedbackFormProps) {
  const submitFeedback = useTaskCardStore((s) => s.submitFeedback);

  const [result, setResult] = useState<ResultOption | null>(null);
  const [customerReaction, setCustomerReaction] = useState('');
  const [nextStepSuggestion, setNextStepSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = result !== null && customerReaction.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || result === null) return;
    setSubmitting(true);
    try {
      await submitFeedback(cardId, {
        result,
        customerReaction: customerReaction.trim(),
        nextStepSuggestion: nextStepSuggestion.trim(),
        submittedAt: new Date().toISOString(),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="mb-3 rounded-lg border p-3"
      style={{
        backgroundColor: '#334155',
        borderColor: '#334155',
      }}
    >
      {/* 执行结果 */}
      <fieldset>
        <legend
          className="mb-1.5 text-sm font-medium"
          style={{ color: '#F1F5F9' }}
        >
          执行结果
        </legend>
        <div className="flex gap-2">
          {RESULT_OPTIONS.map((opt) => {
            const selected = result === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setResult(opt.value)}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 border"
                style={{
                  backgroundColor: selected ? 'rgba(14,165,233,0.15)' : '#0F172A',
                  color: selected ? '#0EA5E9' : '#F1F5F9',
                  borderColor: selected ? '#0EA5E9' : '#334155',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* 客户反应 */}
      <label className="mt-3 block">
        <span
          className="mb-1 block text-sm font-medium"
          style={{ color: '#F1F5F9' }}
        >
          客户反应
        </span>
        <textarea
          className="w-full resize-none rounded-md border px-2.5 py-2 text-sm outline-none transition-colors duration-150 focus:border-sky-500"
          style={{
            minHeight: 56,
            backgroundColor: '#0F172A',
            borderColor: '#334155',
            color: '#F1F5F9',
          }}
          placeholder="描述客户的态度和反应..."
          value={customerReaction}
          onChange={(e) => setCustomerReaction(e.target.value)}
        />
      </label>

      {/* 下一步建议 */}
      <label className="mt-3 block">
        <span
          className="mb-1 block text-sm font-medium"
          style={{ color: '#F1F5F9' }}
        >
          下一步建议
        </span>
        <textarea
          className="w-full resize-none rounded-md border px-2.5 py-2 text-sm outline-none transition-colors duration-150 focus:border-sky-500"
          style={{
            minHeight: 40,
            backgroundColor: '#0F172A',
            borderColor: '#334155',
            color: '#F1F5F9',
          }}
          placeholder="你建议的下一步行动..."
          value={nextStepSuggestion}
          onChange={(e) => setNextStepSuggestion(e.target.value)}
        />
      </label>

      {/* Submit */}
      <button
        type="button"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="mt-3 w-full rounded-md px-3 py-2 text-sm font-medium text-white transition-colors duration-150 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? '提交中...' : '提交反馈'}
      </button>
    </div>
  );
}
