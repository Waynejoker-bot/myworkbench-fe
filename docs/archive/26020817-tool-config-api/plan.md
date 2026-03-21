# 执行计划: 工具配置 API 系统实现

## 进度总览

| 步骤 | 描述 | 状态 |
|------|------|------|
| 1 | 创建 API 文档 | 🕐 pending |
| 2 | 创建 TypeScript 类型定义 | 🕐 pending |
| 3 | 创建默认配置常量 | 🕐 pending |
| 4 | 实现 API 调用函数 | 🕐 pending |
| 5 | 实现配置服务（带缓存和兜底） | 🕐 pending |
| 6 | 创建 React Hook | 🕐 pending |
| 7 | 集成到消息组件 | 🕐 pending |
| 8 | 更新导出 | 🕐 pending |

---

## 步骤 1: 创建 API 文档

**描述**: 在 `docs/api/tool-config.md` 中创建完整的 API 文档，描述后端接口格式、请求/响应格式、错误处理说明和配置示例。这份文档供后端开发参考。

**依赖文档**:
- 无

**产出**: `/opt/claude/myworkbench-fe/docs/api/tool-config.md`

---

## 步骤 2: 创建 TypeScript 类型定义

**描述**: 在 `src/types/toolConfig.ts` 中定义所有工具配置相关的 TypeScript 接口和类型，包括 ToolDisplayConfig、ParamsDisplayConfig、ResultDisplayConfig、API 响应类型和工具执行状态类型。

**依赖文档**:
- `src/workbench/types/content-block.ts` - 参考 ContentType 和 ToolCallBlock 的定义

**产出**: `/opt/claude/myworkbench-fe/src/types/toolConfig.ts`

---

## 步骤 3: 创建默认配置常量

**描述**: 在 `src/constants/defaultToolConfig.ts` 中创建通用默认配置和常见工具（calculator、web_search、file_browser、code_executor 等）的默认配置。

**依赖文档**:
- `src/types/toolConfig.ts` - 使用 ToolDisplayConfig 类型

**产出**: `/opt/claude/myworkbench-fe/src/constants/defaultToolConfig.ts`

---

## 步骤 4: 实现 API 调用函数

**描述**: 在 `src/api/config.ts` 中实现 `fetchToolConfig()` 函数，参考现有的 `src/api/chat.ts` 的调用模式，实现完善的错误处理（404、超时、网络错误都返回空配置）。

**依赖文档**:
- `src/api/chat.ts` - 参考 sendMessage 和 startPolling 的实现模式
- `src/types/toolConfig.ts` - 使用 API 响应类型

**产出**: `/opt/claude/myworkbench-fe/src/api/config.ts`

---

## 步骤 5: 实现配置服务（带缓存和兜底）

**描述**: 在 `src/services/toolConfigService.ts` 中实现 ToolConfigService 类，包括内存缓存（5分钟）、LocalStorage 缓存（1小时）、getToolConfig() 方法（永远不返回 undefined）和完善的兜底机制。

**依赖文档**:
- `src/api/config.ts` - 调用 fetchToolConfig
- `src/constants/defaultToolConfig.ts` - 使用默认配置作为兜底

**产出**: `/opt/claude/myworkbench-fe/src/services/toolConfigService.ts`

---

## 步骤 6: 创建 React Hook

**描述**: 在 `src/hooks/useToolConfig.ts` 中创建 useToolConfig hook，自动加载配置并返回 getToolConfig 方法，方便在 React 组件中使用。

**依赖文档**:
- `src/services/toolConfigService.ts` - 使用 ToolConfigService

**产出**: `/opt/claude/myworkbench-fe/src/hooks/useToolConfig.ts`

---

## 步骤 7: 集成到消息组件

**描述**: 更新 `src/components/chat/message/MessageBubble.tsx`，使用工具配置来渲染工具调用卡片，支持不同工具的定制化展示、工具执行状态（pending/running/success/error）、默认折叠状态和 JSON 格式展示参数/结果。

**依赖文档**:
- `src/hooks/useToolConfig.ts` - 使用 useToolConfig hook
- `src/workbench/types/content-block.ts` - 处理 ToolCallBlock 类型

**产出**: 更新后的 `/opt/claude/myworkbench-fe/src/components/chat/message/MessageBubble.tsx`

---

## 步骤 8: 更新导出

**描述**: 确保所有新创建的模块都在合适的地方导出，便于其他模块使用。包括类型、常量、API、服务和 Hook 的导出。

**依赖文档**:
- 所有之前创建的文件

**产出**: 更新后的导出文件（如需要）

---

## 执行记录

### 2026-02-08 17:00
- 创建工作区和设计方案
- 制定执行计划

---
*创建时间: 2026-02-08 17:00*
