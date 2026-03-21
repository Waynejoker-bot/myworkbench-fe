# 002 - ChatBox 优化任务清单

## Phase 1: 数据结构重构 ✅

### 1.1 类型定义 ✅
- [x] 在 `src/workbench/types/message-station.ts` 中定义新类型
  - [x] `RawMessage` - 与 Message Station 对齐的原始消息类型
  - [x] `MessageStatus` 枚举 (START, CHUNK, END, ERROR)
  - [x] `DeliveryStatus` 枚举 (P, DELIVERED, ACKED, FAILED, DISCARDED)
  - [x] `StreamChunk` - 流式块类型
  - [x] `UIMessage` - 聚合后的 UI 消息类型（包含 contentBlocks）
  - [x] `ReplyRelation` - 回复关系类型

### 1.2 内容块类型定义 ✅（详见 message-content-design.md）
- [x] 在 `src/workbench/types/content-block.ts` 中定义内容块类型
  - [x] `ContentType` 枚举（包含 TEXT, MARKDOWN, CODE, IMAGE, AUDIO, VIDEO 等）
  - [x] `ContentBlock` 基础接口
  - [x] `TextBlock`, `MarkdownBlock`, `CodeBlock`
  - [x] `CodeResultBlock`, `ToolCallBlock`, `ProgressBlock`
  - [x] `CardBlock`, `FileBlock`, `ErrorBlock`
  - [x] `AudioBlock`, `VideoBlock` - 新增
  - [x] `AnyContentBlock` 联合类型

### 1.3 工具函数 ✅
- [x] 创建 `src/workbench/utils/message-aggregator.ts`
  - [x] `MessageAggregator.groupMessages()` - 按 message_id 分组（流式聚合）
  - [x] `MessageAggregator.aggregateGroup()` - 聚合单条流式消息
  - [x] `MessageAggregator.aggregate()` - 聚合所有消息
- [x] 创建 `src/workbench/utils/message-organizer.ts`
  - [x] `ReplyRelationOrganizer.organize()` - 建立回复关系
  - [x] `ReplyRelationOrganizer.getReplyTarget()` - 获取回复目标
- [x] 创建 `src/workbench/utils/message-merger.ts`
  - [x] `MessageMerger.merge()` - 去重合并新旧消息
  - [x] `MessageMerger.hasNewMessages()` - 检查是否有新消息
- [x] 创建 `src/workbench/utils/message-converters.ts`
  - [x] `determineRole()` - 判断消息角色
  - [x] `parsePayload()` - 解析 payload
  - [x] `parsePayloadToBlocks()` - 解析 payload 为内容块
  - [x] `blocksToPayload()` - 内容块序列化为 payload

### 1.4 测试
- [ ] 创建单元测试（待后续完善）
  - [ ] 测试消息聚合逻辑（按 message_id）
  - [ ] 测试回复关系建立逻辑
  - [ ] 测试内容块解析逻辑
  - [ ] 测试边界情况（空消息、单条消息、错误消息）

---

## Phase 2: Hook 重构 ✅

### 2.1 修改 useChatMessages ✅
- [x] 更新 `src/hooks/useChatMessages.ts`
  - [x] 使用新的数据结构
  - [x] 添加 `rawMessages` 状态
  - [x] 添加 `uiMessages` 状态
  - [x] 添加 `replyRelations` 状态
  - [x] 实现 `handleNewMessages()` 处理轮询消息
  - [x] 修改 Poll 回调逻辑（正确处理流式消息）
  - [x] 更新返回类型 `UseChatMessagesReturn`
  - [x] 保持向后兼容（legacy messages 字段）

### 2.2 API 适配 ✅
- [x] 检查 `src/api/chat.ts`
  - [x] 扩展 `PollMessage` 类型以支持新字段
  - [x] 确保包含 `round_id` 字段

### 2.3 集成测试
- [ ] 测试发送消息流程
- [ ] 测试接收流式消息
- [ ] 测试多条消息聚合
- [ ] 测试多 Agent 场景

---

## Phase 3: UI 组件更新 ✅

### 3.1 更新 ChatMessages 组件 ✅
- [x] 修改 `src/components/chat/ChatMessages.tsx`
  - [x] 支持 `messages` 参数（向后兼容）
  - [x] 支持 `uiMessages` 参数（新 API）
  - [x] 支持 `replyRelations` 参数（新 API）
  - [x] 实现消息按回复关系分组
  - [x] 实现回复引用显示
  - [x] 更新滚动到底部逻辑

### 3.2 创建消息子组件 ✅
- [x] 创建 `src/components/chat/message/` 目录
- [x] 创建 `MessageBubble.tsx`
  - [x] 显示 Agent 头像/名称
  - [x] 显示回复引用（如果 replyToId 存在）
  - [x] 支持多种内容块类型
  - [x] 显示消息状态指示器
  - [x] 显示时间戳
  - [x] 支持不同角色的样式
- [x] 创建 `MessageStatusIndicator.tsx`
  - [x] START 状态：旋转加载图标
  - [x] CHUNK 状态：流式动画（"输入中"）
  - [x] END 状态：发送成功图标
  - [x] ERROR 状态：错误图标

### 3.3 内容块渲染系统 ✅
- [x] 在 MessageBubble 中实现基础内容块渲染
  - [x] TextBlock - 纯文本
  - [x] MarkdownBlock - Markdown（带 marked.js）
  - [x] CodeBlock - 代码块
  - [x] CodeResultBlock - 代码执行结果
  - [x] ErrorBlock - 错误信息
  - [x] ProgressBlock - 进度条
  - [x] ToolCallBlock - 工具调用

### 3.4 样式调整 ✅
- [x] 消息气泡样式
- [x] 状态指示器动画
- [x] 内容块样式
- [x] 回复引用样式
- [x] 响应式适配

---

## Phase 4: 交互式内容块（部分完成，后续完善）

### 4.1 交互式渲染器（待完善）
- [ ] 实现 `CardBlockRenderer`
  - [ ] 卡片容器样式
  - [ ] 操作按钮渲染
  - [ ] 操作处理机制
- [ ] 实现 `FileBlockRenderer`
  - [ ] 文件图标显示
  - [ ] 下载/预览功能

### 4.2 操作处理（待完善）
- [ ] 实现操作处理器
  - [ ] `onAction` 回调机制
  - [ ] 操作类型分发
  - [ ] 与父组件通信

---

## Phase 5: Markdown 渲染 ✅

### 5.1 基础渲染 ✅
- [x] 集成 Markdown 解析库（marked.js）
- [x] 渲染 Markdown 格式的消息内容
- [x] 代码块语法高亮（highlight.js）

### 5.2 安全处理 ✅
- [x] XSS 防护（DOMPurify）
- [x] HTML 转义
- [x] 链接安全处理

---

## Phase 6: 测试与优化（进行中）

### 6.1 测试
- [ ] 端到端测试
- [ ] 性能测试（大量消息场景）
- [ ] 边界情况测试

### 6.2 优化（待完善）
- [ ] 虚拟滚动（react-window）
- [ ] 消息分页加载
- [ ] 内存优化

### 6.3 文档
- [x] 更新设计文档
- [x] 更新架构文档
- [ ] 更新任务文档（本文件）

---

## 当前进度

| Phase | 状态 | 进度 |
|-------|------|------|
| Phase 1 | ✅ 完成 | 100% |
| Phase 2 | ✅ 完成 | 100% |
| Phase 3 | ✅ 完成 | 100% |
| Phase 4 | ⏸️ 待完善 | 30% |
| Phase 5 | ✅ 完成 | 100% |
| Phase 6 | 🔄 进行中 | 50% |

**总体进度：约 85% 完成**

---

## 已完成的文件

### 类型定义
- `src/workbench/types/message-station.ts`
- `src/workbench/types/content-block.ts`

### 工具函数
- `src/workbench/utils/message-aggregator.ts`
- `src/workbench/utils/message-organizer.ts`
- `src/workbench/utils/message-merger.ts`
- `src/workbench/utils/message-converters.ts`
- `src/workbench/utils/markdown.ts`

### Hooks
- `src/hooks/useChatMessages.ts`（已重构）

### 组件
- `src/components/chat/ChatMessages.tsx`（已更新）
- `src/components/chat/message/MessageBubble.tsx`（新建）
- `src/components/chat/message/MessageStatus.tsx`（新建）
- `src/components/chat/message/index.ts`（新建）

### 文档
- `docs/workspace/002-chatbox-message-rendering/README.md`
- `docs/workspace/002-chatbox-message-rendering/design.md`
- `docs/workspace/002-chatbox-message-rendering/architecture.md`
- `docs/workspace/002-chatbox-message-rendering/message-content-design.md`
- `docs/workspace/002-chatbox-message-rendering/payload-format.md`（新增 - Payload 格式协议文档）
- `docs/workspace/002-chatbox-message-rendering/tasks.md`（本文件）

### 最近修复（2026-02-08）
- [x] 修复 payload 解析问题
  - [x] 更新 `parsePayload()` 以正确处理 `{"type":"text","data":[{"itemType":"text","text":"content"}]}` 格式
  - [x] 更新 `parsePayloadToBlocks()` 以正确生成内容块
  - [x] 添加 `AudioBlock` 和 `VideoBlock` 类型支持
  - [x] 修复 `ToolCallBlock` 的 `parameters` 字段映射（从 `arguments`）
- [x] 修复 session 切换后消息列表不刷新的问题
  - [x] 在 `handleNewMessages` 中添加 `replace` 参数
  - [x] 加载新会话时使用替换模式而非合并模式
- [x] 修复消息气泡不支持 Markdown 渲染的问题
  - [x] 修复 `message-aggregator.ts` 中的 content block 解析逻辑
  - [x] 直接从 payload JSON 解析内容块，而非从纯文本解析
  - [x] 支持流式消息的内容块聚合
  - [x] 简化策略：所有 text 类型内容统一使用 MarkdownBlock 渲染
- [x] UI 优化：减少 ChatBox 左边距
  - [x] 水平内边距从 `px-6` 减少到 `px-3`
  - [x] Agent 回复左边距从 `ml-11` 减少到 `ml-6`

---

*最后更新：2026-02-08*
