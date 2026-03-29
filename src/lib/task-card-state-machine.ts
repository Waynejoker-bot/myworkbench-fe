import type { TaskCard } from '../types/task-card';

type TransitionMap = Record<string, Record<string, string[]>>;

const TRANSITIONS: TransitionMap = {
  visit_report: {
    draft: ['awaiting_sales_confirmation', 'reported'],
    awaiting_sales_confirmation: ['reported'],
    reported: ['received_by_supervisor'],
  },
  action_suggestion: {
    suggested: ['awaiting_confirmation', 'confirmed', 'completed'],
    awaiting_confirmation: ['confirmed', 'rejected', 'completed'],
    confirmed: ['dispatched', 'applied'],
    dispatched: ['accepted'],
    accepted: ['feedback_submitted'],
    feedback_submitted: ['completed', 'dispatched'],
  },
};

export function getValidTransitions(card: TaskCard): string[] {
  const map = TRANSITIONS[card.cardType];
  if (!map) return [];
  return map[card.status] ?? [];
}

export function canTransition(card: TaskCard, targetStatus: string): boolean {
  return getValidTransitions(card).includes(targetStatus);
}

export function transition(card: TaskCard, targetStatus: string): TaskCard {
  if (!canTransition(card, targetStatus)) {
    throw new Error(
      `Invalid transition: ${card.status} → ${targetStatus} for cardType ${card.cardType}`
    );
  }
  const updated = {
    ...card,
    status: targetStatus,
    updatedAt: new Date().toISOString(),
  };
  return updated as TaskCard;
}
