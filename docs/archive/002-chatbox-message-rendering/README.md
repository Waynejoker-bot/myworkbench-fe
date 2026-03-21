# 002 - ChatBox 消息渲染与管理系统优化

## 需求概述

**目标**：构建一个成熟完备、方便使用的多 Agent 对话系统

**当前问题**：
1. Poll 之后拉到的消息会跟上一条 message 渲染到一起
2. 每个消息的状态没有对应的显示

**相关文档**：
- Message Station 协议：`/opt/claude/message-station/docs/PROTOCOL.md`
- Message Station 架构：`/opt/claude/message-station/docs/ARCHITECTURE.md`

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [README.md](./README.md) | 本文件 - 需求概述 |
| [design.md](./design.md) | 技术设计方案 |
| [architecture.md](./architecture.md) | 架构图和数据流 |
| [message-content-design.md](./message-content-design.md) | 消息内容形态设计（可扩展内容块系统） |
| [tasks.md](./tasks.md) | 任务清单 |

---

## 快速导航

### 问题分析

| 问题 | 根因 | 影响 |
|------|------|------|
| 消息渲染混乱 | 使用 `message_id` 判断，但同一条流式消息有多个 seq | 不同 round 的消息可能被合并 |
| 无状态显示 | `Message` 类型缺少 `status` 字段 | 无法感知消息流式进度 |
| 无轮次概念 | 没有按 `round_id` 分组 | 无法清晰展示对话轮次 |

### 核心设计理念

```
消息聚合 + 回复关系模型

1. 聚合：按 message_id 聚合流式消息（同一 message_id 的不同 seq）
2. 关联：按 round_id 建立回复关系（Agent 的 round_id = 用户消息的 message_id）
```

### 数据流程

```
RawMessage[] → 合并去重 → 聚合 → 建立回复关系 → UI渲染
  (按 seq)    (按 message_id)  (按 round_id)
```

### 关键概念

| 字段 | 用途 |
|------|------|
| `message_id` | 消息唯一标识，用于聚合同一条流式消息 |
| `round_id` | 回复关系标识，用于建立"引用样式" |

---

## 实施计划

| Phase | 说明 | 状态 |
|-------|------|------|
| Phase 1 | 数据结构重构 | 待开始 |
| Phase 2 | Hook 重构 | 待开始 |
| Phase 3 | UI 组件更新 | 待开始 |
| Phase 4 | 功能增强 | 待开始 |
| Phase 5 | Markdown 渲染 | 待开始 |
| Phase 6 | 测试与优化 | 待开始 |

---

## 涉及文件

### 需要修改
- `/opt/claude/myworkbench-fe/src/hooks/useChatMessages.ts`
- `/opt/claude/myworkbench-fe/src/components/chat/ChatMessages.tsx`

### 需要新增
- `/opt/claude/myworkbench-fe/src/workbench/types/message.ts`
- `/opt/claude/myworkbench-fe/src/workbench/utils/message-aggregator.ts`
- `/opt/claude/myworkbench-fe/src/workbench/utils/message-merger.ts`
- `/opt/claude/myworkbench-fe/src/components/chat/message/` (新目录)

---

## 相关链接

- [Message Station](/opt/claude/message-station/) - 后端消息队列服务
- [Agent Service](/opt/claude/agent-service/) - Agent 框架
- [Components Market](/opt/market/) - 组件市场

---

*需求创建时间：2026-02-08*
*最后更新：2026-02-08*
