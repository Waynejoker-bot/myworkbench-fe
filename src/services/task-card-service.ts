import type { TaskCard, FeedbackPayload } from '../types/task-card';

export interface TaskCardService {
  getAll(): Promise<TaskCard[]>;
  getById(id: string): Promise<TaskCard | null>;
  getByStatus(statuses: string[]): Promise<TaskCard[]>;
  getByRole(role: 'manager' | 'sales'): Promise<TaskCard[]>;
  updateStatus(id: string, newStatus: string): Promise<TaskCard>;
  dispatch(id: string, assigneeName: string): Promise<TaskCard>;
  submitFeedback(id: string, payload: FeedbackPayload): Promise<TaskCard>;
  confirmReport(id: string): Promise<TaskCard>;
  updateDraft(id: string, draft: string): Promise<TaskCard>;
}
