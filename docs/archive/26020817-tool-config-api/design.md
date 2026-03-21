# 工具配置 API 系统设计

## 背景

当前前端在渲染工具调用消息时，缺乏针对不同工具的定制化展示配置。每个工具（如 calculator、web_search、file_browser 等）都有独特的参数结构和返回结果格式，需要不同的展示方式。

## 目标

设计并实现一个完整的工具配置 API 系统，包括：

1. **类型定义**：定义工具配置的 TypeScript 接口
2. **API 文档**：描述后端接口格式（供后端开发参考）
3. **API 调用**：封装获取配置的 HTTP 请求
4. **配置服务**：实现带缓存和兜底机制的服务层
5. **React Hook**：提供便捷的 React 集成方式
6. **消息组件集成**：在 MessageBubble 中使用配置渲染工具卡片

## 核心设计

### 1. 配置接口结构

```typescript
interface ToolDisplayConfig {
  toolName: string;
  displayName: string;
  description?: string;
  icon?: string;
  category?: string;
  paramsDisplay: ParamsDisplayConfig;
  resultDisplay: ResultDisplayConfig;
  defaultCollapsed?: boolean;
  template?: 'card' | 'list' | 'table' | 'json';
}

interface ParamsDisplayConfig {
  format: 'json' | 'list' | 'table' | 'custom';
  hideParams?: string[];
  showParams?: string[];
  paramLabels?: Record<string, string>;
  paramOrder?: string[];
}

interface ResultDisplayConfig {
  format: 'json' | 'markdown' | 'html' | 'custom';
  truncate?: number;
  renderer?: string;
}
```

### 2. 缓存策略

- **内存缓存**：5分钟有效期，避免频繁请求
- **LocalStorage 缓存**：1小时有效期，刷新页面也能快速加载
- **兜底机制**：API 失败时返回空配置，组件使用默认渲染方式

### 3. API 端点

```
GET /api/tool/config?tool_name={toolName}
```

响应格式：

```json
{
  "status": "success",
  "data": {
    "toolName": "calculator",
    "displayName": "计算器",
    "paramsDisplay": {...},
    "resultDisplay": {...}
  }
}
```

错误处理：

- 404（工具无配置）：返回空配置对象 `{}`
- 网络错误：返回空配置对象 `{}`
- 超时：返回空配置对象 `{}`

### 4. 工具执行状态

工具调用有四种状态：

- `pending`：等待执行
- `running`：正在执行
- `success`：执行成功
- `error`：执行失败

不同状态需要不同的视觉反馈。

### 5. 默认配置

为常见工具提供默认配置：

- `calculator`：数学计算工具
- `web_search`：网络搜索
- `file_browser`：文件浏览
- `code_executor`：代码执行

## 技术实现

### 文件结构

```
src/
├── types/
│   └── toolConfig.ts           # TypeScript 类型定义
├── constants/
│   └── defaultToolConfig.ts    # 默认配置常量
├── api/
│   └── config.ts               # API 调用函数
├── services/
│   └── toolConfigService.ts    # 配置服务（缓存+兜底）
├── hooks/
│   └── useToolConfig.ts        # React Hook
└── components/
    └── chat/
        └── message/
            └── MessageBubble.tsx  # 集成工具配置

docs/
└── api/
    └── tool-config.md          # API 文档
```

### 依赖关系

```
MessageBubble
    └── useToolConfig (Hook)
            └── ToolConfigService
                    ├── fetchToolConfig (API)
                    └── defaultToolConfig (兜底)
```

## 兼容性考虑

- 向后兼容：如果没有配置，使用现有的默认渲染方式
- 渐进增强：有配置时使用定制化展示，无配置时降级到通用展示
- 性能优化：缓存机制减少 API 调用

## 未来扩展

- 支持工具配置的热更新
- 支持用户自定义工具配置
- 支持多语言配置
- 支持工具使用统计和分析
