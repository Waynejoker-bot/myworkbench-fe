# 执行计划: Message Station API 更新

## 进度总览

| 步骤 | 描述 | 状态 |
|------|------|------|
| 1 | 扩展类型定义（message-station.ts 和 storage.ts） | 🕐 pending |
| 2 | 创建 Message Station API 封装模块 | 🕐 pending |
| 3 | 更新 chat.ts 的 SSE 轮询逻辑 | 🕐 pending |
| 4 | 扩展 storage 实现，支持会话时间戳存储 | 🕐 pending |
| 5 | 更新 useChatMessages Hook（核心） | 🕐 pending |
| 6 | 编译验证和基础测试 | 🕐 pending |

---

## 步骤 1: 扩展类型定义

**描述**: 在现有的类型定义文件中新增 Message Station API 更新所需的类型。

**依赖文档**:
- `src/workbench/types/message-station.ts` - 现有的消息类型定义
- `src/workbench/types/storage.ts` - 现有的存储类型定义

**产出**:
- 新增 `SSEConnectedEvent` 接口
- 新增 `MessagesPageResponse` 接口
- 新增 `SessionTimestamps` 接口
- 扩展 `StorageKey` 枚举，添加 `SESSION_TIMESTAMPS`
- 扩展 `WorkbenchStorage` 接口，添加 `sessionTimestamps` 字段

---

## 步骤 2: 创建 Message Station API 封装模块

**描述**: 新建 API 模块文件，封装与 Message Station 服务器的所有交互。

**依赖文档**:
- 步骤 1 中创建的类型定义
- `/opt/claude/message-station/docs/MSAPI.md` - Message Station API 文档

**产出**:
- 新文件 `src/api/message-station.ts`
- 实现 `getMessages()` 函数，调用 `/msapi/messages` 接口
- 实现 `extractLatestUpdateTime()` 工具函数

---

## 步骤 3: 更新 chat.ts 的 SSE 轮询逻辑

**描述**: 修改现有的 chat.ts 文件，支持 poll-message 接口的 last_update_time 参数。

**依赖文档**:
- `src/api/chat.ts` - 现有的 SSE 轮询实现
- 步骤 1 中的类型定义

**产出**:
- 修改 `PollMessage` 接口的 `update_time` 字段类型（string -> number）
- 新增 `SSEConnectedData` 接口
- 新增 `ConnectedCallback` 类型
- 修改 `startPolling()` 函数签名，添加 `lastUpdateTime` 和 `onConnected` 参数
- 更新 SSE URL 构建，包含 `last_update_time` 参数
- 处理 `connected` 事件，调用 `onConnected` 回调

---

## 步骤 4: 扩展 storage 实现，支持会话时间戳存储

**描述**: 扩展现有的 storage 模块，添加会话时间戳的持久化功能。

**依赖文档**:
- `src/workbench/storage/index.ts` - 现有的存储实现
- 步骤 1 中的存储类型扩展

**产出**:
- 在 `defaultStorage` 中初始化 `sessionTimestamps: {}`
- 在 `get()` 方法中合并 `sessionTimestamps` 字段
- 新增 `getSessionTimestamp(sessionId: string): number` 方法
- 新增 `saveSessionTimestamp(sessionId: string, timestamp: number): StorageResult` 方法
- 新增 `removeSessionTimestamp(sessionId: string): StorageResult` 方法
- 新增 `clearSessionTimestamps(): StorageResult` 方法

---

## 步骤 5: 更新 useChatMessages Hook（核心）

**描述**: 修改 useChatMessages Hook，集成 last_update_time 的完整生命周期管理。

**依赖文档**:
- `src/hooks/useChatMessages.ts` - 现有的消息管理 Hook
- 步骤 2 的 API 模块
- 步骤 3 的 chat.ts 更新
- 步骤 4 的 storage 扩展

**产出**:
- 新增 import（message-station API 和 storage）
- 新增 `lastUpdateTime` 状态
- 新增 `initializedRef` Ref
- 修改 `loadMessages` 函数：
  - 从 localStorage 恢复 last_update_time
  - 调用新的 `/msapi/messages` 接口
  - 从历史消息中提取最晚的 update_time
- 修改 `handlePollMessage`：更新 last_update_time
- 新增 `handleConnected` 回调处理 connected 事件
- 修改 `apiStartPolling` 调用，传入 last_update_time
- 处理首次连接（无历史消息）的情况
- 处理多会话切换的情况

---

## 步骤 6: 编译验证和基础测试

**描述**: 验证所有修改能够正确编译，并进行基础功能测试。

**依赖文档**:
- 之前所有步骤的产出

**产出**:
- TypeScript 编译无错误
- 运行 `npm run build` 成功
- 手动测试验证：
  - 首次连接新会话
  - 加载有历史消息的会话
  - 发送消息并接收响应
  - 切换会话
  - 刷新页面后恢复状态

---

## 执行记录

### 2026-02-12 20:00
- 创建工作区目录和设计文档
- 设计方案已准备完成，等待用户确认

---
*创建时间: 2026-02-12 20:00*
