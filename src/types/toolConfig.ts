/**
 * Tool Configuration Types
 *
 * Type definitions for tool execution and display configuration.
 * Provides type-safe configuration management for tool call visualization.
 */

/**
 * Tool execution status enumeration
 */
export enum ToolExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Tool display configuration
 */
export interface ToolDisplayConfig {
  /** Whether to collapse tool calls by default */
  defaultCollapsed: boolean;

  /** Maximum depth for JSON formatting */
  jsonMaxDepth: number;

  /** Maximum length for JSON string values before truncation */
  jsonMaxLength: number;

  /** Whether to show timestamps for tool execution */
  showTimestamp: boolean;

  /** Whether to show execution duration */
  showDuration: boolean;

  /** Theme for JSON syntax highlighting */
  jsonTheme: 'light' | 'dark';

  /** Color scheme for different statuses */
  statusColors: {
    pending: string;
    running: string;
    success: string;
    error: string;
  };
}

/**
 * Tool call result interface
 */
export interface ToolCallResult {
  /** Whether the tool execution was successful */
  success: boolean;

  /** Result data (can be any JSON-serializable value) */
  data?: unknown;

  /** Error message if execution failed */
  error?: string;

  /** Error stack trace if available */
  errorStack?: string;

  /** Execution duration in milliseconds */
  duration?: number;

  /** Timestamp when execution completed */
  timestamp?: number;
}

/**
 * Tool call configuration
 */
export interface ToolCallConfig {
  /** Display configuration */
  display: ToolDisplayConfig;

  /** Whether to enable configuration fetching from API */
  enableRemoteConfig: boolean;

  /** API endpoint for fetching configuration */
  configApiEndpoint: string;

  /** Cache duration in milliseconds */
  cacheDuration: number;
}

/**
 * Tool configuration API response
 */
export interface ToolConfigResponse {
  /** Configuration data */
  config: ToolCallConfig;

  /** Timestamp when configuration was generated */
  timestamp: number;

  /** Configuration version */
  version: string;
}

/**
 * Tool configuration update request
 */
export interface ToolConfigUpdateRequest {
  /** Partial configuration to update */
  config: Partial<ToolCallConfig>;

  /** Whether to persist the configuration */
  persist: boolean;
}

/**
 * Status color mapping
 */
export type StatusColorMap = Record<ToolExecutionStatus, string>;

/**
 * Tool metadata for display
 */
export interface ToolMetadata {
  /** Tool display name */
  displayName?: string;

  /** Tool description */
  description?: string;

  /** Tool icon name (from lucide-react) */
  iconName?: string;

  /** Tool category */
  category?: string;

  /** Whether this tool is dangerous (requires confirmation) */
  dangerous?: boolean;
}

/**
 * Tool registry - maps tool names to metadata
 */
export type ToolRegistry = Record<string, ToolMetadata>;

/**
 * Validation result for tool configuration
 */
export interface ToolConfigValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];
}

/**
 * Type guard to check if a value is a valid ToolExecutionStatus
 */
export function isToolExecutionStatus(value: string): value is ToolExecutionStatus {
  return Object.values(ToolExecutionStatus).includes(value as ToolExecutionStatus);
}

/**
 * Type guard to check if a result is a successful tool call result
 */
export function isSuccessfulToolResult(result: ToolCallResult): boolean {
  return result.success === true && result.error === undefined;
}

/**
 * Type guard to check if a result is an error tool call result
 */
export function isErrorToolResult(result: ToolCallResult): boolean {
  return result.success === false || result.error !== undefined;
}
