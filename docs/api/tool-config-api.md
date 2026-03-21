# 工具配置 API 文档

## 概述

工具配置 API 用于获取工具调用（Tool Call）的显示配置。通过这些配置，前端可以优雅地展示工具调用的输入参数和执行结果。

**核心设计理念**：
- **永不失败**：任何异常情况下都返回空配置 `{}`，前端使用默认配置
- **可选配置**：后端可以选择性提供配置，前端必须有完整的兜底逻辑
- **类型安全**：完整的 TypeScript 类型定义，确保类型安全

---

## API 接口

### 获取单个工具配置

**请求**
```
GET /api/tools/config?tool_name={tool_name}
```

**查询参数**
- `tool_name` (string, required): 工具名称，例如 `calculator`, `web_search`, `file_browser`
  - 必须 URL 编码
  - 建议前端进行白名单验证，只允许字母、数字、下划线、连字符

**示例请求**
```
GET /api/tools/config?tool_name=calculator
GET /api/tools/config?tool_name=web_search
GET /api/tools/config?tool_name=file_browser
```

### 获取所有工具配置

**请求**
```
GET /api/tools/config
```

**响应格式**

**成功响应 (200 OK)**
```json
{
  "version": "1.0.0",
  "updated_at": "2026-02-08T10:30:00Z",
  "tools": {
    "calculator": {
      "display_name": "计算器",
      "description": "执行基本数学计算",
      "icon": "🔢",
      "color": "#3B82F6",
      "params": {
        "format": "table",
        "fields": [
          {
            "name": "expression",
            "label": "表达式",
            "type": "code",
            "language": "python"
          }
        ]
      },
      "result": {
        "format": "code",
        "language": "python"
      }
    },
    "web_search": {
      "display_name": "网页搜索",
      "description": "搜索互联网内容",
      "icon": "🔍",
      "color": "#10B981",
      "params": {
        "format": "table",
        "fields": [...]
      },
      "result": {
        "format": "markdown"
      }
    }
  }
}
```

**单个工具配置响应 (带 tool_name 参数)**
```json
{
  "display_name": "计算器",
  "description": "执行基本数学计算",
  "icon": "🔢",
  "color": "#3B82F6",
  "params": {
    "format": "table",
    "fields": [
      {
        "name": "expression",
        "label": "表达式",
        "type": "code",
        "language": "python"
      }
    ]
  },
  "result": {
    "format": "code",
    "language": "python"
  }
}
```

**空配置响应 (200 OK)**
```json
{}
```

**错误响应 (404 Not Found)**
```json
{}
```
**注意**：404 也返回空对象，前端应使用默认配置

**错误响应 (400 Bad Request)**
```json
{
  "error": "invalid_tool_name",
  "message": "工具名称格式无效"
}
```

**错误响应 (500 Internal Server Error)**
```json
{}
```
**注意**：任何服务器错误都返回空对象，确保前端不会崩溃

**响应格式**

**成功响应 (200 OK)**
```json
{
  "display_name": "计算器",
  "description": "执行基本数学计算",
  "icon": "calculator",
  "color": "#3B82F6",
  "params": {
    "format": "table",
    "fields": [
      {
        "name": "expression",
        "label": "表达式",
        "type": "code",
        "language": "python"
      }
    ]
  },
  "result": {
    "format": "code",
    "language": "python"
  }
}
```

**空配置响应 (200 OK)**
```json
{}
```

**错误响应 (404 Not Found)**
```json
{}
```
**注意**：404 也返回空对象，前端应使用默认配置

**错误响应 (500 Internal Server Error)**
```json
{}
```
**注意**：任何服务器错误都返回空对象，确保前端不会崩溃

---

## 数据类型

### ToolDisplayConfig

工具的完整显示配置。

```typescript
interface ToolDisplayConfig {
  // 基本信息
  display_name?: string;           // 显示名称
  description?: string;            // 工具描述
  icon?: string;                   // 图标名称（支持 emoji 或 icon 库）
  color?: string;                  // 主题色（十六进制，如 #3B82F6）

  // 参数显示配置
  params?: ParamsDisplayConfig;    // 参数如何展示

  // 结果显示配置
  result?: ResultDisplayConfig;    // 结果如何展示
}
```

### ParamsDisplayConfig

控制工具调用参数的展示方式。

```typescript
interface ParamsDisplayConfig {
  format: 'table' | 'list' | 'json' | 'hidden';  // 展示格式

  // 当 format = 'table' 或 'list' 时使用
  fields?: ParamFieldConfig[];  // 字段配置列表

  // 当 format = 'json' 时使用
  indent?: number;              // JSON 缩进空格数（默认 2）
}
```

#### ParamFieldConfig

单个参数字段的配置。

```typescript
interface ParamFieldConfig {
  name: string;                 // 字段名（必须匹配参数名）
  label?: string;               // 显示标签（默认使用 name）
  type?: 'text' | 'code' | 'markdown' | 'image';  // 内容类型
  language?: string;            // 代码语言（当 type = 'code' 时）
  truncate?: number;            // 文本截断长度（默认不截断）
}
```

**字段类型说明**：
- `text`: 普通文本（默认）
- `code`: 代码块（需要指定 language）
- `markdown`: Markdown 富文本
- `image`: 图片 URL

### ResultDisplayConfig

控制工具执行结果的展示方式。

```typescript
interface ResultDisplayConfig {
  format: 'text' | 'code' | 'markdown' | 'json' | 'image' | 'hidden';
  language?: string;            // 代码语言（当 format = 'code' 时）
  truncate?: number;            // 文本截断长度（默认不截断）
}
```

**格式说明**：
- `text`: 纯文本，保留换行
- `code`: 代码块，带语法高亮
- `markdown`: Markdown 富文本渲染
- `json`: JSON 格式化显示
- `image`: 图片 URL
- `hidden`: 不显示结果

---

## 使用场景

### 场景 1: 计算器工具

**工具名**: `calculator`

**配置示例**:
```json
{
  "display_name": "计算器",
  "description": "执行数学计算",
  "icon": "🔢",
  "color": "#3B82F6",
  "params": {
    "format": "table",
    "fields": [
      {
        "name": "expression",
        "label": "表达式",
        "type": "code",
        "language": "python"
      }
    ]
  },
  "result": {
    "format": "code",
    "language": "python"
  }
}
```

**展示效果**:
```
🔢 计算器 - 执行数学计算

参数:
┌─────────────┬──────────┐
│ 表达式      │          │
├─────────────┼──────────┤
│ expression  │ 2 + 2    │
└─────────────┴──────────┘

结果:
```python
4
```
```

### 场景 2: 网页搜索工具

**工具名**: `web_search`

**配置示例**:
```json
{
  "display_name": "网页搜索",
  "description": "搜索互联网内容",
  "icon": "🔍",
  "color": "#10B981",
  "params": {
    "format": "table",
    "fields": [
      {
        "name": "query",
        "label": "搜索关键词"
      },
      {
        "name": "num_results",
        "label": "结果数量",
        "truncate": 10
      }
    ]
  },
  "result": {
    "format": "markdown"
  }
}
```

### 场景 3: 文件浏览器工具

**工具名**: `file_browser`

**配置示例**:
```json
{
  "display_name": "文件浏览器",
  "description": "浏览和读取文件",
  "icon": "📁",
  "color": "#F59E0B",
  "params": {
    "format": "list",
    "fields": [
      {
        "name": "action",
        "label": "操作"
      },
      {
        "name": "path",
        "label": "文件路径",
        "type": "code",
        "language": "bash"
      }
    ]
  },
  "result": {
    "format": "markdown"
  }
}
```

### 场景 4: 图片生成工具

**工具名**: `image_generator`

**配置示例**:
```json
{
  "display_name": "图片生成",
  "description": "根据文本生成图片",
  "icon": "🎨",
  "color": "#8B5CF6",
  "params": {
    "format": "table",
    "fields": [
      {
        "name": "prompt",
        "label": "提示词",
        "truncate": 100
      },
      {
        "name": "size",
        "label": "尺寸"
      }
    ]
  },
  "result": {
    "format": "image"
  }
}
```

---

## 错误处理

### 前端处理原则

1. **网络错误**: 返回空配置 `{}`，使用默认配置
2. **404 错误**: 返回空配置 `{}`，使用默认配置
3. **超时**: 返回空配置 `{}`，使用默认配置
4. **解析错误**: 返回空配置 `{}`，使用默认配置
5. **任何异常**: 都不应该影响消息渲染

### 默认配置策略

当 API 不可用时，前端使用以下默认配置：

```typescript
const defaultConfig: ToolDisplayConfig = {
  display_name: toolName,  // 使用工具名作为显示名
  description: `${toolName} 工具调用`,
  params: {
    format: 'json',
    indent: 2
  },
  result: {
    format: 'text'
  }
}
```

---

## 示例代码

### TypeScript 使用示例

```typescript
// 工具名称白名单验证（安全措施）
const TOOL_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

function isValidToolName(name: string): boolean {
  return TOOL_NAME_REGEX.test(name) && name.length > 0 && name.length <= 100;
}

// 获取单个工具配置
async function getToolConfig(toolName: string): Promise<ToolDisplayConfig | null> {
  // 验证工具名称
  if (!isValidToolName(toolName)) {
    console.error(`Invalid tool name: ${toolName}`);
    return null; // 使用默认配置
  }

  // URL 编码工具名称
  const encodedName = encodeURIComponent(toolName);

  try {
    const response = await fetch(`/api/tools/config?tool_name=${encodedName}`);

    // 404 或任何错误都返回空配置
    if (!response.ok) {
      return null;
    }

    const config = await response.json();

    // 空配置也返回 null
    if (Object.keys(config).length === 0) {
      return null;
    }

    return config;
  } catch (error) {
    console.error('Failed to fetch tool config:', error);
    return null;
  }
}

// 获取所有工具配置
async function getAllToolConfigs(): Promise<Record<string, ToolDisplayConfig>> {
  try {
    const response = await fetch('/api/tools/config');

    if (!response.ok) {
      return {};
    }

    const data = await response.json();

    // 返回工具配置映射
    return data.tools || {};
  } catch (error) {
    console.error('Failed to fetch tool configs:', error);
    return {};
  }
}

// 渲染工具调用
function renderToolCall(toolCall: ToolCallBlock) {
  const config = getToolConfig(toolCall.toolName);

  // 使用配置或默认值
  const displayName = config?.display_name || toolCall.toolName;
  const icon = config?.icon || '🔧';

  return (
    <div className="tool-call">
      <div className="tool-header">
        <span className="icon">{icon}</span>
        <span className="name">{displayName}</span>
      </div>

      {renderParams(toolCall.parameters, config?.params)}

      {renderResult(toolCall.result, config?.result)}
    </div>
  );
}

// 默认配置
function getDefaultConfig(toolName: string): ToolDisplayConfig {
  return {
    display_name: toolName,
    description: `${toolName} 工具调用`,
    icon: '🔧',
    params: {
      format: 'json',
      indent: 2
    },
    result: {
      format: 'text'
    }
  };
}
```

---

## 注意事项

### 1. 安全性

**工具名称验证**：
- 前端必须验证工具名称格式：只允许字母、数字、下划线、连字符
- 工具名称长度限制：1-100 字符
- 使用正则表达式：`/^[a-zA-Z0-9_-]+$/`
- URL 编码工具名称（`encodeURIComponent`）

**防护措施**：
- 不使用路径参数，避免路径遍历攻击
- 不在配置中暴露敏感信息
- 参数值应该进行适当的转义和截断
- 后端也应验证工具名称格式

### 2. 性能优化

- 前端应该缓存配置（内存 + LocalStorage）
- 内存缓存: 5 分钟
- LocalStorage 缓存: 1 小时
- 批量获取所有配置，减少 API 调用

### 3. 扩展性

- 新增工具时，只需在后端添加配置
- 前端自动使用默认配置，无需修改代码
- 支持运行时配置更新（通过 storage 事件监听）

### 4. 容错性

- 所有配置项都是可选的
- 前端必须为每个配置提供默认值
- 任何异常都不应该导致页面崩溃
- API 不可用时自动降级到默认配置

---

*最后更新: 2026-02-08*
