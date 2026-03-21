# 执行计划: Message Station 工具执行状态跟踪

## 进度总览

| 步骤 | 描述 | 状态 |
|------|------|------|
| 1 | 创建工具执行状态类型定义 | ✅ completed |
| 2 | 更新 ToolCallBlock 类型 | ✅ completed |
| 3 | 创建默认配置常量 | ✅ completed |
| 4 | 创建 API 调用函数 | ✅ completed |
| 5 | 创建 React Hook | ✅ completed |
| 6 | 修复消息渲染顺序 | ✅ completed |
| 7 | 更新工具解析逻辑 | ✅ completed |
| 8 | 创建 API 文档 | ✅ completed |

---

## 步骤 1: 创建工具执行状态类型定义

**描述**: 创建 `tool-execution.ts` 文件，定义工具执行状态相关的类型和类

**依赖文档**:
- `src/workbench/types/content-block.ts` - ToolCallBlock 类型定义
- `src/workbench/types/message-station.ts` - UIMessage 类型定义

**产出**:
- `src/workbench/utils/tool-execution.ts` - 包含 ToolExecutionState、ToolExecutionManager 等核心类型和类

---

## 步骤 2: 更新 ToolCallBlock 类型

**描述**: 确保 ToolCallBlock 类型支持所有必要的状态字段

**依赖文档**:
- `src/workbench/types/content-block.ts` - 现有的内容块类型定义

**产出**:
- ToolCallBlock 类型已包含 status、result、error 字段（已存在）

---

## 步骤 3: 创建默认配置常量

**描述**: 创建 `constants.ts` 文件，集中管理所有配置常量

**依赖文档**:
- 无（独立文件）

**产出**:
- `src/workbench/utils/constants.ts` - 包含工具执行默认配置、UI 显示配置、API 端点等常量

---

## 步骤 4: 创建 API 调用函数

**描述**: 创建 `tool-tracking-api.ts` 文件，实现与后端 API 的交互

**依赖文档**:
- `src/workbench/utils/tool-execution.ts` - ToolExecutionStatus 类型
- `src/workbench/utils/constants.ts` - API 端点配置

**产出**:
- `src/workbench/utils/tool-tracking-api.ts` - 包含 getToolExecutionStatus、updateToolExecutionStatus 等函数

---

## 步骤 5: 创建 React Hook

**描述**: 创建 `useToolExecution.ts` 文件，提供 React 组件使用的 Hook

**依赖文档**:
- `src/workbench/utils/tool-execution.ts` - ToolExecutionManager 类
- `src/workbench/utils/message-parser.ts` - 消息解析函数

**产出**:
- `src/hooks/useToolExecution.ts` - 包含 useToolExecution、useSingleToolExecution 等 Hook

---

## 步骤 6: 修复消息渲染顺序

**描述**: 创建 `message-ordering.ts` 并更新 ChatMessages 组件，确保消息按正确的时间顺序渲染

**依赖文档**:
- `src/workbench/types/message-station.ts` - UIMessage 类型定义
- `src/components/chat/ChatMessages.tsx` - 消息列表组件

**产出**:
- `src/workbench/utils/message-ordering.ts` - 消息排序工具函数
- `src/components/chat/ChatMessages.tsx` - 更新以使用 sortMessagesByTime()

---

## 步骤 7: 更新工具解析逻辑

**描述**: 创建 `message-parser.ts` 文件，解析 Message Station 消息中的工具调用和输出

**依赖文档**:
- `src/workbench/types/content-block.ts` - ToolCallBlock 类型
- Message Station PROTOCOL.md - 消息格式规范

**产出**:
- `src/workbench/utils/message-parser.ts` - 包含 parseToolCalls、parseToolOutputs 等函数

---

## 步骤 8: 创建 API 文档

**描述**: 创建完整的 API 文档，描述所有函数、类型和使用示例

**依赖文档**:
- 所有创建的工具函数和类型
- Message Station 协议文档

**产出**:
- `docs/api/message-station-tool-tracking.md` - 完整的 API 文档

---

## 执行记录

### 2025-02-08 17:30
- 开始执行所有步骤
- 完成: 创建了所有 8 个步骤所需的文件和实现
- ✅ tool-execution.ts - 工具执行状态管理
- ✅ message-ordering.ts - 消息排序工具
- ✅ message-parser.ts - 消息解析工具
- ✅ constants.ts - 配置常量
- ✅ tool-tracking-api.ts - API 调用函数
- ✅ useToolExecution.ts - React Hook
- ✅ ChatMessages.tsx - 更新消息排序
- ✅ types/index.ts - 更新类型导出
- ✅ API 文档创建完成

### 关键实现点

1. **工具执行状态管理**
   - ToolExecutionManager 类提供完整的 CRUD 操作
   - 支持状态转换：pending → running → success/error
   - 自动管理开始和结束时间
   - 计算属性：isCompleted, isRunning, isFailed, duration

2. **消息排序**
   - sortMessagesByTime() - 确保消息按时间升序排序（旧消息在前）
   - isMessagesSorted() - 检查是否已排序
   - ensureMessagesSorted() - 智能排序避免不必要的操作
   - insertMessageSorted() - 二分查找插入新消息

3. **消息解析**
   - parseToolCalls() - 使用正则表达式解析 `<tool_call><invoke>` 标记
   - parseToolOutputs() - 解析 `<tool_output><result>` 标记
   - extractToolCallsToBlocks() - 转换为 ToolCallBlock 内容块
   - updateToolCallStatusesFromOutput() - 更新工具状态

4. **React Hook**
   - useToolExecution() - 完整的工具状态管理 Hook
   - useSingleToolExecution() - 单个工具调用跟踪
   - useToolCallsFromContent() - 自动解析消息中的工具调用
   - 自动触发组件重新渲染

5. **API 调用**
   - getToolExecutionStatus() - 获取单个工具状态
   - updateToolExecutionStatus() - 更新工具状态
   - batchGetToolExecutionStatus() - 批量获取
   - pollToolExecutionStatus() - 轮询直到完成
   - 完善的错误处理（ToolTrackingApiError）

6. **消息渲染修复**
   - ChatMessages 组件现在使用 sortMessagesByTime()
   - 确保消息按时间升序渲染（旧消息在前，新消息在后）
   - 保持向后兼容性

7. **配置常量**
   - 工具执行默认配置（超时、重试等）
   - UI 显示配置（颜色、图标、标签）
   - API 端点配置
   - 错误消息映射
   - 工具类型定义

8. **API 文档**
   - 完整的 API 端点文档
   - 类型定义说明
   - 使用示例
   - 最佳实践
   - 错误处理指南

---
*创建时间: 2025-02-08 17:30*
*完成时间: 2025-02-08 17:45*
