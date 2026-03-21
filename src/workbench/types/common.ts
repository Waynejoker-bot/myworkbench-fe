/**
 * Workbench Common Types
 *
 * Shared types used across Workbench components.
 */

/**
 * Chat message structure
 */
export interface Message {
  /** Unique message identifier */
  id: string;

  /** Message role */
  role: 'user' | 'assistant' | 'system';

  /** Message content */
  content: string;

  /** Message timestamp in milliseconds */
  timestamp: number;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Session structure
 */
export interface Session {
  /** Unique session identifier */
  id: string;

  /** Session title */
  title: string;

  /** Creation timestamp in milliseconds */
  createdAt: number;

  /** Last update timestamp in milliseconds */
  updatedAt: number;

  /** Optional messages array */
  messages?: Message[];

  /** Optional agent ID */
  agentId?: string;

  /** Session status */
  status?: 'active' | 'completed' | 'archived';
}

/**
 * Chat context structure
 */
export interface ChatContext {
  /** Current session ID */
  sessionId: string;

  /** Optional user ID */
  userId?: string;

  /** Optional current agent */
  currentAgent?: string;

  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Session context for components
 */
export interface SessionContext {
  /** Current session ID */
  sessionId: string;

  /** Optional user ID */
  userId?: string;

  /** Optional current agent */
  currentAgent?: string;
}

/**
 * Component configuration
 */
export interface ComponentConfig {
  [key: string]: unknown;
}

/**
 * Component state
 */
export interface ComponentState {
  /** Component status */
  status: 'loading' | 'ready' | 'error' | 'unmounted';

  /** Optional error information */
  error?: Error;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Notification options
 */
export interface NotificationOptions {
  /** Notification level */
  level: 'info' | 'success' | 'warning' | 'error';

  /** Notification title */
  title: string;

  /** Notification message */
  message: string;

  /** Optional duration in milliseconds */
  duration?: number;
}

/**
 * Subscription options for event streams
 */
export interface SubscriptionOptions {
  /** Whether to include historical data */
  includeHistory?: boolean;

  /** Whether to only receive streaming events */
  streamingOnly?: boolean;

  /** Optional filter function */
  filter?: (data: unknown) => boolean;

  /** Optional limit on number of items */
  limit?: number;
}

/**
 * Unsubscribe function type
 */
export type UnsubscribeFunction = () => void;
