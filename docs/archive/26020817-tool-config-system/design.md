# 工具配置 API 系统设计文档

## 需求概述

为 ChatBox 工作台添加工具配置管理功能，支持：
1. 获取 Agent 的可用工具列表
2. 获取/设置/删除工具配置
3. 工具执行状态的完整生命周期管理（pending → running → success/error）
4. 修复消息渲染顺序问题

## 问题分析

### 问题 1：工具执行中间状态
当前 `ToolCallBlock` 的 status 字段只有 `'success'` 状态，但工具调用有一个完整的生命周期：

```
pending  → running → success
                 → error
```

每个状态需要对应的 UI 展示：
- **pending**: Agent 决定调用工具，等待执行
- **running**: 工具正在执行中（需要 loading 动画）
- **success**: 执行成功
- **error**: 执行失败

### 问题 2：消息渲染顺序问题
后端接口返回的消息是逆序的（最新的在前面），但前端应该：
1. 在用户消息下面 append 新的回复
2. 正确处理消息的时间排序

## 解决方案

### 1. 工具执行状态设计

#### 状态扩展
修改 `ToolCallBlock` 类型定义，支持完整的生命周期状态：

```typescript
export interface ToolCallBlock extends ContentBlock {
  type: ContentType.TOOL_CALL;
  toolName: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'running' | 'success' | 'error'; // 扩展状态
  result?: unknown;
  error?: string;
  startTime?: number;  // 新增：开始时间
  endTime?: number;    // 新增：结束时间
  executionTime?: number; // 新增：执行时长（毫秒）
}
```

#### Payload 格式定义
后端发送的工具调用 payload 应包含状态信息：

```json
{
  "type": "tool",
  "data": [
    {
      "itemType": "tool",
      "toolItem": {
        "name": "web_search",
        "arguments": { "query": "..." },
        "status": "running",  // pending | running | success | error
        "result": null,
        "error": null
      }
    }
  ]
}
```

#### UI 展示设计
1. **pending**: 显示为灰色卡片，文字 "准备调用工具..."
2. **running**: 显示为蓝色卡片 + loading 动画，文字 "正在执行..."
3. **success**: 显示为绿色卡片，显示结果摘要
4. **error**: 显示为红色卡片，显示错误信息

### 2. 消息渲染顺序修复

#### 排序逻辑
在 `message-aggregator.ts` 中确保消息按时间正确排序：

```typescript
// Sort by start time (ascending)
return result.sort((a, b) => a.startTime - b.startTime);
```

#### 初始加载处理
在 `useChatMessages.ts` 中，从 API 加载历史消息时：
- 后端返回逆序
- 前端排序时反转，确保最老的消息在上面

#### 新消息追加
SSE 推送新消息时：
- 直接 append 到列表末尾
- 因为新消息的时间戳总是最大的

### 3. 工具配置 API 系统

#### API 端点定义
```typescript
// 获取 Agent 可用工具列表
GET /api/agents/:agentId/tools
Response: { tools: ToolInfo[] }

// 获取工具配置
GET /api/agents/:agentId/tools/:toolName/config
Response: { config: ToolConfig }

// 设置工具配置
PUT /api/agents/:agentId/tools/:toolName/config
Body: { config: ToolConfig }
Response: { success: boolean }

// 删除工具配置
DELETE /api/agents/:agentId/tools/:toolName/config
Response: { success: boolean }
```

#### 类型定义
```typescript
// 工具基本信息
interface ToolInfo {
  name: string;
  description: string;
  category: string;
  configurable: boolean;
  config?: ToolConfig;
}

// 工具配置结构
interface ToolConfig {
  enabled: boolean;
  settings: Record<string, unknown>;
}
```

#### React Hook
```typescript
const {
  tools,           // 工具列表
  getToolConfig,   // 获取配置
  setToolConfig,   // 设置配置
  deleteToolConfig // 删除配置
} = useToolConfig(agentId);
```

## 实现步骤

1. 创建 TypeScript 类型定义（`tool-config.ts`）
2. 创建默认配置常量（`default-tool-config.ts`）
3. 创建 API 调用函数（`tool-config.ts` in `src/api/`）
4. 创建 React Hook（`useToolConfig.ts`）
5. 更新 `content-block.ts` 中的 `ToolCallBlock` 定义
6. 更新 `message-converters.ts` 中的工具解析逻辑
7. 修复 `message-aggregator.ts` 中的排序逻辑
8. 创建工具配置 UI 组件（可选）

## 文件结构

```
src/
├── types/
│   └── tool-config.ts              # 工具配置类型定义
├── api/
│   └── tool-config.ts              # 工具配置 API 调用
├── hooks/
│   └── useToolConfig.ts            # 工具配置 Hook
├── constants/
│   └── default-tool-config.ts      # 默认配置
└── workbench/
    ├── types/
    │   ├── content-block.ts        # 更新 ToolCallBlock
    │   └── tool-execution.ts       # 工具执行状态类型
    └── utils/
        ├── message-aggregator.ts   # 修复排序逻辑
        └── message-converters.ts   # 更新工具解析
```

## 后续集成

- 在 Agent 详情页面添加工具配置面板
- 在 ChatBox 中显示工具执行状态
- 实时更新工具执行状态（通过 SSE）

## 设计原则

1. **向后兼容**: 不影响现有消息系统
2. **渐进增强**: 先实现基本功能，后续添加高级特性
3. **类型安全**: 完整的 TypeScript 类型定义
4. **用户体验**: 清晰的状态展示和错误处理
