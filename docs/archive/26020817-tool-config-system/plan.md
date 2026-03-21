# 执行计划: 工具配置 API 系统实现

## 进度总览

| 步骤 | 描述 | 状态 |
|------|------|------|
| 1 | 创建工具配置和执行状态类型定义 | 🕐 pending |
| 2 | 更新 ContentBlock 类型（ToolCallBlock） | 🕐 pending |
| 3 | 创建默认配置常量 | 🕐 pending |
| 4 | 创建 API 调用函数 | 🕐 pending |
| 5 | 创建 React Hook | 🕐 pending |
| 6 | 修复消息渲染顺序问题 | 🕐 pending |
| 7 | 更新工具解析逻辑 | 🕐 pending |
| 8 | 创建 API 文档 | 🕐 pending |

---

## 步骤 1: 创建工具配置和执行状态类型定义

**描述**: 在 `src/workbench/types/tool-execution.ts` 中创建工具执行相关的类型定义，包括：
- 工具执行状态枚举
- 工具执行进度信息
- 工具执行结果

**依赖文档**:
- `design.md` - 设计文档中的工具执行状态设计

**产出**:
- `src/workbench/types/tool-execution.ts` 文件

---

## 步骤 2: 更新 ContentBlock 类型（ToolCallBlock）

**描述**: 更新 `src/workbench/types/content-block.ts` 中的 `ToolCallBlock` 接口，添加：
- 完整的状态支持（pending, running, success, error）
- 时间戳字段（startTime, endTime）
- 执行时长字段

**依赖文档**:
- `src/workbench/types/content-block.ts` - 现有的 ToolCallBlock 定义
- `src/workbench/types/tool-execution.ts` - 新的状态枚举

**产出**:
- 更新的 `ToolCallBlock` 接口

---

## 步骤 3: 创建默认配置常量

**描述**: 在 `src/constants/default-tool-config.ts` 中创建默认的工具配置常量

**依赖文档**:
- `design.md` - 设计文档中的工具配置结构

**产出**:
- `src/constants/default-tool-config.ts` 文件

---

## 步骤 4: 创建 API 调用函数

**描述**: 在 `src/api/tool-config.ts` 中创建工具配置相关的 API 调用函数：
- `getAgentTools()` - 获取工具列表
- `getToolConfig()` - 获取工具配置
- `setToolConfig()` - 设置工具配置
- `deleteToolConfig()` - 删除工具配置

**依赖文档**:
- `src/api/chat.ts` - 现有 API 调用模式
- `design.md` - API 端点定义

**产出**:
- `src/api/tool-config.ts` 文件

---

## 步骤 5: 创建 React Hook

**描述**: 在 `src/hooks/useToolConfig.ts` 中创建工具配置管理的 React Hook

**依赖文档**:
- `src/hooks/useAgents.ts` - 现有 Hook 模式
- `src/api/tool-config.ts` - API 调用函数

**产出**:
- `src/hooks/useToolConfig.ts` 文件

---

## 步骤 6: 修复消息渲染顺序问题

**描述**: 修复消息排序逻辑，确保：
1. 历史消息加载时正确排序（从旧到新）
2. 新消息正确追加到用户消息下面
3. 检查并修复 `message-aggregator.ts` 和 `useChatMessages.ts` 中的排序逻辑

**依赖文档**:
- `src/workbench/utils/message-aggregator.ts` - 消息聚合逻辑
- `src/hooks/useChatMessages.ts` - 消息管理 Hook

**产出**:
- 修复后的消息排序逻辑

---

## 步骤 7: 更新工具解析逻辑

**描述**: 更新 `src/workbench/utils/message-converters.ts` 中的 `parsePayloadToBlocks` 函数，支持解析工具执行状态

**依赖文档**:
- `src/workbench/utils/message-converters.ts` - 现有解析逻辑
- `src/workbench/types/tool-execution.ts` - 新的类型定义

**产出**:
- 更新的工具解析逻辑

---

## 步骤 8: 创建 API 文档

**描述**: 在 `docs/api/` 目录下创建工具配置 API 的文档

**依赖文档**:
- `design.md` - 设计文档
- `src/api/tool-config.ts` - API 实现

**产出**:
- `docs/api/tool-config-api.md` 文档

---

## 执行记录

### 2026-02-08 17:00
- 创建工作空间
- 完成设计文档
- 创建执行计划

---
*创建时间: 2026-02-08 17:00*
