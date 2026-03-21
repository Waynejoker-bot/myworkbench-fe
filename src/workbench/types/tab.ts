/**
 * Workbench Tab Types
 *
 * Defines types for Tab management including Tab data model,
 * strategies, and state management.
 */

/**
 * Tab strategy modes
 */
export type TabStrategyMode = 'singleton' | 'multiple';

/**
 * Tab strategy configuration
 * Defines how components behave in multi-tab environment
 */
export interface TabStrategy {
  /** Strategy mode: singleton (only one instance) or multiple (can have multiple instances) */
  mode: TabStrategyMode;

  /** Maximum number of instances (only applicable when mode is 'multiple') */
  maxInstances?: number;

  /** Default tab title template, supports variables like {{name}}, {{version}} */
  defaultTitle?: string;

  /** Whether the tab can be closed by user */
  allowClose?: boolean;
}

/**
 * Tab status
 */
export type TabStatus = 'loading' | 'ready' | 'error';

/**
 * Tab data model
 * Represents a single tab in the workbench
 */
export interface Tab {
  // Basic Information
  /** Unique tab identifier */
  id: string;

  /** Component name */
  componentName: string;

  /** Component instance ID (used for multiple instances) */
  instanceId: string;

  // Display Information
  /** Tab display title */
  title: string;

  /** Tab icon (optional) */
  icon?: string;

  // Status
  /** Current tab status */
  status: TabStatus;

  /** Error object if status is 'error' */
  error?: Error;

  // Configuration
  /** Whether the tab can be closed */
  closable: boolean;

  /** Whether the tab is pinned (cannot be closed) */
  pinned: boolean;

  // Component Parameters
  /** Component parameters */
  params: Record<string, unknown>;

  // Component Instance Reference
  /** Component instance reference (optional) */
  componentInstance?: unknown;

  // Timestamps
  /** Tab creation timestamp */
  createdAt: number;

  /** Last activation timestamp */
  lastActivatedAt: number;
}

/**
 * Tab creation options
 */
export interface TabCreationOptions {
  /** Component name */
  componentName: string;

  /** Component parameters */
  params?: Record<string, unknown>;

  /** Tab title (overrides default) */
  title?: string;

  /** Tab icon */
  icon?: string;
}

/**
 * Tab filter options
 */
export interface TabFilterOptions {
  /** Filter by component name */
  componentName?: string;

  /** Filter by status */
  status?: TabStatus;

  /** Filter by pinned state */
  pinned?: boolean;
}

/**
 * Tab statistics
 */
export interface TabStatistics {
  /** Total number of tabs */
  total: number;

  /** Number of tabs by status */
  byStatus: Record<TabStatus, number>;

  /** Number of tabs by component */
  byComponent: Record<string, number>;

  /** Number of pinned tabs */
  pinned: number;
}

/**
 * Tab events
 */
export enum TabEventType {
  /** Tab opened event */
  OPENED = 'tab:opened',

  /** Tab closed event */
  CLOSED = 'tab:closed',

  /** Tab switched event */
  SWITCHED = 'tab:switched',

  /** Tab updated event */
  UPDATED = 'tab:updated',

  /** Tab status changed event */
  STATUS_CHANGED = 'tab:status_changed',
}

/**
 * Tab event payload
 */
export interface TabEvent {
  /** Event type */
  type: TabEventType;

  /** Tab ID */
  tabId: string;

  /** Event timestamp */
  timestamp: number;

  /** Additional event data */
  data?: Record<string, unknown>;
}
