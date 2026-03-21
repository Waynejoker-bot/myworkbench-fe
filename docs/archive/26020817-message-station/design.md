# 设计文档: Message Station 工具执行状态跟踪

## 需求描述

实现 Message Station 工具执行状态的完整跟踪系统，包括：

1. **类型安全** - 完整的 TypeScript 类型定义
2. **错误处理** - 完善的错误处理机制
3. **状态管理** - 工具执行状态的 pending/running/success/error 跟踪
4. **消息排序** - 确保消息按正确的时间顺序渲染（早的在前，新的在后）
5. **React 集成** - 提供 React Hook 用于组件集成
6. **API 交互** - 与后端 API 的完整交互
7. **文档完善** - 完整的 API 文档和使用指南

---

## 设计方案

### 1. 工具执行状态类型系统

创建 `ToolExecutionState` 接口，包含：

- **基础属性**: callId, toolName, status, parameters
- **结果属性**: result, error
- **时间属性**: startTime, endTime, duration
- **计算属性**: isCompleted, isRunning, isFailed

**状态枚举**: `pending | running | success | error`

### 2. 消息解析器

从 Message Station 消息内容中解析工具调用和输出：

- **parseToolCalls()** - 解析 `<tool_call><invoke>` 标记
- **parseToolOutputs()** - 解析 `<tool_output><result>` 标记
- **extractToolCallsToBlocks()** - 转换为 ToolCallBlock 内容块

### 3. 工具执行管理器

`ToolExecutionManager` 类提供：

- **registerToolCall()** - 注册工具调用
- **updateToolState()** - 更新工具状态
- **startToolExecution()** - 开始执行
- **completeToolExecution()** - 完成执行
- **failToolExecution()** - 标记失败

### 4. 消息排序工具

确保消息按时间升序排序：

- **sortMessagesByTime()** - 升序排序（旧消息在前）
- **ensureMessagesSorted()** - 智能排序（仅在未排序时）
- **insertMessageSorted()** - 插入新消息保持排序

### 5. React Hook

**useToolExecution()** - 提供工具状态管理

- 注册、更新、查询工具状态
- 自动触发组件重新渲染
- 支持从消息内容解析工具调用

**useSingleToolExecution()** - 单个工具调用跟踪

**useToolCallsFromContent()** - 自动解析消息中的工具调用

### 6. API 调用层

与后端 API 交互的函数：

- **getToolExecutionStatus()** - 获取工具状态
- **updateToolExecutionStatus()** - 更新工具状态
- **batchGetToolExecutionStatus()** - 批量获取
- **pollToolExecutionStatus()** - 轮询直到完成

### 7. 配置常量

集中管理配置：

- 工具执行默认配置（超时、重试等）
- UI 显示配置（颜色、图标、文本）
- API 端点配置
- 错误消息映射

### 8. 消息渲染修复

更新 ChatMessages 组件：

- 使用 `sortMessagesByTime()` 确保消息正确排序
- 支持工具调用内容块的渲染
- 保持向后兼容性

---

## 文件结构

```
src/
├── workbench/
│   ├── types/
│   │   ├── content-block.ts        # 已存在，ToolCallBlock 类型
│   │   ├── message-station.ts      # 已存在
│   │   └── index.ts                # 更新导出
│   └── utils/
│       ├── tool-execution.ts       # 新建 - 工具执行状态管理
│       ├── message-parser.ts       # 新建 - 消息解析
│       ├── message-ordering.ts     # 新建 - 消息排序
│       ├── tool-tracking-api.ts    # 新建 - API 调用
│       └── constants.ts            # 新建 - 配置常量
├── hooks/
│   └── useToolExecution.ts         # 新建 - React Hook
└── components/
    └── chat/
        └── ChatMessages.tsx        # 更新 - 添加消息排序
docs/
└── api/
    └── message-station-tool-tracking.md  # 新建 - API 文档
```

---

## 关键设计决策

### 1. 类型安全优先

所有函数都有完整的 TypeScript 类型注解，确保编译时类型检查。

### 2. 错误处理

- API 调用使用自定义 `ToolTrackingApiError`
- 所有异常都不会影响消息渲染
- 提供友好的错误消息

### 3. 性能优化

- 使用 Map 数据结构快速查找
- 提供批量 API 减少请求次数
- 智能排序避免不必要的重新排序

### 4. React 集成

- Hook 自动管理组件重新渲染
- 支持函数式更新避免闭包问题
- 提供多个 Hook 适应不同场景

### 5. 向后兼容

- 保留旧的 API 接口
- ChatMessages 组件支持 legacy 和新 API
- 渐进式增强

---

## 实现步骤

1. ✅ 创建工具执行状态类型定义 (`tool-execution.ts`)
2. ✅ 更新 ToolCallBlock 类型（已存在于 `content-block.ts`）
3. ✅ 创建默认配置常量 (`constants.ts`)
4. ✅ 创建 API 调用函数 (`tool-tracking-api.ts`)
5. ✅ 创建 React Hook (`useToolExecution.ts`)
6. ✅ 修复消息渲染顺序 (`message-ordering.ts` + `ChatMessages.tsx`)
7. ✅ 更新工具解析逻辑 (`message-parser.ts`)
8. ✅ 创建 API 文档 (`message-station-tool-tracking.md`)

---

## 测试要点

- 消息排序是否正确（时间升序）
- 工具状态转换是否正常（pending → running → success/error）
- API 调用失败是否影响消息渲染
- React Hook 是否正确触发重新渲染
- 批量操作性能是否良好

---

## 参考资料

- [Message Station 协议](../../../message-station/docs/PROTOCOL.md)
- [Message Station 架构](../../../message-station/docs/ARCHITECTURE.md)
- [内容块设计](../architecture/message-content-design.md)
