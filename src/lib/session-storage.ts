/**
 * Session Storage
 *
 * Session timestamp persistence for Message Station polling.
 * Extracted from workbench storage for use by the chat system.
 *
 * IMPORTANT: Storage keys are backward-compatible with the workbench storage format.
 * Session timestamps are stored inside the 'workbench-state' localStorage key
 * under the `sessionTimestamps` field to maintain compatibility.
 */

/** Storage key - must match the original workbench storage key */
const STORAGE_KEY = 'workbench-state';

/**
 * Result type for storage operations
 */
export interface StorageResult {
  success: boolean;
  error?: string;
}

/**
 * Read the sessionTimestamps map from localStorage
 */
function getSessionTimestamps(): Record<string, number> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return {};
    const parsed = JSON.parse(data);
    return parsed.sessionTimestamps || {};
  } catch {
    return {};
  }
}

/**
 * Write the sessionTimestamps map back to localStorage
 * Merges with existing workbench-state to avoid clobbering other fields.
 */
function saveSessionTimestamps(timestamps: Record<string, number>): StorageResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    const updated = {
      ...existing,
      sessionTimestamps: timestamps,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { success: true };
  } catch (error) {
    console.error('Failed to save session timestamps:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Session storage for Message Station timestamps.
 *
 * Provides get/save/remove/clear for per-session last_update_time values,
 * stored in localStorage under the same key used by the original workbench storage.
 */
export const sessionStorage = {
  /**
   * Get last_update_time for a session
   * @param sessionId Session ID
   * @returns Last update time (ms timestamp), or 0 if not found
   */
  getSessionTimestamp(sessionId: string): number {
    return getSessionTimestamps()[sessionId] || 0;
  },

  /**
   * Save last_update_time for a session
   * @param sessionId Session ID
   * @param timestamp Update time (ms timestamp)
   */
  saveSessionTimestamp(sessionId: string, timestamp: number): StorageResult {
    const timestamps = getSessionTimestamps();
    timestamps[sessionId] = timestamp;
    return saveSessionTimestamps(timestamps);
  },

  /**
   * Remove timestamp for a session
   * @param sessionId Session ID
   */
  removeSessionTimestamp(sessionId: string): StorageResult {
    const timestamps = getSessionTimestamps();
    if (!(sessionId in timestamps)) {
      return { success: true };
    }
    const { [sessionId]: _removed, ...rest } = timestamps;
    return saveSessionTimestamps(rest);
  },

  /**
   * Clear all session timestamps
   */
  clearSessionTimestamps(): StorageResult {
    return saveSessionTimestamps({});
  },
};
