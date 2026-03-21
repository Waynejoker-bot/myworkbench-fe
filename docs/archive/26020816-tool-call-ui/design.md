# 工具调用 UI 设计方案

## 一、设计目标

1. **配置驱动**：通过配置文件定义工具的展示方式，无需修改代码
2. **扩展性强**：支持不同工具的差异化展示
3. **兜底完善**：未配置工具也能有良好的默认展示
4. **性能优秀**：支持大量工具调用的场景

---

## 二、核心架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    ToolCallCard 组件                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │          ToolDisplayConfig 解析器                  │  │
│  │  根据工具名查找配置 → 合并默认配置                  │  │
│  └───────────────────────────────────────────────────┘  │
│                           │                              │
│                           ▼                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │              ToolRenderer                          │  │
│  │  根据配置选择渲染策略：                              │  │
│  │  - custom_renderer → 自定义组件                     │  │
│  │  - preset_template → 预设模板                       │  │
│  │  - default → JSON 展示                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 三、工具展示配置接口

### 3.1 配置接口定义

```typescript
/**
 * 工具展示配置接口
 *
 * 用于配置后台定义工具的展示方式
 */
export interface ToolDisplayConfig {
  // ==================== 基础信息 ====================
  /**
   * 工具名称（唯一标识）
   * @example "calculator", "web_search", "file_browser"
   */
  toolName: string;

  /**
   * 工具显示名称
   * @example "计算器", "网络搜索", "文件浏览器"
   */
  displayName: string;

  /**
   * 工具图标
   * - emoji: "🔧"
   * - icon name: "calculator" (会映射到图标库)
   * - url: "https://..."
   */
  icon: string;

  /**
   * 工具描述（tooltip 或帮助文本）
   * @example "执行数学计算"
   */
  description?: string;

  /**
   * 工具分类（用于分组和权限控制）
   * @example "productivity", "search", "development"
   */
  category?: string;

  // ==================== 卡片配置 ====================
  /**
   * 卡片样式配置
   */
  card?: {
    /**
     * 默认展开状态
     * @default false
     */
    defaultExpanded?: boolean;

    /**
     * 是否允许折叠
     * @default true
     */
    collapsible?: boolean;

    /**
     * 卡片边框样式
     * @default "solid"
     */
    borderStyle?: 'solid' | 'dashed' | 'dotted';

    /**
     * 卡片主题色（用于状态指示）
     * @default "blue"
     */
    themeColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';

    /**
     * 自定义类名（用于深度定制）
     */
    className?: string;
  };

  // ==================== 参数展示配置 ====================
  /**
   * 参数展示配置
   */
  parameters?: {
    /**
     * 是否显示参数
     * @default true
     */
    show?: boolean;

    /**
     * 参数标题
     * @default "参数"
     */
    label?: string;

    /**
     * 展示模式
     * - json: JSON 格式展示（默认）
     * - pretty: 格式化键值对展示
     * - compact: 紧凑单行展示
     * - custom: 自定义渲染
     */
    displayMode?: 'json' | 'pretty' | 'compact' | 'custom';

    /**
     * 自定义参数渲染器（仅 displayMode: 'custom' 时有效）
     */
    customRenderer?: string; // 组件名或函数引用

    /**
     * 参数字段配置（用于 pretty 模式）
     */
    fields?: ParameterFieldConfig[];

    /**
     * 是否允许复制参数
     * @default true
     */
    allowCopy?: boolean;

    /**
     * 是否截断长内容
     * @default true
     */
    truncateLong?: boolean;

    /**
     * 截断长度（字符数）
     * @default 500
     */
    truncateLength?: number;

    /**
     * JSON 展示配置
     */
    jsonConfig?: {
      /**
       * 是否高亮语法
       * @default true
       */
      syntaxHighlight?: boolean;

      /**
       * 是否显示行号
       * @default false
       */
      lineNumbers?: boolean;

      /**
       * 缩进空格数
       * @default 2
       */
      indentSize?: number;

      /**
       * 是否可折叠
       * @default true
       */
      collapsible?: boolean;

      /**
       * 默认折叠深度
       * @default 2
       */
      defaultCollapseDepth?: number;
    };
  };

  // ==================== 结果展示配置 ====================
  /**
   * 结果展示配置
   */
  result?: {
    /**
     * 是否显示结果
     * @default true
     */
    show?: boolean;

    /**
     * 结果标题
     * @default "结果"
     */
    label?: string;

    /**
     * 展示模式
     * - json: JSON 格式展示（默认）
     * - pretty: 格式化展示
     * - compact: 紧凑展示
     * - custom: 自定义渲染
     * - template: 使用预设模板
     */
    displayMode?: 'json' | 'pretty' | 'compact' | 'custom' | 'template';

    /**
     * 自定义结果渲染器（仅 displayMode: 'custom' 时有效）
     */
    customRenderer?: string;

    /**
     * 预设模板名称（仅 displayMode: 'template' 时有效）
     * @example "search_results", "file_list", "code_output"
     */
    template?: string;

    /**
     * 模板参数（用于预设模板）
     */
    templateConfig?: Record<string, unknown>;

    /**
     * 是否允许复制结果
     * @default true
     */
    allowCopy?: boolean;

    /**
     * 是否截断长内容
     * @default true
     */
    truncateLong?: boolean;

    /**
     * 截断长度（字符数）
     * @default 1000
     */
    truncateLength?: number;

    /**
     * JSON 展示配置（同 parameters.jsonConfig）
     */
    jsonConfig?: {
      syntaxHighlight?: boolean;
      lineNumbers?: boolean;
      indentSize?: number;
      collapsible?: boolean;
      defaultCollapseDepth?: number;
    };
  };

  // ==================== 状态展示配置 ====================
  /**
   * 状态展示配置
   */
  status?: {
    /**
     * 是否显示状态图标
     * @default true
     */
    showIcon?: boolean;

    /**
     * 是否显示状态文本
     * @default true
     */
    showText?: boolean;

    /**
     * 状态文本自定义
     */
    textMap?: {
      pending?: string;
      running?: string;
      success?: string;
      error?: string;
      cancelled?: string;
    };

    /**
     * 是否显示执行时间
     * @default true
     */
    showExecutionTime?: boolean;

    /**
     * 运行时是否显示进度指示器
     * @default true
     */
    showProgress?: boolean;
  };

  // ==================== 交互配置 ====================
  /**
   * 交互配置
   */
  interactions?: {
    /**
     * 是否显示工具栏（复制、重试等按钮）
     * @default true
     */
    showToolbar?: boolean;

    /**
     * 工具栏按钮配置
     */
    actions?: ToolActionConfig[];

    /**
     * 是否支持快捷键
     * @default false
     */
    enableKeyboardShortcuts?: boolean;
  };

  // ==================== 条件显示配置 ====================
  /**
   * 条件显示规则（高级功能）
   */
  conditionalDisplay?: {
    /**
     * 显示条件表达式
     * - 基于参数值
     * - 基于结果大小
     * - 基于执行时间
     */
    rules?: ConditionalRule[];
  };

  // ==================== 调试配置 ====================
  /**
   * 调试配置（仅开发模式）
   */
  debug?: {
    /**
     * 是否显示原始数据
     * @default false
     */
    showRawData?: boolean;

    /**
     * 是否显示执行时长
     * @default false
     */
    showExecutionTime?: boolean;

    /**
     * 是否显示配置信息
     * @default false
     */
    showConfigInfo?: boolean;
  };
}

/**
 * 参数字段配置
 */
export interface ParameterFieldConfig {
  /**
   * 字段名
   */
  name: string;

  /**
   * 显示标签
   */
  label: string;

  /**
   * 字段类型
   */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';

  /**
   * 是否必填
   */
  required?: boolean;

  /**
   * 枚举值（type: 'enum' 时）
   */
  enumValues?: Array<{ value: string; label: string }>;

  /**
   * 是否敏感信息（如密码）
   * @default false
   */
  sensitive?: boolean;

  /**
   * 敏感信息占位符
   * @default "***"
   */
  sensitivePlaceholder?: string;

  /**
   * 自定义格式化函数
   */
  format?: string; // 函数引用

  /**
   * 是否隐藏
   */
  hidden?: boolean;
}

/**
 * 工具动作配置
 */
export interface ToolActionConfig {
  /**
   * 动作 ID
   */
  id: string;

  /**
   * 按钮标签
   */
  label: string;

  /**
   * 按钮图标
   */
  icon?: string;

  /**
   * 按钮样式
   */
  style?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost';

  /**
   * 动作类型
   * - copy_params: 复制参数
   * - copy_result: 复制结果
   * - retry: 重试
   * - cancel: 取消
   * - custom: 自定义
   */
  action: 'copy_params' | 'copy_result' | 'retry' | 'cancel' | 'custom';

  /**
   * 自定义动作处理函数
   */
  handler?: string;

  /**
   * 显示条件
   */
  showCondition?: string; // 表达式
}

/**
 * 条件规则
 */
export interface ConditionalRule {
  /**
   * 规则描述
   */
  description: string;

  /**
   * 条件表达式
   */
  condition: string; // 如 "params.limit > 10"

  /**
   * 满足条件时应用的配置（覆盖默认配置）
   */
  config: Partial<ToolDisplayConfig>;
}
```

### 3.2 默认配置

```typescript
/**
 * 工具展示默认配置
 *
 * 当工具没有配置时使用此配置
 */
export const DEFAULT_TOOL_DISPLAY_CONFIG: ToolDisplayConfig = {
  toolName: '__default__',
  displayName: '工具',
  icon: '🔧',
  description: '未配置的工具',
  category: 'uncategorized',

  card: {
    defaultExpanded: false,
    collapsible: true,
    borderStyle: 'solid',
    themeColor: 'blue',
    className: undefined,
  },

  parameters: {
    show: true,
    label: '参数',
    displayMode: 'json',
    fields: undefined,
    allowCopy: true,
    truncateLong: true,
    truncateLength: 500,
    jsonConfig: {
      syntaxHighlight: true,
      lineNumbers: false,
      indentSize: 2,
      collapsible: true,
      defaultCollapseDepth: 2,
    },
  },

  result: {
    show: true,
    label: '结果',
    displayMode: 'json',
    customRenderer: undefined,
    template: undefined,
    templateConfig: undefined,
    allowCopy: true,
    truncateLong: true,
    truncateLength: 1000,
    jsonConfig: {
      syntaxHighlight: true,
      lineNumbers: false,
      indentSize: 2,
      collapsible: true,
      defaultCollapseDepth: 2,
    },
  },

  status: {
    showIcon: true,
    showText: true,
    textMap: {
      pending: '等待中',
      running: '执行中',
      success: '成功',
      error: '失败',
      cancelled: '已取消',
    },
    showExecutionTime: true,
    showProgress: true,
  },

  interactions: {
    showToolbar: true,
    actions: [
      {
        id: 'copy_params',
        label: '复制参数',
        icon: '📋',
        action: 'copy_params',
      },
      {
        id: 'copy_result',
        label: '复制结果',
        icon: '📋',
        action: 'copy_result',
      },
      {
        id: 'retry',
        label: '重试',
        icon: '🔄',
        action: 'retry',
        showCondition: 'status === "error"',
      },
    ],
    enableKeyboardShortcuts: false,
  },

  debug: {
    showRawData: false,
    showExecutionTime: false,
    showConfigInfo: false,
  },
};
```

---

## 四、ToolCallCard 组件设计

### 4.1 组件 Props 定义

```typescript
/**
 * ToolCallCard 组件 Props
 */
export interface ToolCallCardProps {
  // ==================== 工具数据 ====================
  /**
   * 工具调用数据
   */
  toolCall: ToolCallBlock;

  /**
   * 工具展示配置（可选，未提供时从配置服务获取）
   */
  config?: ToolDisplayConfig;

  // ==================== UI 状态 ====================
  /**
   * 初始展开状态
   * @default false (从 config 读取，如无 config 则默认 false)
   */
  initiallyExpanded?: boolean;

  /**
   * 只读模式（隐藏交互按钮）
   * @default false
   */
  readOnly?: boolean;

  /**
   * 紧凑模式（减少内边距和字体大小）
   * @default false
   */
  compact?: boolean;

  // ==================== 事件处理 ====================
  /**
   * 折叠状态变化回调
   */
  onExpandChange?: (expanded: boolean) => void;

  /**
   * 操作按钮点击回调
   */
  onAction?: (action: string, data: unknown) => void;

  /**
   * 参数点击回调（用于跳转或其他交互）
   */
  onParamClick?: (paramName: string, value: unknown) => void;

  /**
   * 结果点击回调
   */
  onResultClick?: (result: unknown) => void;

  // ==================== 样式定制 ====================
  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 自定义样式
   */
  style?: React.CSSProperties;

  // ==================== 调试 ====================
  /**
   * 开发模式（显示调试信息）
   */
  debug?: boolean;
}
```

### 4.2 组件结构设计

```typescript
/**
 * ToolCallCard 组件结构
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  ToolCallCard                                       │
 * │  ┌───────────────────────────────────────────────┐  │
 * │  │  CardHeader (工具名 + 状态 + 折叠按钮)        │  │
 * │  └───────────────────────────────────────────────┘  │
 * │  ┌───────────────────────────────────────────────┐  │
 * │  │  CardBody (可折叠)                            │  │
 * │  │  ┌─────────────────────────────────────────┐  │  │
 * │  │  │  ParametersSection (根据配置渲染)        │  │  │
 * │  │  │  - json: JSONViewer                     │  │  │
 * │  │  │  - pretty: ParameterList                │  │  │
 * │  │  │  - custom: CustomRenderer               │  │  │
 * │  │  └─────────────────────────────────────────┘  │  │
 * │  │  ┌─────────────────────────────────────────┐  │  │
 * │  │  │  ResultSection (根据配置渲染)           │  │  │
 * │  │  │  - json: JSONViewer                     │  │  │
 * │  │  │  - pretty: FormattedResult              │  │  │
 * │  │  │  - template: TemplateRenderer           │  │  │
 * │  │  │  - custom: CustomRenderer               │  │  │
 * │  │  └─────────────────────────────────────────┘  │  │
 * │  │  ┌─────────────────────────────────────────┐  │  │
 * │  │  │  ExecutionInfo (执行时间、错误信息等)    │  │  │
 * │  │  └─────────────────────────────────────────┘  │  │
 * │  └───────────────────────────────────────────────┘  │
 * │  ┌───────────────────────────────────────────────┐  │
 * │  │  CardToolbar (复制、重试等按钮)               │  │
 * │  └───────────────────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────┘
 */
```

### 4.3 子组件定义

```typescript
/**
 * 卡片头部组件
 */
export interface CardHeaderProps {
  displayName: string;
  icon: string;
  status: ToolStatus;
  statusText?: string;
  expanded: boolean;
  collapsible: boolean;
  onExpandChange: (expanded: boolean) => void;
  themeColor: string;
}

/**
 * 参数展示组件
 */
export interface ParametersSectionProps {
  parameters: Record<string, unknown>;
  config: ToolDisplayConfig['parameters'];
  onCopy?: () => void;
  onParamClick?: (paramName: string, value: unknown) => void;
}

/**
 * 结果展示组件
 */
export interface ResultSectionProps {
  result: unknown;
  status: ToolStatus;
  error?: string;
  config: ToolDisplayConfig['result'];
  onCopy?: () => void;
  onClick?: () => void;
}

/**
 * 工具栏组件
 */
export interface CardToolbarProps {
  actions: ToolActionConfig[];
  status: ToolStatus;
  parameters: Record<string, unknown>;
  result: unknown;
  onAction: (action: string, data: unknown) => void;
  compact?: boolean;
}
```

---

## 五、配置示例

### 5.1 Calculator 工具配置

```typescript
export const CALCULATOR_CONFIG: ToolDisplayConfig = {
  toolName: 'calculator',
  displayName: '计算器',
  icon: '🔢',
  description: '执行数学计算',
  category: 'productivity',

  card: {
    defaultExpanded: false,
    collapsible: true,
    borderStyle: 'solid',
    themeColor: 'green',
  },

  parameters: {
    show: true,
    label: '计算表达式',
    displayMode: 'pretty', // 使用格式化展示
    fields: [
      {
        name: 'expression',
        label: '表达式',
        type: 'string',
        required: true,
      },
      {
        name: 'precision',
        label: '精度',
        type: 'number',
        required: false,
      },
    ],
    allowCopy: true,
    truncateLong: false,
  },

  result: {
    show: true,
    label: '计算结果',
    displayMode: 'pretty', // 单个数值直接显示，不需要 JSON
    allowCopy: true,
    truncateLong: false,
  },

  status: {
    showIcon: true,
    showText: false, // 只显示图标，不显示文本
    textMap: {
      success: '计算完成',
      error: '计算错误',
    },
    showExecutionTime: false, // 简单计算不显示时间
    showProgress: false,
  },

  interactions: {
    showToolbar: true,
    actions: [
      {
        id: 'copy_result',
        label: '复制结果',
        icon: '📋',
        action: 'copy_result',
        style: 'primary',
      },
      {
        id: 'retry',
        label: '重新计算',
        icon: '🔄',
        action: 'retry',
        showCondition: 'status === "error"',
      },
    ],
  },
};
```

### 5.2 Web Search 工具配置

```typescript
export const WEB_SEARCH_CONFIG: ToolDisplayConfig = {
  toolName: 'web_search',
  displayName: '网络搜索',
  icon: '🔍',
  description: '搜索互联网信息',
  category: 'search',

  card: {
    defaultExpanded: false,
    collapsible: true,
    borderStyle: 'solid',
    themeColor: 'blue',
  },

  parameters: {
    show: true,
    label: '搜索参数',
    displayMode: 'pretty',
    fields: [
      {
        name: 'query',
        label: '搜索关键词',
        type: 'string',
        required: true,
      },
      {
        name: 'limit',
        label: '结果数量',
        type: 'number',
        required: false,
      },
      {
        name: 'language',
        label: '语言',
        type: 'enum',
        enumValues: [
          { value: 'en', label: '英语' },
          { value: 'zh', label: '中文' },
        ],
        required: false,
      },
    ],
    allowCopy: true,
  },

  result: {
    show: true,
    label: '搜索结果',
    displayMode: 'template', // 使用预设模板
    template: 'search_results', // 搜索结果模板
    templateConfig: {
      showSnippet: true,
      showUrl: true,
      maxResults: 10,
    },
    allowCopy: false, // 搜索结果通常不需要整体复制
    truncateLong: true,
    truncateLength: 2000,
  },

  status: {
    showIcon: true,
    showText: true,
    textMap: {
      pending: '准备搜索',
      running: '搜索中...',
      success: '搜索完成',
      error: '搜索失败',
    },
    showExecutionTime: true,
    showProgress: true,
  },

  interactions: {
    showToolbar: true,
    actions: [
      {
        id: 'copy_params',
        label: '复制搜索词',
        icon: '📋',
        action: 'copy_params',
      },
      {
        id: 'open_browser',
        label: '在浏览器打开',
        icon: '🌐',
        action: 'custom',
        handler: 'handleOpenInBrowser',
      },
    ],
  },
};
```

### 5.3 File Browser 工具配置

```typescript
export const FILE_BROWSER_CONFIG: ToolDisplayConfig = {
  toolName: 'file_browser',
  displayName: '文件浏览器',
  icon: '📁',
  description: '浏览文件系统',
  category: 'development',

  card: {
    defaultExpanded: true, // 文件浏览器默认展开，因为用户通常需要查看结果
    collapsible: true,
    borderStyle: 'solid',
    themeColor: 'purple',
  },

  parameters: {
    show: true,
    label: '路径',
    displayMode: 'compact', // 单行紧凑显示
    fields: [
      {
        name: 'path',
        label: '路径',
        type: 'string',
        required: true,
      },
      {
        name: 'recursive',
        label: '递归',
        type: 'boolean',
        required: false,
      },
    ],
    allowCopy: true,
  },

  result: {
    show: true,
    label: '文件列表',
    displayMode: 'template', // 使用文件列表模板
    template: 'file_list',
    templateConfig: {
      showIcons: true,
      showSize: true,
      showModifiedTime: true,
      sortBy: 'name',
      sortOrder: 'asc',
    },
    allowCopy: true,
    truncateLong: false, // 文件列表通常不需要截断
  },

  status: {
    showIcon: true,
    showText: true,
    textMap: {
      running: '扫描中...',
      success: '找到 {count} 个文件', // 支持占位符
      error: '访问失败',
    },
    showExecutionTime: true,
    showProgress: false, // 文件扫描通常很快，不需要进度条
  },

  interactions: {
    showToolbar: true,
    actions: [
      {
        id: 'copy_result',
        label: '复制列表',
        icon: '📋',
        action: 'copy_result',
      },
      {
        id: 'download',
        label: '下载',
        icon: '⬇️',
        action: 'custom',
        handler: 'handleDownload',
        showCondition: 'result.files.length > 0',
      },
    ],
  },
};
```

### 5.4 API Call 工具配置（复杂示例）

```typescript
export const API_CALL_CONFIG: ToolDisplayConfig = {
  toolName: 'api_call',
  displayName: 'API 调用',
  icon: '🌐',
  description: '发送 HTTP 请求',
  category: 'development',

  card: {
    defaultExpanded: false,
    collapsible: true,
    borderStyle: 'dashed', // API 调用用虚线边框区分
    themeColor: 'orange',
  },

  parameters: {
    show: true,
    label: '请求参数',
    displayMode: 'pretty',
    fields: [
      {
        name: 'method',
        label: '方法',
        type: 'enum',
        enumValues: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' },
        ],
        required: true,
      },
      {
        name: 'url',
        label: 'URL',
        type: 'string',
        required: true,
      },
      {
        name: 'headers',
        label: '请求头',
        type: 'object',
        required: false,
      },
      {
        name: 'body',
        label: '请求体',
        type: 'object',
        required: false,
      },
      {
        name: 'auth',
        label: '认证信息',
        type: 'object',
        required: false,
        sensitive: true, // 敏感信息
        sensitivePlaceholder: '*** (已隐藏)',
      },
    ],
    allowCopy: true,
    truncateLong: true,
    truncateLength: 1000,
  },

  result: {
    show: true,
    label: '响应',
    displayMode: 'json', // API 响应通常用 JSON 展示
    jsonConfig: {
      syntaxHighlight: true,
      lineNumbers: false,
      indentSize: 2,
      collapsible: true,
      defaultCollapseDepth: 3, // API 响应可能很深，默认折叠 3 层
    },
    allowCopy: true,
    truncateLong: true,
    truncateLength: 5000, // API 响应可能很大
  },

  status: {
    showIcon: true,
    showText: true,
    textMap: {
      running: '请求中...',
      success: '成功 ({statusCode})', // 支持状态码占位符
      error: '请求失败',
    },
    showExecutionTime: true, // API 调用显示耗时很重要
    showProgress: true,
  },

  interactions: {
    showToolbar: true,
    actions: [
      {
        id: 'copy_result',
        label: '复制响应',
        icon: '📋',
        action: 'copy_result',
        style: 'primary',
      },
      {
        id: 'retry',
        label: '重试',
        icon: '🔄',
        action: 'retry',
        showCondition: 'status === "error" || result.statusCode >= 500',
      },
      {
        id: 'open_in_postman',
        label: '在 Postman 打开',
        icon: '📮',
        action: 'custom',
        handler: 'handleOpenInPostman',
      },
    ],
  },

  // 条件显示规则
  conditionalDisplay: {
    rules: [
      {
        description: '大响应时折叠',
        condition: 'result && result.body && JSON.stringify(result.body).length > 5000',
        config: {
          card: {
            defaultExpanded: false,
          },
          result: {
            truncateLength: 500, // 大响应时截断到 500 字符
          },
        },
      },
      {
        description: '错误时展开并高亮',
        condition: 'status === "error"',
        config: {
          card: {
            defaultExpanded: true,
            themeColor: 'red',
          },
        },
      },
    ],
  },
};
```

---

## 六、预设模板系统

### 6.1 模板接口定义

```typescript
/**
 * 预设模板接口
 *
 * 用于常见的工具结果展示
 */
export interface ToolResultTemplate {
  /**
   * 模板名称
   */
  name: string;

  /**
   * 模板显示名称
   */
  displayName: string;

  /**
   * 模板描述
   */
  description?: string;

  /**
   * 模板适用的数据结构
   */
  dataSchema?: {
    /**
     * 期望的数据结构（TypeScript 类型描述）
     */
    type: string;

    /**
     * 必需字段
     */
    requiredFields?: string[];

    /**
     * 可选字段
     */
    optionalFields?: string[];
  };

  /**
   * 模板配置项
   */
  configOptions?: TemplateConfigOption[];

  /**
   * 模板组件
   */
  component: React.ComponentType<TemplateRenderProps>;
}

/**
 * 模板渲染 Props
 */
export interface TemplateRenderProps {
  /**
   * 数据
   */
  data: unknown;

  /**
   * 模板配置
   */
  config: Record<string, unknown>;

  /**
   * 工具调用状态
   */
  status: ToolStatus;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 事件回调
   */
  onAction?: (action: string, data: unknown) => void;
}

/**
 * 模板配置选项
 */
export interface TemplateConfigOption {
  /**
   * 配置项名称
   */
  name: string;

  /**
   * 配置项标签
   */
  label: string;

  /**
   * 配置项类型
   */
  type: 'boolean' | 'number' | 'string' | 'enum' | 'object';

  /**
   * 默认值
   */
  defaultValue?: unknown;

  /**
   * 枚举值（type: 'enum' 时）
   */
  enumValues?: Array<{ value: string; label: string }>;

  /**
   * 描述
   */
  description?: string;
}
```

### 6.2 内置模板

#### 1. 搜索结果模板 (search_results)

```typescript
export const SEARCH_RESULTS_TEMPLATE: ToolResultTemplate = {
  name: 'search_results',
  displayName: '搜索结果',
  description: '用于展示搜索引擎返回的结果列表',

  dataSchema: {
    type: '{ results: Array<{ title: string, url: string, snippet: string }> }',
    requiredFields: ['results'],
    optionalFields: ['totalCount', 'searchTime'],
  },

  configOptions: [
    {
      name: 'showSnippet',
      label: '显示摘要',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showUrl',
      label: '显示 URL',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'maxResults',
      label: '最大结果数',
      type: 'number',
      defaultValue: 10,
    },
    {
      name: 'openInNewTab',
      label: '在新标签页打开',
      type: 'boolean',
      defaultValue: true,
    },
  ],

  component: SearchResultsTemplate,
};
```

#### 2. 文件列表模板 (file_list)

```typescript
export const FILE_LIST_TEMPLATE: ToolResultTemplate = {
  name: 'file_list',
  displayName: '文件列表',
  description: '用于展示文件系统查询结果',

  dataSchema: {
    type: '{ files: Array<{ name: string, path: string, size?: number, modified?: string }> }',
    requiredFields: ['files'],
    optionalFields: ['totalCount', 'scannedPath'],
  },

  configOptions: [
    {
      name: 'showIcons',
      label: '显示文件图标',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showSize',
      label: '显示文件大小',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showModifiedTime',
      label: '显示修改时间',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'sortBy',
      label: '排序方式',
      type: 'enum',
      enumValues: [
        { value: 'name', label: '名称' },
        { value: 'size', label: '大小' },
        { value: 'modified', label: '修改时间' },
      ],
      defaultValue: 'name',
    },
    {
      name: 'sortOrder',
      label: '排序顺序',
      type: 'enum',
      enumValues: [
        { value: 'asc', label: '升序' },
        { value: 'desc', label: '降序' },
      ],
      defaultValue: 'asc',
    },
  ],

  component: FileListTemplate,
};
```

#### 3. 代码输出模板 (code_output)

```typescript
export const CODE_OUTPUT_TEMPLATE: ToolResultTemplate = {
  name: 'code_output',
  displayName: '代码执行输出',
  description: '用于展示代码执行结果',

  dataSchema: {
    type: '{ output?: string, error?: string, exitCode?: number, executionTime?: number }',
    requiredFields: [],
    optionalFields: ['output', 'error', 'exitCode', 'executionTime'],
  },

  configOptions: [
    {
      name: 'showExitCode',
      label: '显示退出码',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'showExecutionTime',
      label: '显示执行时间',
      type: 'boolean',
      defaultValue: true,
    },
    {
      name: 'maxOutputLines',
      label: '最大输出行数',
      type: 'number',
      defaultValue: 1000,
      description: '超过此行数将截断输出',
    },
  ],

  component: CodeOutputTemplate,
};
```

---

## 七、配置服务接口

### 7.1 配置获取接口

```typescript
/**
 * 工具配置服务接口
 */
export interface ToolConfigService {
  /**
   * 根据工具名称获取配置
   * @param toolName 工具名称
   * @returns 工具配置，如果不存在则返回 null
   */
  getConfig(toolName: string): Promise<ToolDisplayConfig | null>;

  /**
   * 批量获取配置
   * @param toolNames 工具名称数组
   * @returns 工具配置映射
   */
  getConfigs(toolNames: string[]): Promise<Map<string, ToolDisplayConfig>>;

  /**
   * 获取所有工具配置
   * @returns 所有工具配置
   */
  getAllConfigs(): Promise<ToolDisplayConfig[]>;

  /**
   * 更新工具配置
   * @param toolName 工具名称
   * @param config 新配置
   */
  updateConfig(toolName: string, config: ToolDisplayConfig): Promise<void>;

  /**
   * 删除工具配置
   * @param toolName 工具名称
   */
  deleteConfig(toolName: string): Promise<void>;
}

/**
 * 内存实现（开发用）
 */
export class InMemoryToolConfigService implements ToolConfigService {
  private configs = new Map<string, ToolDisplayConfig>();

  constructor(initialConfigs?: ToolDisplayConfig[]) {
    initialConfigs?.forEach(config => {
      this.configs.set(config.toolName, config);
    });
  }

  async getConfig(toolName: string): Promise<ToolDisplayConfig | null> {
    return this.configs.get(toolName) || null;
  }

  async getConfigs(toolNames: string[]): Promise<Map<string, ToolDisplayConfig>> {
    const result = new Map<string, ToolDisplayConfig>();
    toolNames.forEach(name => {
      const config = this.configs.get(name);
      if (config) {
        result.set(name, config);
      }
    });
    return result;
  }

  async getAllConfigs(): Promise<ToolDisplayConfig[]> {
    return Array.from(this.configs.values());
  }

  async updateConfig(toolName: string, config: ToolDisplayConfig): Promise<void> {
    this.configs.set(toolName, config);
  }

  async deleteConfig(toolName: string): Promise<void> {
    this.configs.delete(toolName);
  }
}

/**
 * 远程 API 实现（生产用）
 */
export class RemoteToolConfigService implements ToolConfigService {
  constructor(private baseUrl: string) {}

  async getConfig(toolName: string): Promise<ToolDisplayConfig | null> {
    const response = await fetch(`${this.baseUrl}/tools/${toolName}/config`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch config for ${toolName}`);
    }
    return response.json();
  }

  async getConfigs(toolNames: string[]): Promise<Map<string, ToolDisplayConfig>> {
    const response = await fetch(`${this.baseUrl}/tools/configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolNames }),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch configs');
    }
    const configs: ToolDisplayConfig[] = await response.json();
    const map = new Map<string, ToolDisplayConfig>();
    configs.forEach(config => {
      map.set(config.toolName, config);
    });
    return map;
  }

  async getAllConfigs(): Promise<ToolDisplayConfig[]> {
    const response = await fetch(`${this.baseUrl}/tools/configs`);
    if (!response.ok) {
      throw new Error('Failed to fetch all configs');
    }
    return response.json();
  }

  async updateConfig(toolName: string, config: ToolDisplayConfig): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tools/${toolName}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      throw new Error(`Failed to update config for ${toolName}`);
    }
  }

  async deleteConfig(toolName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tools/${toolName}/config`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete config for ${toolName}`);
    }
  }
}
```

### 7.2 配置 Hook

```typescript
/**
 * 使用工具配置 Hook
 */
export function useToolConfig(toolName: string): {
  config: ToolDisplayConfig | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [config, setConfig] = useState<ToolDisplayConfig | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    toolConfigService
      .getConfig(toolName)
      .then(result => {
        setConfig(result || undefined);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [toolName]);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);

    toolConfigService
      .getConfig(toolName)
      .then(result => {
        setConfig(result || undefined);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [toolName]);

  return { config, loading, error, refetch };
}

/**
 * 批量使用工具配置 Hook
 */
export function useToolConfigs(toolNames: string[]): {
  configs: Map<string, ToolDisplayConfig>;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [configs, setConfigs] = useState<Map<string, ToolDisplayConfig>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (toolNames.length === 0) {
      setConfigs(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    toolConfigService
      .getConfigs(toolNames)
      .then(result => {
        setConfigs(result);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [toolNames.join(',')]);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);

    toolConfigService
      .getConfigs(toolNames)
      .then(result => {
        setConfigs(result);
        setLoading(false);
      });
  }, [toolNames.join(',')]);

  return { configs, loading, error, refetch };
}
```

---

## 八、渲染流程

### 8.1 配置合并流程

```typescript
/**
 * 合并工具配置与默认配置
 */
export function mergeToolConfig(
  userConfig: ToolDisplayConfig | null | undefined,
  toolName: string
): ToolDisplayConfig {
  // 如果没有配置，使用默认配置（但替换 toolName）
  if (!userConfig) {
    return {
      ...DEFAULT_TOOL_DISPLAY_CONFIG,
      toolName,
      displayName: toolName, // 使用工具名作为显示名
    };
  }

  // 深度合并配置
  return deepMerge(DEFAULT_TOOL_DISPLAY_CONFIG, userConfig, {
    // 合并数组而不是替换
    mergeArrays: false,
    // 保留自定义字段
    keepCustomFields: true,
  });
}

/**
 * 深度合并两个对象
 */
function deepMerge<T>(
  base: T,
  override: Partial<T>,
  options: { mergeArrays?: boolean; keepCustomFields?: boolean } = {}
): T {
  const result = { ...base };

  for (const key in override) {
    if (override[key] === undefined) {
      continue;
    }

    if (
      typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      key in result &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      // 递归合并对象
      result[key] = deepMerge(
        result[key] as any,
        override[key] as any,
        options
      );
    } else if (Array.isArray(override[key]) && Array.isArray(result[key])) {
      // 处理数组
      if (options.mergeArrays) {
        result[key] = [...(result[key] as any), ...(override[key] as any)] as any;
      } else {
        result[key] = override[key] as any;
      }
    } else {
      // 直接覆盖
      result[key] = override[key] as any;
    }
  }

  return result;
}
```

### 8.2 条件规则应用

```typescript
/**
 * 应用条件显示规则
 */
export function applyConditionalRules(
  config: ToolDisplayConfig,
  context: {
    parameters: Record<string, unknown>;
    result: unknown;
    status: ToolStatus;
    executionTime?: number;
  }
): ToolDisplayConfig {
  if (!config.conditionalDisplay?.rules || config.conditionalDisplay.rules.length === 0) {
    return config;
  }

  let result = { ...config };

  for (const rule of config.conditionalDisplay.rules) {
    if (evaluateCondition(rule.condition, context)) {
      // 合并规则配置
      result = deepMerge(result, rule.config);
    }
  }

  return result;
}

/**
 * 评估条件表达式
 */
function evaluateCondition(
  condition: string,
  context: {
    parameters: Record<string, unknown>;
    result: any;
    status: ToolStatus;
    executionTime?: number;
  }
): boolean {
  try {
    // 创建安全的求值环境
    const func = new Function(
      'params',
      'result',
      'status',
      'executionTime',
      `return ${condition}`
    );

    return func(
      context.parameters,
      context.result,
      context.status,
      context.executionTime
    );
  } catch (error) {
    console.error('Failed to evaluate condition:', condition, error);
    return false;
  }
}
```

### 8.3 渲染器选择流程

```typescript
/**
 * 根据配置选择渲染器
 */
export function selectRenderer(
  config: ToolDisplayConfig,
  section: 'parameters' | 'result'
): Renderer {
  const sectionConfig = config[section];
  if (!sectionConfig || !sectionConfig.show) {
    return { type: 'hidden' };
  }

  const displayMode = sectionConfig.displayMode;

  switch (displayMode) {
    case 'json':
      return {
        type: 'json',
        config: sectionConfig.jsonConfig || {},
      };

    case 'pretty':
      return {
        type: 'pretty',
        fields: sectionConfig.fields || [],
      };

    case 'compact':
      return {
        type: 'compact',
      };

    case 'custom':
      return {
        type: 'custom',
        component: sectionConfig.customRenderer,
      };

    case 'template':
      return {
        type: 'template',
        template: sectionConfig.template,
        templateConfig: sectionConfig.templateConfig || {},
      };

    default:
      return {
        type: 'json',
        config: {},
      };
  }
}

/**
 * 渲染器类型
 */
export type Renderer =
  | { type: 'hidden' }
  | { type: 'json'; config: NonNullable<ToolDisplayConfig['parameters']>['jsonConfig'] }
  | { type: 'pretty'; fields: ParameterFieldConfig[] }
  | { type: 'compact' }
  | { type: 'custom'; component?: string }
  | { type: 'template'; template?: string; templateConfig?: Record<string, unknown> };
```

---

## 九、性能优化

### 9.1 虚拟化渲染

```typescript
/**
 * 当一条消息有大量工具调用时，使用虚拟化渲染
 */
export function useVirtualizedToolCalls(toolCalls: ToolCallBlock[], options: {
  itemHeight: number;
  overscan?: number;
}) {
  return useVirtual({
    size: toolCalls.length,
    parentRef: useRef<HTMLDivElement>(null),
    estimateSize: useCallback(() => options.itemHeight, [options.itemHeight]),
    overscan: options.overscan || 3,
  });
}
```

### 9.2 懒加载配置

```typescript
/**
 * 配置懒加载和缓存
 */
export class CachedToolConfigService implements ToolConfigService {
  private cache = new Map<string, { config: ToolDisplayConfig; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 分钟

  constructor(private baseService: ToolConfigService) {}

  async getConfig(toolName: string): Promise<ToolDisplayConfig | null> {
    const cached = this.cache.get(toolName);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.config;
    }

    const config = await this.baseService.getConfig(toolName);
    if (config) {
      this.cache.set(toolName, { config, timestamp: Date.now() });
    }
    return config;
  }

  // ... 其他方法类似
}
```

---

## 十、类型定义总结

```typescript
/**
 * 工具状态
 */
export type ToolStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled';

/**
 * 工具调用数据块（来自 content-block.ts）
 */
export interface ToolCallBlock extends ContentBlock {
  type: ContentType.TOOL_CALL;
  toolName: string;
  parameters: Record<string, unknown>;
  status: ToolStatus;
  result?: unknown;
  error?: string;
  executionTime?: number; // 执行时长（毫秒）
}

/**
 * 工具展示配置（完整定义见上文）
 */
export interface ToolDisplayConfig {
  toolName: string;
  displayName: string;
  icon: string;
  description?: string;
  category?: string;
  card?: {
    defaultExpanded?: boolean;
    collapsible?: boolean;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
    themeColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
    className?: string;
  };
  parameters?: {
    show?: boolean;
    label?: string;
    displayMode?: 'json' | 'pretty' | 'compact' | 'custom';
    customRenderer?: string;
    fields?: ParameterFieldConfig[];
    allowCopy?: boolean;
    truncateLong?: boolean;
    truncateLength?: number;
    jsonConfig?: {
      syntaxHighlight?: boolean;
      lineNumbers?: boolean;
      indentSize?: number;
      collapsible?: boolean;
      defaultCollapseDepth?: number;
    };
  };
  result?: {
    show?: boolean;
    label?: string;
    displayMode?: 'json' | 'pretty' | 'compact' | 'custom' | 'template';
    customRenderer?: string;
    template?: string;
    templateConfig?: Record<string, unknown>;
    allowCopy?: boolean;
    truncateLong?: boolean;
    truncateLength?: number;
    jsonConfig?: {
      syntaxHighlight?: boolean;
      lineNumbers?: boolean;
      indentSize?: number;
      collapsible?: boolean;
      defaultCollapseDepth?: number;
    };
  };
  status?: {
    showIcon?: boolean;
    showText?: boolean;
    textMap?: {
      pending?: string;
      running?: string;
      success?: string;
      error?: string;
      cancelled?: string;
    };
    showExecutionTime?: boolean;
    showProgress?: boolean;
  };
  interactions?: {
    showToolbar?: boolean;
    actions?: ToolActionConfig[];
    enableKeyboardShortcuts?: boolean;
  };
  conditionalDisplay?: {
    rules?: ConditionalRule[];
  };
  debug?: {
    showRawData?: boolean;
    showExecutionTime?: boolean;
    showConfigInfo?: boolean;
  };
}
```

---

## 十一、使用示例

### 11.1 基本使用

```typescript
import { ToolCallCard } from './components/ToolCallCard';

function MessageBubble({ contentBlocks }: { contentBlocks: AnyContentBlock[] }) {
  return (
    <div>
      {contentBlocks.map((block, index) => {
        if (block.type === ContentType.TOOL_CALL) {
          return (
            <ToolCallCard
              key={block.id || index}
              toolCall={block as ToolCallBlock}
              // config 会被自动从配置服务获取
              onAction={(action, data) => {
                console.log('Action:', action, data);
              }}
            />
          );
        }
        // ... 其他类型的块
      })}
    </div>
  );
}
```

### 11.2 带自定义配置

```typescript
function MessageBubble({ contentBlocks }: { contentBlocks: AnyContentBlock[] }) {
  return (
    <div>
      {contentBlocks.map((block, index) => {
        if (block.type === ContentType.TOOL_CALL) {
          const toolCall = block as ToolCallBlock;
          return (
            <ToolCallCard
              key={block.id || index}
              toolCall={toolCall}
              config={{
                // 覆盖部分配置
                card: {
                  defaultExpanded: toolCall.status === 'error',
                },
              }}
            />
          );
        }
      })}
    </div>
  );
}
```

---

*文档创建时间：2026-02-08*
