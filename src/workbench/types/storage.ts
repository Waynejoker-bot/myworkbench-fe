/**
 * Workbench Storage Types
 *
 * Defines types for localStorage persistence including
 * tab state, user preferences, and component history.
 */

import type { Tab } from './tab';
import type { ComponentListStorage } from './component-list';

/**
 * Storage keys used in localStorage
 */
export enum StorageKey {
  /** Workbench state (includes tabs and preferences) */
  WORKBENCH_STATE = 'workbench-state',

  /** Component list data (recent, favorites) */
  COMPONENT_LIST = 'component-list',

  /** User preferences */
  USER_PREFERENCES = 'user-preferences',

  /** Saved tabs for workspace restoration */
  SAVED_TABS = 'saved-tabs',

  /** Session timestamps for Message Station polling */
  SESSION_TIMESTAMPS = 'ms-session-timestamps',
}

/**
 * User preferences
 */
export interface UserPreferences {
  /** Theme preference */
  theme?: 'light' | 'dark' | 'system';

  /** Language preference */
  language?: string;

  /** Default tab strategy for components without manifest */
  defaultTabStrategy?: {
    mode: 'singleton' | 'multiple';
    maxInstances?: number;
  };

  /** Maximum number of tabs allowed */
  maxTabs?: number;

  /** Whether to save tabs on close */
  saveTabsOnClose?: boolean;

  /** Whether to restore tabs on load */
  restoreTabsOnLoad?: boolean;
}

/**
 * Workbench storage data
 * Main storage structure for workbench state
 */
export interface WorkbenchStorage {
  /** Component list storage */
  componentList: ComponentListStorage;

  /** User preferences */
  preferences: UserPreferences;

  /** Saved tabs (for workspace restoration) */
  savedTabs?: Tab[];

  /** Storage version (for migration) */
  version: number;

  /** Last updated timestamp */
  lastUpdated: number;

  /** Session timestamps for Message Station polling (session_id -> last_update_time) */
  sessionTimestamps?: Record<string, number>;
}

/**
 * Storage operation result
 */
export interface StorageResult<T = void> {
  /** Whether the operation was successful */
  success: boolean;

  /** Result data (if successful) */
  data?: T;

  /** Error message (if failed) */
  error?: string;
}

/**
 * Storage migration context
 */
export interface StorageMigrationContext {
  /** Current storage version */
  fromVersion: number;

  /** Target storage version */
  toVersion: number;

  /** Storage data before migration */
  data: Partial<WorkbenchStorage>;
}

/**
 * Storage migration function
 */
export type StorageMigration = (
  context: StorageMigrationContext
) => Partial<WorkbenchStorage>;

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Storage key prefix */
  keyPrefix?: string;

  /** Whether to enable compression (for large datasets) */
  enableCompression?: boolean;

  /** Storage version */
  version: number;

  /** Migration functions map */
  migrations: Record<number, StorageMigration>;

  /** Default storage data */
  defaults: WorkbenchStorage;
}

/**
 * Storage event types
 */
export enum StorageEventType {
  /** Storage updated event */
  UPDATED = 'storage:updated',

  /** Storage cleared event */
  CLEARED = 'storage:cleared',

  /** Storage migrated event */
  MIGRATED = 'storage:migrated',

  /** Storage error event */
  ERROR = 'storage:error',
}

/**
 * Storage event payload
 */
export interface StorageEvent {
  /** Event type */
  type: StorageEventType;

  /** Storage key */
  key: StorageKey;

  /** Event timestamp */
  timestamp: number;

  /** Event data (optional) */
  data?: unknown;
}
