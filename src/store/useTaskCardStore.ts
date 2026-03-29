import { create } from 'zustand';
import type { TaskCard, FeedbackPayload } from '../types/task-card';
import type { TaskCardService } from '../services/task-card-service';
import { mockTaskCardService } from '../services/mock-task-card-service';

// ------------------------------------------------------------------
// Service instance — swap to real implementation here
// ------------------------------------------------------------------
const service: TaskCardService = mockTaskCardService;

// ------------------------------------------------------------------
// Store types
// ------------------------------------------------------------------
interface TaskCardState {
  cards: Record<string, TaskCard>;
  isLoading: boolean;
  error: string | null;

  loadCards: () => Promise<void>;
  updateCardStatus: (id: string, status: string) => Promise<void>;
  dispatchCard: (id: string, assignee: string) => Promise<void>;
  submitFeedback: (id: string, payload: FeedbackPayload) => Promise<void>;
  confirmReport: (id: string) => Promise<void>;
  updateDraft: (id: string, draft: string) => Promise<void>;
}

// ------------------------------------------------------------------
// Store
// ------------------------------------------------------------------
export const useTaskCardStore = create<TaskCardState>((set) => ({
  cards: {},
  isLoading: false,
  error: null,

  async loadCards() {
    set({ isLoading: true, error: null });
    try {
      const list = await service.getAll();
      const cards: Record<string, TaskCard> = {};
      for (const c of list) cards[c.id] = c;
      set({ cards, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  async updateCardStatus(id, status) {
    set({ error: null });
    try {
      const updated = await service.updateStatus(id, status);
      set((s) => ({ cards: { ...s.cards, [id]: updated } }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  async dispatchCard(id, assignee) {
    set({ error: null });
    try {
      const updated = await service.dispatch(id, assignee);
      set((s) => ({ cards: { ...s.cards, [id]: updated } }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  async submitFeedback(id, payload) {
    set({ error: null });
    try {
      const updated = await service.submitFeedback(id, payload);
      set((s) => ({ cards: { ...s.cards, [id]: updated } }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  async confirmReport(id) {
    set({ error: null });
    try {
      const updated = await service.confirmReport(id);
      set((s) => ({ cards: { ...s.cards, [id]: updated } }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  async updateDraft(id, draft) {
    set({ error: null });
    try {
      const updated = await service.updateDraft(id, draft);
      set((s) => ({ cards: { ...s.cards, [id]: updated } }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));

// ------------------------------------------------------------------
// Derived selectors (standalone functions)
// ------------------------------------------------------------------
export function selectCardById(
  state: TaskCardState,
  id: string
): TaskCard | undefined {
  return state.cards[id];
}

export function selectCardsByStatus(
  state: TaskCardState,
  statuses: string[]
): TaskCard[] {
  return Object.values(state.cards).filter((c) => statuses.includes(c.status));
}

export function selectCardsByRole(
  state: TaskCardState,
  role: 'manager' | 'sales'
): TaskCard[] {
  return Object.values(state.cards).filter((c) => c.assigneeRole === role);
}

const PENDING_STATUSES = [
  'suggested',
  'awaiting_confirmation',
  'draft',
  'awaiting_sales_confirmation',
  'confirmed',
];
const IN_PROGRESS_STATUSES = [
  'dispatched',
  'accepted',
  'in_progress',
  'reported',
  'feedback_submitted',
  'received_by_supervisor',
];
const COMPLETED_STATUSES = ['completed'];

export function selectGroupedCards(state: TaskCardState): {
  pending: TaskCard[];
  inProgress: TaskCard[];
  completed: TaskCard[];
} {
  const all = Object.values(state.cards);
  return {
    pending: all.filter((c) => PENDING_STATUSES.includes(c.status)),
    inProgress: all.filter((c) => IN_PROGRESS_STATUSES.includes(c.status)),
    completed: all.filter((c) => COMPLETED_STATUSES.includes(c.status)),
  };
}
