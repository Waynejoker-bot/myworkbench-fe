# 工具配置显示功能设计

## 需求背景

当前消息组件中存在 `TOOL_CALL` 类型的 ContentBlock，但显示功能不够完善。需要增强工具调用的展示能力，包括：

1. 支持工具执行状态（pending/running/success/error）
2. 默认折叠状态，用户可展开查看详情
3. JSON 格式展示参数和结果
4. 完善的错误处理和兜底机制
5. 任何异常都不影响消息渲染

## 设计方案

### 1. 类型定义系统

创建统一的类型定义，确保类型安全：

```typescript
// src/types/toolConfig.ts
- ToolExecutionStatus: 工具执行状态枚举
- ToolCallConfig: 工具调用配置接口
- ToolDisplayConfig: 显示配置接口
- ToolResult: 工具执行结果接口
```

### 2. 配置系统

提供默认配置和配置管理：

```typescript
// src/constants/defaultToolConfig.ts
- DEFAULT_TOOL_CONFIG: 默认工具配置
  - 默认折叠状态
  - JSON 格式化选项
  - 错误显示选项
```

### 3. API 层

参考 `src/api/chat.ts` 的调用模式，提供配置获取 API：

```typescript
// src/api/config.ts
- fetchToolConfig(): 获取工具配置
- updateToolConfig(): 更新工具配置
```

### 4. 服务层

封装配置管理逻辑：

```typescript
// src/services/toolConfigService.ts
- ToolConfigService 类
  - 配置缓存管理
  - 配置更新通知
  - 默认值兜底
```

### 5. React Hook

提供便捷的状态管理：

```typescript
// src/hooks/useToolConfig.ts
- useToolConfig(): 工具配置 Hook
  - 自动加载配置
  - 响应式更新
  - 错误处理
```

### 6. UI 组件增强

更新 `MessageBubble.tsx` 中的工具调用渲染逻辑：

- 添加折叠/展开功能
- JSON 格式化展示
- 状态图标和颜色
- 错误信息展示
- Try-catch 保护

## 关键特性

### 1. 状态显示

- **pending**: 灰色背景，等待图标
- **running**: 蓝色背景，旋转加载动画
- **success**: 绿色背景，成功图标
- **error**: 红色背景，错误图标和信息

### 2. 折叠/展开

- 默认折叠，显示工具名称和状态
- 点击展开，显示完整参数和结果
- 支持配置默认展开状态

### 3. JSON 展示

- 参数：格式化的 JSON，语法高亮
- 结果：格式化的 JSON，支持大对象截断
- 错误：清晰的错误信息展示

### 4. 容错机制

- 所有渲染逻辑用 try-catch 包裹
- 配置加载失败时使用默认配置
- 无效数据时显示友好提示
- 任何异常都不影响整体消息渲染

## 技术要点

1. **类型安全**: 使用 TypeScript 严格类型检查
2. **性能优化**: 配置缓存，避免重复请求
3. **错误处理**: 多层兜底机制
4. **可扩展性**: 易于添加新的工具类型和显示选项
5. **用户体验**: 流畅的展开/收起动画，清晰的状态指示

## 依赖关系

- 现有 `content-block.ts` 类型定义
- 现有 `message-station.ts` 消息类型
- React 和 Lucide 图标库
- DOMPurify 用于安全处理（如需要）
