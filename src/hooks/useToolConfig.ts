/**
 * useToolConfig Hook
 *
 * React hook for managing tool configuration state.
 * Provides automatic loading, caching, and reactive updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ToolCallConfig, ToolDisplayConfig } from '@/types/toolConfig';
import { getToolConfigService } from '@/services/toolConfigService';
import { DEFAULT_TOOL_CONFIG } from '@/constants/defaultToolConfig';

export interface UseToolConfigOptions {
  /** Whether to automatically fetch configuration on mount */
  autoFetch?: boolean;

  /** Force refresh on mount */
  forceRefresh?: boolean;

  /** Custom configuration to merge with fetched config */
  customConfig?: Partial<ToolCallConfig>;
}

export interface UseToolConfigReturn {
  /** Current tool configuration */
  config: ToolCallConfig;

  /** Display configuration */
  displayConfig: ToolDisplayConfig;

  /** Whether configuration is currently loading */
  isLoading: boolean;

  /** Error from last fetch attempt */
  error: Error | null;

  /** Whether configuration has been loaded at least once */
  isInitialized: boolean;

  /** Function to manually refetch configuration */
  refetch: () => Promise<void>;

  /** Function to update configuration locally */
  updateConfig: (updates: Partial<ToolCallConfig>) => void;

  /** Function to save configuration to server */
  saveConfig: (updates: Partial<ToolCallConfig>) => Promise<void>;

  /** Function to reset configuration to defaults */
  resetToDefaults: () => void;
}

/**
 * React hook for tool configuration management
 *
 * @param options Hook options
 * @returns Tool configuration state and operations
 */
export function useToolConfig(options: UseToolConfigOptions = {}): UseToolConfigReturn {
  const { autoFetch = true, forceRefresh = false, customConfig } = options;

  const [config, setConfig] = useState<ToolCallConfig>(() => {
    // Start with default config, will be updated when fetched
    return customConfig
      ? { ...DEFAULT_TOOL_CONFIG, ...customConfig }
      : DEFAULT_TOOL_CONFIG;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Get service instance
  const service = getToolConfigService();

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedConfig = await service.fetchConfig(forceRefresh);

      if (isMountedRef.current) {
        // Merge with custom config if provided
        const finalConfig = customConfig
          ? { ...fetchedConfig, ...customConfig }
          : fetchedConfig;

        setConfig(finalConfig);
        setIsInitialized(true);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        console.error('[useToolConfig] Error fetching configuration:', errorObj);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [service, forceRefresh, customConfig]);

  // Update configuration locally
  const updateConfig = useCallback((updates: Partial<ToolCallConfig>) => {
    service.updateConfig(updates);
    setConfig(service.getConfig());
  }, [service]);

  // Save configuration to server
  const saveConfig = useCallback(async (updates: Partial<ToolCallConfig>) => {
    try {
      await service.saveConfig({
        config: updates,
        persist: true,
      });
      setConfig(service.getConfig());
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    }
  }, [service]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    service.resetToDefaults();
    setConfig(service.getConfig());
  }, [service]);

  // Manual refetch
  const refetch = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  // Subscribe to configuration changes
  useEffect(() => {
    const unsubscribe = service.subscribe((newConfig) => {
      if (isMountedRef.current) {
        const finalConfig = customConfig
          ? { ...newConfig, ...customConfig }
          : newConfig;
        setConfig(finalConfig);
      }
    });

    return unsubscribe;
  }, [service, customConfig]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && !isInitialized) {
      fetchConfig();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [autoFetch, isInitialized, fetchConfig]);

  return {
    config,
    displayConfig: config.display,
    isLoading,
    error,
    isInitialized,
    refetch,
    updateConfig,
    saveConfig,
    resetToDefaults,
  };
}

/**
 * Simplified hook that only returns display configuration
 * Useful for components that only need display settings
 */
export function useToolDisplayConfig(): ToolDisplayConfig {
  const { displayConfig } = useToolConfig({ autoFetch: true });
  return displayConfig;
}

/**
 * Hook for accessing tool configuration without reactive updates
 * Useful for performance-critical components
 */
export function useToolConfigStatic(): ToolCallConfig {
  const service = getToolConfigService();
  return service.getConfig();
}
