/**
 * Workbench Storage
 *
 * LocalStorage-based persistence for workbench state.
 */

import type { WorkbenchStorage, StorageResult } from '../types/storage';
import { StorageKey as StorageKeyEnum } from '../types/storage';

/**
 * Current storage version
 */
const STORAGE_VERSION = 1;

/**
 * Default storage data
 */
const defaultStorage: WorkbenchStorage = {
  componentList: {
    recentComponents: [],
    favoriteComponents: [],
  },
  preferences: {
    theme: 'system',
    maxTabs: 20,
    saveTabsOnClose: false,
    restoreTabsOnLoad: false,
  },
  version: STORAGE_VERSION,
  lastUpdated: Date.now(),
  sessionTimestamps: {},
};

/**
 * Workbench storage implementation
 */
export const workbenchStorage = {
  /**
   * Get all storage data
   */
  get(): WorkbenchStorage {
    try {
      const data = localStorage.getItem(StorageKeyEnum.WORKBENCH_STATE);
      if (!data) {
        return { ...defaultStorage };
      }

      const parsed = JSON.parse(data) as Partial<WorkbenchStorage>;

      // Merge with defaults to handle missing fields
      return {
        componentList: {
          recentComponents: parsed.componentList?.recentComponents || [],
          favoriteComponents: parsed.componentList?.favoriteComponents || [],
          displayOptions: parsed.componentList?.displayOptions,
        },
        preferences: {
          ...defaultStorage.preferences,
          ...parsed.preferences,
        },
        savedTabs: parsed.savedTabs,
        version: parsed.version || STORAGE_VERSION,
        lastUpdated: parsed.lastUpdated || Date.now(),
        sessionTimestamps: parsed.sessionTimestamps || defaultStorage.sessionTimestamps,
      };
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return { ...defaultStorage };
    }
  },

  /**
   * Save storage data
   */
  save(data: Partial<WorkbenchStorage>): StorageResult {
    try {
      const current = this.get();
      const updated: WorkbenchStorage = {
        ...current,
        ...data,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(StorageKeyEnum.WORKBENCH_STATE, JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * Add component to recent list
   */
  addRecent(componentName: string): StorageResult {
    const state = this.get();
    const recent = state.componentList.recentComponents.filter(name => name !== componentName);
    recent.unshift(componentName);

    return this.save({
      componentList: {
        ...state.componentList,
        recentComponents: recent.slice(0, 10), // Keep only 10
      },
    });
  },

  /**
   * Remove component from recent list
   */
  removeRecent(componentName: string): StorageResult {
    const state = this.get();
    const recent = state.componentList.recentComponents.filter(name => name !== componentName);

    return this.save({
      componentList: {
        ...state.componentList,
        recentComponents: recent,
      },
    });
  },

  /**
   * Toggle component favorite status
   */
  toggleFavorite(componentName: string): StorageResult {
    const state = this.get();
    const favorites = state.componentList.favoriteComponents;

    const updatedFavorites = favorites.includes(componentName)
      ? favorites.filter(name => name !== componentName)
      : [...favorites, componentName];

    return this.save({
      componentList: {
        ...state.componentList,
        favoriteComponents: updatedFavorites,
      },
    });
  },

  /**
   * Check if component is favorited
   */
  isFavorite(componentName: string): boolean {
    const state = this.get();
    return state.componentList.favoriteComponents.includes(componentName);
  },

  /**
   * Get recent components
   */
  getRecent(): string[] {
    const state = this.get();
    return state.componentList.recentComponents;
  },

  /**
   * Get favorite components
   */
  getFavorites(): string[] {
    const state = this.get();
    return state.componentList.favoriteComponents;
  },

  /**
   * Clear all storage data
   */
  clear(): StorageResult {
    try {
      localStorage.removeItem(StorageKeyEnum.WORKBENCH_STATE);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * Get user preferences
   */
  getPreferences() {
    const state = this.get();
    return state.preferences;
  },

  /**
   * Save user preferences
   */
  savePreferences(preferences: Partial<WorkbenchStorage['preferences']>): StorageResult {
    const state = this.get();
    return this.save({
      preferences: {
        ...state.preferences,
        ...preferences,
      },
    });
  },

  // ========== Session Timestamp Methods for Message Station ==========

  /**
   * Get last_update_time for a session
   * @param sessionId Session ID
   * @returns Last update time (毫秒时间戳)，如果不存在返回 0
   */
  getSessionTimestamp(sessionId: string): number {
    const state = this.get();
    return state.sessionTimestamps?.[sessionId] || 0;
  },

  /**
   * Save last_update_time for a session
   * @param sessionId Session ID
   * @param timestamp Update time (毫秒时间戳)
   */
  saveSessionTimestamp(sessionId: string, timestamp: number): StorageResult {
    const state = this.get();
    const sessionTimestamps = {
      ...(state.sessionTimestamps || {}),
      [sessionId]: timestamp,
    };
    return this.save({ sessionTimestamps });
  },

  /**
   * Remove timestamp for a session
   * @param sessionId Session ID
   */
  removeSessionTimestamp(sessionId: string): StorageResult {
    const state = this.get();
    if (!state.sessionTimestamps || !(sessionId in state.sessionTimestamps)) {
      return { success: true };
    }
    const { [sessionId]: removed, ...rest } = state.sessionTimestamps;
    return this.save({ sessionTimestamps: rest });
  },

  /**
   * Clear all session timestamps
   */
  clearSessionTimestamps(): StorageResult {
    return this.save({ sessionTimestamps: {} });
  },
};

/**
 * Legacy export for backward compatibility
 * @deprecated Use workbenchStorage instead
 */
export const legacyStorage = {
  getRecent: () => workbenchStorage.getRecent(),
  getFavorites: () => workbenchStorage.getFavorites(),
  addRecent: (name: string) => workbenchStorage.addRecent(name),
  toggleFavorite: (name: string) => workbenchStorage.toggleFavorite(name),
  isFavorite: (name: string) => workbenchStorage.isFavorite(name),
};
