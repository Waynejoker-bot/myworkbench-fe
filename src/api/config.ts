/**
 * Tool Configuration API
 *
 * API functions for fetching and updating tool configuration.
 * Follows the same pattern as src/api/chat.ts for consistency.
 */

import { apiClient } from "../lib/api-client";
import type {
  ToolConfigResponse,
  ToolConfigUpdateRequest,
  ToolCallConfig,
} from '@/types/toolConfig';
import { DEFAULT_TOOL_CONFIG } from '@/constants/defaultToolConfig';

/**
 * Tool name validation regex
 * Only allows alphanumeric characters, underscores, and hyphens
 */
const TOOL_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Maximum length for tool names
 */
const MAX_TOOL_NAME_LENGTH = 100;

/**
 * Minimum length for tool names
 */
const MIN_TOOL_NAME_LENGTH = 1;

/**
 * Validate tool name for security
 *
 * @param toolName - The tool name to validate
 * @returns true if valid, false otherwise
 */
export function isValidToolName(toolName: string): boolean {
  if (!toolName) return false;
  if (toolName.length < MIN_TOOL_NAME_LENGTH || toolName.length > MAX_TOOL_NAME_LENGTH) {
    return false;
  }
  return TOOL_NAME_REGEX.test(toolName);
}

/**
 * Fetch tool configuration from the server
 *
 * @returns Tool configuration response
 * @throws Error if the request fails
 */
export async function fetchToolConfig(): Promise<ToolConfigResponse> {
  try {
    const data = await apiClient.get<ToolConfigResponse>('/msapi/tool-config');
    return data;
  } catch (error) {
    console.error('[fetchToolConfig] Error fetching configuration:', error);
    // Return default configuration as fallback
    return {
      config: DEFAULT_TOOL_CONFIG,
      timestamp: Date.now(),
      version: '0.0.0',
    };
  }
}

/**
 * Update tool configuration on the server
 *
 * @param request Configuration update request
 * @returns Updated tool configuration response
 * @throws Error if the request fails
 */
export async function updateToolConfig(
  request: ToolConfigUpdateRequest
): Promise<ToolConfigResponse> {
  try {
    return await apiClient.post<ToolConfigResponse>('/msapi/tool-config', request);
  } catch (error) {
    console.error('[updateToolConfig] Error updating configuration:', error);
    throw error;
  }
}

/**
 * Validate tool configuration
 *
 * @param config Configuration to validate
 * @returns Validation result with errors and warnings
 */
export function validateToolConfig(
  config: Partial<ToolCallConfig>
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate display configuration
  if (config.display) {
    if (config.display.jsonMaxDepth !== undefined) {
      if (config.display.jsonMaxDepth < 1 || config.display.jsonMaxDepth > 10) {
        errors.push('jsonMaxDepth must be between 1 and 10');
      }
    }

    if (config.display.jsonMaxLength !== undefined) {
      if (config.display.jsonMaxLength < 100 || config.display.jsonMaxLength > 10000) {
        warnings.push('jsonMaxLength should be between 100 and 10000');
      }
    }
  }

  // Validate cache duration (it's in ToolCallConfig, not ToolDisplayConfig)
  if (config.cacheDuration !== undefined) {
    if (config.cacheDuration < 0) {
      errors.push('cacheDuration cannot be negative');
    }
  }

  // Validate API endpoint
  if (config.configApiEndpoint && !config.configApiEndpoint.startsWith('/')) {
    errors.push('configApiEndpoint must start with /');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Load tool configuration with caching
 *
 * @param forceRefresh Force refresh from server
 * @param cacheKey Optional cache key for multiple configurations
 * @returns Tool configuration
 */
export async function loadToolConfig(
  forceRefresh = false,
  cacheKey = 'default'
): Promise<ToolCallConfig> {
  const storageKey = `tool-config-${cacheKey}`;
  const cachedData = localStorage.getItem(storageKey);

  // Try to use cached config if available and not forcing refresh
  if (!forceRefresh && cachedData) {
    try {
      const cached = JSON.parse(cachedData) as ToolConfigResponse;
      const cacheAge = Date.now() - cached.timestamp;

      // Check if cache is still valid
      if (cacheAge < DEFAULT_TOOL_CONFIG.cacheDuration) {
        console.log('[loadToolConfig] Using cached configuration');
        return cached.config;
      }
    } catch (error) {
      console.error('[loadToolConfig] Error parsing cached config:', error);
    }
  }

  // Fetch fresh configuration
  console.log('[loadToolConfig] Fetching fresh configuration');
  const response = await fetchToolConfig();

  // Cache the configuration
  try {
    localStorage.setItem(storageKey, JSON.stringify(response));
  } catch (error) {
    console.error('[loadToolConfig] Error caching configuration:', error);
  }

  return response.config;
}

/**
 * Clear cached tool configuration
 *
 * @param cacheKey Optional cache key (default: 'default')
 */
export function clearToolConfigCache(cacheKey = 'default'): void {
  const storageKey = `tool-config-${cacheKey}`;
  localStorage.removeItem(storageKey);
  console.log('[clearToolConfigCache] Cache cleared for key:', cacheKey);
}

/**
 * Subscribe to tool configuration changes
 *
 * @param callback Callback function when configuration changes
 * @returns Unsubscribe function
 */
export function subscribeToToolConfigChanges(
  callback: (config: ToolCallConfig) => void
): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key?.startsWith('tool-config-') && event.newValue) {
      try {
        const config = JSON.parse(event.newValue) as ToolConfigResponse;
        callback(config.config);
      } catch (error) {
        console.error('[subscribeToToolConfigChanges] Error parsing config:', error);
      }
    }
  };

  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('storage', handler);
  };
}
