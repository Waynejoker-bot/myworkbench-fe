export type CardType =
  | 'visit_report'
  | 'action_suggestion'
  | 'insight'
  | 'escalation'
  | 'sync_result';

export type VisitReportStatus =
  | 'draft'
  | 'awaiting_sales_confirmation'
  | 'reported'
  | 'received_by_supervisor';

export type ActionSuggestionStatus =
  | 'suggested'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'dispatched'
  | 'accepted'
  | 'feedback_submitted'
  | 'completed';

export type TrustFlag =
  | 'low_confidence'
  | 'missing_data'
  | 'data_stale'
  | 'regenerating'
  | 'apply_failed'
  | 'sync_failed';

export type Priority = 'high' | 'medium' | 'low';

export type UserRole = 'manager' | 'sales';

export interface EvidenceRef {
  type: 'meeting_transcript' | 'deal_history' | 'email' | 'chat';
  id: string;
  label: string;
}

export interface FeedbackPayload {
  result: 'completed' | 'partial' | 'not_executed';
  customerReaction: string;
  nextStepSuggestion: string;
  notes?: string;
  submittedAt: string;
}

export interface Explainability {
  confidence: number;
  freshness: string;
  dataTimeRange: string;
  coverage: number;
  missingData: string[];
  keyReasons: string[];
  evidenceRefs: EvidenceRef[];
}

export interface BusinessContext {
  dealId?: string;
  customerId?: string;
  meetingId?: string;
  conversationId?: string;
}

export interface BaseTaskCard {
  id: string;
  title: string;
  summary: string;
  sourceAgent: string;
  priority: Priority;
  assigneeRole: UserRole;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
  trustFlags: TrustFlag[];
  businessContext: BusinessContext;
  explainability: Explainability;
}

export interface VisitReportCard extends BaseTaskCard {
  cardType: 'visit_report';
  status: VisitReportStatus;
  meetingNotes: { label: string; content: string }[];
  customerAttitude?: string;
  suggestedNextSteps: string[];
  recordingDuration?: number;
}

export interface ActionSuggestionCard extends BaseTaskCard {
  cardType: 'action_suggestion';
  status: ActionSuggestionStatus;
  suggestedAction: {
    label: string;
    editableDraft: string;
    dueDate?: string;
  };
  feedback?: FeedbackPayload;
}

// future: | InsightCard | EscalationCard | SyncResultCard
export type TaskCard = VisitReportCard | ActionSuggestionCard;

export type TaskCardStatus = VisitReportStatus | ActionSuggestionStatus;
