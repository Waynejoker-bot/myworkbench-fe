/**
 * Workbench 默认配置常量
 *
 * 参考：docs/api/message-station-tool-tracking.md
 * 定义工具执行、消息处理等相关的默认配置
 */

/**
 * 工具执行默认配置
 */
export const TOOL_EXECUTION_DEFAULTS = {
  /** 默认超时时间（毫秒） */
  timeout: 30000, // 30 秒

  /** 默认重试次数 */
  maxRetries: 3,

  /** 重试延迟（毫秒） */
  retryDelay: 1000, // 1 秒

  /** 是否自动开始执行 */
  autoStart: false,

  /** 是否在失败时自动重试 */
  autoRetry: false,
} as const;

/**
 * 工具执行状态映射
 */
export const TOOL_EXECUTION_STATUS_MAP = {
  pending: {
    label: '等待中',
    icon: '⏳',
    color: '#8B5CF6', // 紫色
  },
  running: {
    label: '执行中',
    icon: '🔄',
    color: '#3B82F6', // 蓝色
  },
  success: {
    label: '成功',
    icon: '✅',
    color: '#10B981', // 绿色
  },
  error: {
    label: '失败',
    icon: '❌',
    color: '#EF4444', // 红色
  },
} as const;

/**
 * 消息处理默认配置
 */
export const MESSAGE_PROCESSING_DEFAULTS = {
  /** 是否自动解析工具调用 */
  autoParseToolCalls: true,

  /** 是否自动清理工具标记 */
  autoCleanToolTags: false,

  /** 是否显示工具执行状态 */
  showToolExecutionStatus: true,

  /** 消息排序方式 */
  messageSortOrder: 'asc' as 'asc' | 'desc', // asc = 旧消息在前，desc = 新消息在前

  /** 是否启用消息分页 */
  enableMessagePagination: false,

  /** 每页消息数量 */
  messagesPerPage: 50,
} as const;

/**
 * UI 显示默认配置
 */
export const UI_DISPLAY_DEFAULTS = {
  /** 工具调用卡片最大宽度 */
  toolCallCardMaxWidth: 600,

  /** 工具参数显示的最大长度 */
  toolParamMaxLength: 100,

  /** 工具结果显示的最大长度 */
  toolResultMaxLength: 1000,

  /** 是否折叠长文本 */
  collapseLongText: true,

  /** 长文本折叠阈值（字符数） */
  collapseThreshold: 200,

  /** 动画持续时间（毫秒） */
  animationDuration: 300,

  /** 是否显示时间戳 */
  showTimestamp: true,

  /** 时间戳格式 */
  timestampFormat: 'HH:mm:ss' as 'HH:mm:ss' | 'HH:mm' | 'relative',
} as const;

/**
 * API 端点配置
 */
export const API_ENDPOINTS = {
  /** Message Station 基础 URL */
  messageStationBaseUrl: '/msapi/v1/message-station',

  /** 工具执行状态跟踪端点 */
  toolTracking: '/msapi/v1/tool-tracking',

  /** 获取工具执行状态 */
  getToolStatus: (callId: string) => `/msapi/v1/tool-tracking/status/${callId}`,

  /** 更新工具执行状态 */
  updateToolStatus: (callId: string) => `/msapi/v1/tool-tracking/status/${callId}`,

  /** 批量获取工具状态 */
  batchGetToolStatus: '/msapi/v1/tool-tracking/status/batch',
} as const;

/**
 * 错误消息映射
 */
export const ERROR_MESSAGES = {
  /** 工具执行超时 */
  TOOL_EXECUTION_TIMEOUT: '工具执行超时，请稍后重试',

  /** 工具未找到 */
  TOOL_NOT_FOUND: '工具不存在或未注册',

  /** 工具参数错误 */
  TOOL_PARAM_ERROR: '工具参数错误',

  /** 工具执行失败 */
  TOOL_EXECUTION_FAILED: '工具执行失败',

  /** 网络错误 */
  NETWORK_ERROR: '网络连接失败，请检查网络设置',

  /** 未授权 */
  UNAUTHORIZED: '未授权访问',

  /** 服务器错误 */
  SERVER_ERROR: '服务器错误，请稍后重试',
} as const;

/**
 * 工具类型定义
 */
export const TOOL_TYPES = {
  /** 文件操作工具 */
  FILE: 'file',

  /** 代码执行工具 */
  CODE_EXECUTION: 'code_execution',

  /** API 调用工具 */
  API_CALL: 'api_call',

  /** 数据库查询工具 */
  DATABASE_QUERY: 'database_query',

  /** 搜索工具 */
  SEARCH: 'search',

  /** 自定义工具 */
  CUSTOM: 'custom',
} as const;

/**
 * 常用工具列表
 */
export const COMMON_TOOLS = {
  /** 文件浏览器 */
  FILE_BROWSER: 'file_browser',

  /** 代码解释器 */
  CODE_INTERPRETER: 'code_interpreter',

  /** 终端 */
  TERMINAL: 'terminal',

  /** 搜索 */
  SEARCH: 'search',

  /** Web 浏览器 */
  WEB_BROWSER: 'web_browser',
} as const;

/**
 * 消息内容块类型优先级（用于渲染顺序）
 */
export const CONTENT_BLOCK_PRIORITY = {
  error: 0,
  system: 1,
  text: 2,
  markdown: 3,
  tool_call: 4,
  tool_result: 5,
  code: 6,
  code_result: 7,
  image: 8,
  file: 9,
  card: 10,
  progress: 11,
  form: 12,
} as const;

/**
 * 获取工具状态显示信息
 */
export function getToolStatusDisplay(status: keyof typeof TOOL_EXECUTION_STATUS_MAP) {
  return TOOL_EXECUTION_STATUS_MAP[status] || TOOL_EXECUTION_STATUS_MAP.pending;
}

/**
 * 获取错误消息
 */
export function getErrorMessage(errorCode: keyof typeof ERROR_MESSAGES): string {
  return ERROR_MESSAGES[errorCode] || '未知错误';
}

/**
 * 判断是否为常用工具
 */
export function isCommonTool(toolName: string): boolean {
  return Object.values(COMMON_TOOLS).includes(toolName as any);
}

/**
 * 获取工具类型
 */
export function getToolType(toolName: string): string {
  if (toolName.includes('file')) return TOOL_TYPES.FILE;
  if (toolName.includes('code') || toolName.includes('python') || toolName.includes('execute'))
    return TOOL_TYPES.CODE_EXECUTION;
  if (toolName.includes('api') || toolName.includes('http')) return TOOL_TYPES.API_CALL;
  if (toolName.includes('sql') || toolName.includes('db') || toolName.includes('query'))
    return TOOL_TYPES.DATABASE_QUERY;
  if (toolName.includes('search')) return TOOL_TYPES.SEARCH;
  return TOOL_TYPES.CUSTOM;
}
