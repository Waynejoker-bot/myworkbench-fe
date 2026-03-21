/**
 * Tool Configuration Service
 *
 * Service layer for managing tool configuration state and operations.
 * Provides caching, validation, and change notification capabilities.
 */

import type {
  ToolCallConfig,
  ToolDisplayConfig,
  ToolConfigUpdateRequest,
} from '@/types/toolConfig';
import {
  updateToolConfig,
  validateToolConfig,
  loadToolConfig,
  clearToolConfigCache,
} from '@/api/config';
import { mergeToolConfig } from '@/constants/defaultToolConfig';

/**
 * Listener type for configuration changes
 */
type ConfigChangeListener = (config: ToolCallConfig) => void;

/**
 * Tool Configuration Service class
 */
export class ToolConfigService {
  private config: ToolCallConfig;
  private listeners: Set<ConfigChangeListener> = new Set();
  private isLoading = false;
  private lastFetchTime = 0;

  constructor(initialConfig?: Partial<ToolCallConfig>) {
    this.config = mergeToolConfig(initialConfig || {});
  }

  /**
   * Get current configuration
   */
  getConfig(): ToolCallConfig {
    return { ...this.config };
  }

  /**
   * Get display configuration
   */
  getDisplayConfig(): ToolDisplayConfig {
    return { ...this.config.display };
  }

  /**
   * Update configuration locally
   */
  updateConfig(updates: Partial<ToolCallConfig>): void {
    // Validate updates
    const validation = validateToolConfig(updates);

    if (!validation.valid) {
      console.error('[ToolConfigService] Invalid configuration updates:', validation.errors);
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('[ToolConfigService] Configuration warnings:', validation.warnings);
    }

    // Merge updates
    this.config = mergeToolConfig({
      ...this.config,
      ...updates,
    });

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Fetch configuration from server
   */
  async fetchConfig(forceRefresh = false): Promise<ToolCallConfig> {
    // Prevent concurrent fetches
    if (this.isLoading && !forceRefresh) {
      return this.config;
    }

    // Check cache duration
    const now = Date.now();
    const timeSinceLastFetch = now - this.lastFetchTime;
    if (!forceRefresh && timeSinceLastFetch < this.config.cacheDuration) {
      console.log('[ToolConfigService] Using cached configuration');
      return this.config;
    }

    this.isLoading = true;

    try {
      const fetchedConfig = await loadToolConfig(forceRefresh);
      this.config = mergeToolConfig(fetchedConfig);
      this.lastFetchTime = now;
      this.notifyListeners();
      return this.config;
    } catch (error) {
      console.error('[ToolConfigService] Error fetching configuration:', error);
      // Return current config as fallback
      return this.config;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Save configuration to server
   */
  async saveConfig(request: ToolConfigUpdateRequest): Promise<void> {
    try {
      const response = await updateToolConfig(request);

      // Update local config with server response
      this.config = mergeToolConfig(response.config);
      this.lastFetchTime = Date.now();

      this.notifyListeners();
    } catch (error) {
      console.error('[ToolConfigService] Error saving configuration:', error);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    this.config = mergeToolConfig({});
    this.notifyListeners();
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Unsubscribe all listeners
   */
  unsubscribeAll(): void {
    this.listeners.clear();
  }

  /**
   * Check if currently loading configuration
   */
  isConfigLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Clear cached configuration
   */
  clearCache(): void {
    clearToolConfigCache();
    this.lastFetchTime = 0;
  }

  /**
   * Notify all listeners of configuration change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('[ToolConfigService] Error in config change listener:', error);
      }
    });
  }
}

// Singleton instance
let serviceInstance: ToolConfigService | null = null;

/**
 * Get or create the singleton ToolConfigService instance
 */
export function getToolConfigService(): ToolConfigService {
  if (!serviceInstance) {
    serviceInstance = new ToolConfigService();
  }
  return serviceInstance;
}

/**
 * Reset the singleton service instance (useful for testing)
 */
export function resetToolConfigService(): void {
  serviceInstance = null;
}

/**
 * Initialize tool configuration service
 * Fetches configuration from server on first load
 */
export async function initializeToolConfigService(): Promise<ToolConfigService> {
  const service = getToolConfigService();

  try {
    await service.fetchConfig();
  } catch (error) {
    console.warn('[initializeToolConfigService] Failed to fetch initial config, using defaults');
  }

  return service;
}
