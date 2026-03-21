# 工具配置系统指南

## 概述

工具配置系统提供了完整的工具调用配置管理功能，包括类型定义、API 集成、React Hook 和 UI 组件。

## 功能特性

- 完整的 TypeScript 类型系统
- 配置管理和缓存
- React Hook 集成
- 可折叠 UI 组件
- 完善的错误处理
- 支持工具注册表

## 类型定义

### 工具执行状态

```typescript
enum ToolExecutionStatus {
  PENDING = 'pending',     // 待执行
  RUNNING = 'running',     // 执行中
  SUCCESS = 'success',     // 成功
  ERROR = 'error',         // 错误
}
```

### 显示配置

```typescript
interface ToolDisplayConfig {
  defaultCollapsed: boolean;       // 默认折叠
  showExecutionTime: boolean;      // 显示执行时间
  showErrorMessage: boolean;       // 显示错误信息
  maxJsonLength: number;           // JSON 最大长度
}
```

### 工具调用配置

```typescript
interface ToolCallConfig {
  display: ToolDisplayConfig;
  tools: Record<string, ToolMetadata>;
}
```

## 核心 API

### fetchToolConfig()

获取工具配置，带自动降级到默认配置。

```typescript
const config = await fetchToolConfig();
```

### updateToolConfig()

更新工具配置。

```typescript
await updateToolConfig({ display: { defaultCollapsed: true } });
```

### loadToolConfig()

带缓存的配置加载（默认 5 分钟缓存）。

```typescript
const config = await loadToolConfig();
```

## React Hook

### useToolConfig()

主 Hook，提供完整的配置管理。

```typescript
function MyComponent() {
  const { config, loading, error, updateConfig } = useToolConfig();

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return (
    <div>
      <button onClick={() => updateConfig({ defaultCollapsed: false })}>
        展开工具调用
      </button>
    </div>
  );
}
```

### useToolDisplayConfig()

简化 Hook，仅返回显示配置。

```typescript
function MyComponent() {
  const { displayConfig } = useToolDisplayConfig();
  return <div>{displayConfig.defaultCollapsed ? '折叠' : '展开'}</div>;
}
```

## UI 组件

### ToolCallBlock

可折叠的工具调用组件。

```tsx
import { SafeToolCallBlock } from '@/components/chat/message/ToolCallBlock';

<SafeToolCallBlock
  block={toolCallBlock}
  isUserMessage={false}
/>
```

**特性：**
- 默认折叠，点击展开/收起
- JSON 格式化展示（参数和结果）
- 状态指示器（pending/running/success/error）
- 错误信息展示
- 复制 JSON 功能
- 完善的错误处理和兜底机制

## 工具注册表

内置工具元数据包括：

- 文件操作（读取、写入、列表）
- 代码执行
- 搜索（文件、网络）
- API 调用
- 数据库操作
- AI 功能

```typescript
const metadata = getToolMetadata('file.read');
// {
//   name: 'file.read',
//   displayName: '读取文件',
//   description: '读取文件内容',
//   category: 'file',
//   icon: '📄',
// }
```

## 默认配置

```typescript
const DEFAULT_DISPLAY_CONFIG: ToolDisplayConfig = {
  defaultCollapsed: true,        // 默认折叠
  showExecutionTime: true,       // 显示执行时间
  showErrorMessage: true,        // 显示错误信息
  maxJsonLength: 1000,           // JSON 最大长度
};
```

## 文件结构

```
src/
├── types/
│   └── toolConfig.ts                    # 类型定义
├── constants/
│   └── defaultToolConfig.ts             # 默认配置和工具注册表
├── api/
│   └── config.ts                        # API 调用函数
├── services/
│   └── toolConfigService.ts             # 配置服务
├── hooks/
│   └── useToolConfig.ts                 # React Hook
└── components/
    └── chat/
        └── message/
            ├── ToolCallBlock.tsx        # 工具调用组件
            └── MessageBubble.tsx        # 消息气泡（已集成）
```

## 错误处理

### API 层

所有 API 调用都有 try-catch 保护，配置加载失败时自动降级到默认配置。

### 组件层

组件渲染异常时显示友好降级 UI，任何错误都不影响整体消息渲染。

```tsx
<SafeToolCallBlock>  // 带错误边界
  <ToolCallBlockComponent />
</SafeToolCallBlock>
```

## 性能优化

- LocalStorage 缓存配置（默认 5 分钟）
- 配置服务单例模式
- React Hook 提供非响应式访问选项
- JSON 展示支持截断，避免大对象渲染问题

## 使用示例

### 基础使用

```typescript
import { useToolConfig } from '@/hooks/useToolConfig';

function MyComponent() {
  const { displayConfig } = useToolConfig();
  return <div>{displayConfig.defaultCollapsed ? '折叠' : '展开'}</div>;
}
```

### 工具调用渲染

```typescript
import { SafeToolCallBlock } from '@/components/chat/message/ToolCallBlock';

<SafeToolCallBlock
  block={toolCallBlock}
  isUserMessage={false}
/>
```

### 配置更新

```typescript
const { updateConfig } = useToolConfig();

await updateConfig({
  display: {
    defaultCollapsed: false,
    showExecutionTime: true,
  },
});
```

## 相关文档

- [工具配置 API 文档](/opt/claude/myworkbench-fe/docs/api/tool-config.md)
- [工作区 26020817 - 完整实现文档](/opt/claude/myworkbench-fe/docs/workspace/26020817-tool-config-display/)

## 后续优化建议

1. **性能优化**
   - 考虑虚拟化大型工具调用列表
   - 实现懒加载 JSON 展开内容

2. **功能增强**
   - 添加工具执行历史查看
   - 支持工具调用重试
   - 添加工具调用搜索/过滤

3. **国际化**
   - 支持多语言状态标签
   - 可配置的工具名称和描述

4. **可访问性**
   - 添加键盘导航支持
   - 改进屏幕阅读器支持

---
*创建时间: 2026-02-08*
