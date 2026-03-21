/**
 * Component Registry Types
 *
 * 组件注册表相关的类型定义
 * 用于组件市场的 API 交互和数据结构
 */

/**
 * 组件信息接口
 */
export interface ComponentInfo {
  /** 组件唯一标识，格式：com.workbench.{name} */
  id: string;

  /** 组件名称 */
  name: string;

  /** 组件版本 (semver) */
  version: string;

  /** 组件描述 */
  description: string;

  /** 组件作者 */
  author?: string;

  /** 组件图标 (emoji 或 URL) */
  icon?: string;

  /** 清单文件 URL (相对路径) */
  manifestUrl: string;

  /** 入口文件 URL (相对路径) */
  entryUrl: string;

  /** 能力声明 */
  capabilities: {
    /** 必需的能力 */
    required: string[];
    /** 可选的能力 */
    optional: string[];
  };

  /** 发布时间 (ISO 时间戳) */
  publishedAt: string;

  /** 文件大小 (字节) */
  size?: number;
}

/**
 * 组件清单接口
 */
export interface ComponentManifest {
  /** 组件名称 */
  name: string;

  /** 组件版本 */
  version: string;

  /** 组件描述 */
  description: string;

  /** 组件作者 */
  author?: string;

  /** 组件图标 */
  icon?: string;

  /** 入口文件相对路径，如 "./index.js" */
  entry: string;

  /** 样式文件相对路径列表 */
  styles?: string[];

  /** 能力声明 */
  capabilities: {
    /** 必需的能力 */
    required: string[];
    /** 可选的能力 */
    optional: string[];
    /** 提供的能力 */
    provided: string[];
  };

  /** 权限列表 */
  permissions?: string[];

  /** 安全配置 */
  security?: {
    /** 所需权限 */
    permissions: string[];
    /** CSP 策略 */
    csp?: string;
  };
}

/**
 * 组件列表响应
 */
export interface ComponentListResponse {
  /** 请求是否成功 */
  success: boolean;

  /** 组件列表 */
  components: ComponentInfo[];
}

/**
 * 组件详情响应
 */
export interface ComponentDetailResponse {
  /** 请求是否成功 */
  success: boolean;

  /** 组件详情 */
  component: ComponentInfo;
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  /** 请求是否失败 */
  success: false;

  /** 错误信息 */
  error: string;

  /** 可选的错误码 */
  code?: string;
}

/**
 * 组件列表项 (简化版，用于列表展示)
 */
export interface ComponentListItem {
  /** 组件名称 */
  name: string;

  /** 组件描述 */
  description: string;

  /** 组件图标 */
  icon?: string;
}

/**
 * 组件引用解析结果
 */
export interface ParseResult {
  /** 引用的组件名称 */
  component?: string;

  /** 剩余的文本（移除组件引用后） */
  remainingText: string;

  /** 原始输入文本 */
  originalText: string;
}
