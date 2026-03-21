/**
 * Default Tool Configuration
 *
 * Provides default configuration values for tool call display and behavior.
 * Used as fallback when remote configuration is unavailable.
 */

import type {
  ToolCallConfig,
  ToolDisplayConfig,
  ToolRegistry,
} from '@/types/toolConfig';
import { ToolExecutionStatus } from '@/types/toolConfig';

/**
 * Default display configuration
 */
export const DEFAULT_DISPLAY_CONFIG: ToolDisplayConfig = {
  defaultCollapsed: true,
  jsonMaxDepth: 5,
  jsonMaxLength: 1000,
  showTimestamp: true,
  showDuration: true,
  jsonTheme: 'dark',
  statusColors: {
    pending: '#64748b', // slate-500
    running: '#3b82f6', // blue-500
    success: '#22c55e', // green-500
    error: '#ef4444', // red-500
  },
};

/**
 * Default tool call configuration
 */
export const DEFAULT_TOOL_CONFIG: ToolCallConfig = {
  display: DEFAULT_DISPLAY_CONFIG,
  enableRemoteConfig: true,
  configApiEndpoint: '/msapi/tool-config',
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

/**
 * Default tool registry with metadata for common tools
 */
export const DEFAULT_TOOL_REGISTRY: ToolRegistry = {
  // File system tools
  'read_file': {
    displayName: '读取文件',
    description: '读取文件内容',
    iconName: 'FileText',
    category: 'file',
    dangerous: false,
  },
  'write_file': {
    displayName: '写入文件',
    description: '写入内容到文件',
    iconName: 'Save',
    category: 'file',
    dangerous: true,
  },
  'list_directory': {
    displayName: '列出目录',
    description: '列出目录内容',
    iconName: 'FolderOpen',
    category: 'file',
    dangerous: false,
  },

  // Code execution tools
  'execute_code': {
    displayName: '执行代码',
    description: '执行代码片段',
    iconName: 'Code',
    category: 'code',
    dangerous: true,
  },
  'run_command': {
    displayName: '运行命令',
    description: '运行系统命令',
    iconName: 'Terminal',
    category: 'code',
    dangerous: true,
  },

  // Search tools
  'web_search': {
    displayName: '网络搜索',
    description: '搜索网络信息',
    iconName: 'Search',
    category: 'search',
    dangerous: false,
  },
  'code_search': {
    displayName: '代码搜索',
    description: '搜索代码库',
    iconName: 'FileSearch',
    category: 'search',
    dangerous: false,
  },

  // API tools
  'api_call': {
    displayName: 'API 调用',
    description: '调用外部 API',
    iconName: 'Globe',
    category: 'api',
    dangerous: false,
  },

  // Database tools
  'db_query': {
    displayName: '数据库查询',
    description: '查询数据库',
    iconName: 'Database',
    category: 'database',
    dangerous: true,
  },

  // AI/ML tools
  'ai_analyze': {
    displayName: 'AI 分析',
    description: '使用 AI 分析数据',
    iconName: 'Brain',
    category: 'ai',
    dangerous: false,
  },
};

/**
 * Status color map for Tailwind CSS classes
 */
export const STATUS_COLOR_CLASSES: Record<ToolExecutionStatus, { bg: string; border: string; text: string }> = {
  pending: {
    bg: 'bg-slate-50 dark:bg-slate-900/20',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-600 dark:text-slate-400',
  },
  running: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-600 dark:text-green-400',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400',
  },
};

/**
 * Status icons for different execution states
 */
export const STATUS_ICONS: Record<ToolExecutionStatus, string> = {
  pending: '⏳',
  running: '🔄',
  success: '✅',
  error: '❌',
};

/**
 * Status text labels
 */
export const STATUS_LABELS: Record<ToolExecutionStatus, string> = {
  pending: '等待中',
  running: '执行中',
  success: '成功',
  error: '失败',
};

/**
 * Merge user configuration with default configuration
 */
export function mergeToolConfig(userConfig: Partial<ToolCallConfig>): ToolCallConfig {
  return {
    ...DEFAULT_TOOL_CONFIG,
    ...userConfig,
    display: {
      ...DEFAULT_TOOL_CONFIG.display,
      ...userConfig.display,
      statusColors: {
        ...DEFAULT_TOOL_CONFIG.display.statusColors,
        ...userConfig.display?.statusColors,
      },
    },
  };
}

/**
 * Get tool metadata with fallback to defaults
 */
export function getToolMetadata(toolName: string, registry: ToolRegistry = DEFAULT_TOOL_REGISTRY) {
  return (
    registry[toolName] || {
      displayName: toolName,
      description: `执行工具: ${toolName}`,
      iconName: 'Wrench',
      category: 'unknown',
      dangerous: false,
    }
  );
}

/**
 * Get status color classes for a given status
 */
export function getStatusColorClasses(status: ToolExecutionStatus) {
  return STATUS_COLOR_CLASSES[status] || STATUS_COLOR_CLASSES.pending;
}

/**
 * Get status icon for a given status
 */
export function getStatusIcon(status: ToolExecutionStatus): string {
  return STATUS_ICONS[status] || STATUS_ICONS.pending;
}

/**
 * Get status label for a given status
 */
export function getStatusLabel(status: ToolExecutionStatus): string {
  return STATUS_LABELS[status] || STATUS_LABELS.pending;
}
