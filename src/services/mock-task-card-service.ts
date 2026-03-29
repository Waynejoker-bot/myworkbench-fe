import type { TaskCard, FeedbackPayload } from '../types/task-card';
import type { TaskCardService } from './task-card-service';
import { transition } from '../lib/task-card-state-machine';
import { mockTaskCards } from '../mock/task-cards';

/** Helper: authenticated fetch using stored token */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('access_token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  });
}

const MOCK_DELAY = 200;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY));
}

export class MockTaskCardService implements TaskCardService {
  private cards: Map<string, TaskCard>;

  constructor(initialCards: TaskCard[] = mockTaskCards) {
    this.cards = new Map(initialCards.map((c) => [c.id, structuredClone(c)]));
  }

  async getAll(): Promise<TaskCard[]> {
    return delay(Array.from(this.cards.values()));
  }

  async getById(id: string): Promise<TaskCard | null> {
    return delay(this.cards.get(id) ?? null);
  }

  async getByStatus(statuses: string[]): Promise<TaskCard[]> {
    const result = Array.from(this.cards.values()).filter((c) =>
      statuses.includes(c.status)
    );
    return delay(result);
  }

  async getByRole(role: 'manager' | 'sales'): Promise<TaskCard[]> {
    const result = Array.from(this.cards.values()).filter(
      (c) => c.assigneeRole === role
    );
    return delay(result);
  }

  async updateStatus(id: string, newStatus: string): Promise<TaskCard> {
    const card = this.cards.get(id);
    if (!card) throw new Error(`TaskCard not found: ${id}`);

    const updated = transition(card, newStatus);
    this.cards.set(id, updated);
    return delay(structuredClone(updated));
  }

  async dispatch(id: string, assigneeName: string): Promise<TaskCard> {
    const card = this.cards.get(id);
    if (!card) throw new Error(`TaskCard not found: ${id}`);

    // 1. Update frontend state immediately
    const transitioned = transition(card, 'dispatched');
    const updated: TaskCard = { ...transitioned, assigneeName };
    this.cards.set(id, updated);

    // 2. Call backend task API to actually dispatch
    try {
      await this.sendTaskToBackend(card, assigneeName);
    } catch (e) {
      console.warn('[TaskCardService] Backend dispatch failed, frontend state updated:', e);
    }

    return structuredClone(updated);
  }

  /**
   * Send a task assignment message via message-station.
   * This creates a real task that flows to the assignee agent.
   */
  private async sendTaskToBackend(card: TaskCard, assigneeId: string): Promise<void> {
    const timestamp = Date.now();
    const creatorId = card.sourceAgent || 'system';

    // Build task payload in backend format
    const taskPayload = JSON.stringify({
      type: 'task',
      action: 'assignment',
      data: [{
        itemType: 'task',
        taskItem: {
          task_id: card.id,
          title: card.title,
          description: card.summary || ('suggestedAction' in card ? (card as any).suggestedAction?.editableDraft : '') || '',
          status: 'pending',
          progress: 0,
          creator_id: creatorId,
          assignee_id: assigneeId,
          created_at: new Date().toISOString(),
        },
      }],
    });

    // First, get the assignee's channel to find their session
    const channelsResp = await authFetch('/msapi/channels');
    const channelsData = await channelsResp.json();
    const channels: Array<{ channel_id: string; current_session_id: string | null }> = channelsData.channels || [];
    const targetChannel = channels.find(
      (c) => c.channel_id === assigneeId
    );

    if (!targetChannel?.current_session_id) {
      console.warn(`[TaskCardService] No active session for agent: ${assigneeId}`);
      return;
    }

    // Send task message to the assignee's session
    await authFetch('/msapi/send-message', {
      method: 'POST',
      body: JSON.stringify({
        session_id: targetChannel.current_session_id,
        round_id: `r-dispatch-${card.id}`,
        message_id: `m-dispatch-${timestamp}`,
        source: creatorId,
        target: assigneeId,
        payload: taskPayload,
        seq: 0,
        status: 3,
        timestamp,
      }),
    });

    console.log(`[TaskCardService] Task dispatched: ${card.title} → ${assigneeId}`);
  }

  async submitFeedback(
    id: string,
    payload: FeedbackPayload
  ): Promise<TaskCard> {
    const card = this.cards.get(id);
    if (!card) throw new Error(`TaskCard not found: ${id}`);
    if (card.cardType !== 'action_suggestion') {
      throw new Error(`submitFeedback only applies to action_suggestion cards`);
    }

    const transitioned = transition(card, 'feedback_submitted');
    const updated: TaskCard = {
      ...transitioned,
      cardType: 'action_suggestion',
      status: 'feedback_submitted',
      feedback: payload,
    } as TaskCard;
    this.cards.set(id, updated);
    return delay(structuredClone(updated));
  }

  async confirmReport(id: string): Promise<TaskCard> {
    const card = this.cards.get(id);
    if (!card) throw new Error(`TaskCard not found: ${id}`);
    if (card.cardType !== 'visit_report') {
      throw new Error(`confirmReport only applies to visit_report cards`);
    }

    const updated = transition(card, 'reported');
    this.cards.set(id, updated);
    return delay(structuredClone(updated));
  }

  async updateDraft(id: string, draft: string): Promise<TaskCard> {
    const card = this.cards.get(id);
    if (!card) throw new Error(`TaskCard not found: ${id}`);

    let updated: TaskCard;
    if (card.cardType === 'action_suggestion') {
      updated = {
        ...card,
        suggestedAction: { ...card.suggestedAction, editableDraft: draft },
        updatedAt: new Date().toISOString(),
      };
    } else if (card.cardType === 'visit_report') {
      updated = {
        ...card,
        suggestedNextSteps: draft.split('\n').filter(Boolean),
        updatedAt: new Date().toISOString(),
      };
    } else {
      throw new Error(`updateDraft not supported for cardType: ${(card as TaskCard).cardType}`);
    }

    this.cards.set(id, updated);
    return delay(structuredClone(updated));
  }
}

export function createMockTaskCardService(
  initialCards?: TaskCard[]
): TaskCardService {
  return new MockTaskCardService(initialCards);
}

export const mockTaskCardService: TaskCardService =
  createMockTaskCardService();
