# AGENTS.md — MyWorkbench FE

> 本文件是 agent 的导航地图，不是百科全书。指向更深的信息源。

## 项目一句话

AgentOS 的前端层——承载 CS（Custom Service）角色，同时是用户与 AS（Agent Service）交互的主入口。

## AgentOS ABC 架构定位

本项目是 AgentOS 三角架构的一部分。理解这个定位，才能做出正确的前端决策。

```
        ┌────────────────────────────┬────────────────────────┐
        │     CS (Custom Service)    │   AS (Agent Service)   │
        │     可插拔的业务能力插件     │   承载 Agent            │
        │         （用户态）          │      （用户态）          │
        └────────────────────────────┴────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────┐
        │                 BS (Basic Service)                   │
        │                基础服务（内核态）                      │
        └─────────────────────────────────────────────────────┘
```

**映射到我们的三个仓库**：

| ABC 层 | 仓库 | 核心职责 |
|--------|------|---------|
| **BS** | `message-station` :2048 | 消息路由、Channel 状态机、Session 管理、Task 调度 |
| **AS** | `agent-service` :2049 | 多 Agent 编排、ReAct 推理循环、LLM 多模型调用、Tool 系统 |
| **CS** | `myworkbench-fe` :5179 | 面板系统、组件市场、ChatBox 交互界面 |

**为什么是三角不是两层？** 因为 Agent 时代的"用户态"分裂成了两种能力：
- AS：能自主推理、规划、执行（Agent）
- CS：更稳定、更可控、适合结构化展示和 GUI 交互（插件/面板）

**前端优化的指导原则**：

1. **CS 一体两面** — 每个前端能力都要同时考虑 Human 和 Agent 两个消费者。Human 看到界面，Agent 看到意图描述和操作接口。具体三个条件：
   - 可感知：Agent 能发现这个 CS 的存在和能力
   - 可操作：Agent 能调用这个 CS 完成任务
   - 可回调：CS 能反向调用 Agent 来帮忙处理
2. **ChatBox 不是唯一交互形式** — 有些场景必须用 GUI（图表、表单、文件管理），不要试图把所有东西塞进对话流
3. **热插拔** — CS 能力应该随时安装/卸载，不影响系统运行（对应面板系统和组件市场的设计）
4. **BS 是透明的** — 前端不应该感知 Message Station 的内部实现，只通过标准接口通信

## Build & Test

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器 (localhost:5179)
npm run build        # tsc -b && vite build
npm run test         # vitest run
npm run test:watch   # vitest --watch
npm run lint         # eslint .
```

## 技术栈

React 18 · TypeScript 5 · Vite 5 · Tailwind CSS 3 · React Router 7 · Vitest

## 架构总览 → [ARCHITECTURE.md](./ARCHITECTURE.md)

依赖分层（只能向左导入）：

```
Types → API → Hooks → Components → Pages
```

## 目录结构速查

| 目录 | 职责 | 子系统 AGENTS |
|------|------|---------------|
| `src/api/` | 后端请求封装 | [src/api/AGENTS.md](./src/api/AGENTS.md) |
| `src/components/chat/` | 聊天核心 UI | [src/components/chat/AGENTS.md](./src/components/chat/AGENTS.md) |
| `src/components/panel/` | 右侧面板系统 | [src/components/panel/AGENTS.md](./src/components/panel/AGENTS.md) |
| `src/hooks/` | 自定义 Hooks | — |
| `src/pages/` | 页面组件 | — |
| `src/utils/` | 工具函数 | [src/utils/AGENTS.md](./src/utils/AGENTS.md) |
| `src/types/` | TypeScript 类型 | — |
| `src/contexts/` | React Context | — |
| `src/features/` | 功能模块 | — |

## 三服务通信拓扑

```
┌─────────────────────┐
│  CS: myworkbench-fe │  React SPA (本仓库)
│      :5179          │
└────────┬────────────┘
         │  /api/  /msapi/  /market/  (Vite proxy → arm.hqdx.store)
         ▼
┌─────────────────────┐          ┌─────────────────────┐
│  BS: Message Station│◄────────►│  AS: Agent Service  │
│      :2048          │ callback │      :2049          │
│  消息路由 & 投递     │  + send  │  Agent 编排 & LLM   │
└─────────────────────┘          └─────────────────────┘
         │                                │
         └────────── MySQL ───────────────┘
                     Redis (Agent 分布式锁)
```

**消息流转**：CS(前端) → BS(Message Station 队列) → callback → AS(Agent 推理) → send → BS → SSE → CS

## 后端代理（仅本地开发）

Vite proxy 将 `/api`、`/msapi`、`/market` 转发到 `https://arm.hqdx.store`。
**注意**：提交代码前确认 `vite.config.ts` 中的 proxy target 是否需要还原。

## API 路径约定

| 前缀 | 服务 | 端口 | 用途 |
|------|------|------|------|
| `/api/` | Agent Service | 2049 | 认证、Agent 管理、会话、Todo、工具配置、文件系统 |
| `/msapi/` | Message Station | 2048 | 消息收发、SSE 实时流、Session CRUD、Task 管理 |
| `/market/` | 组件市场 | — | 组件注册与动态加载 |

## Message Station 接口清单（:2048）

> 代码仓库：`../message-station`，前端通过 `/msapi/` 前缀访问

### 消息收发（前端核心依赖）

| 方法 | 路径 | 用途 | 前端使用场景 |
|------|------|------|-------------|
| POST | `/msapi/send-message` | 发送消息（自动建 session） | ChatInput 发消息 |
| GET | `/msapi/poll-message?session_id=X&last_update_time=Y` | **SSE 实时流**，每 2s 推送新消息 | useChatMessages 订阅 |
| GET | `/msapi/messages?session_id=X&page=N&page_size=N` | 分页历史消息（DESC 排序） | 消息历史加载 |

### 会话管理

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/msapi/sessions` | 创建会话 |
| GET | `/msapi/sessions?agent_id=X&status=X&limit=N&offset=N` | 会话列表（支持筛选） |
| GET | `/msapi/sessions/{session_id}` | 会话详情 |
| PATCH | `/msapi/sessions/{session_id}/title` | 更新标题 |
| PATCH | `/msapi/sessions/{session_id}/status` | 更新状态 (active/completed/archived) |
| DELETE | `/msapi/sessions/{session_id}` | 软删除 |

### Channel 状态

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/msapi/channel-status?channel_id=X` | 查询 Agent 通道状态 |
| GET | `/msapi/channels` | 所有通道列表及状态 |

**Channel 状态机**：`OFFLINE → CONNECTED → SESSION_IDLE ⇄ SESSION_BUSY`
- 仅 `SESSION_IDLE` 可接收新消息
- 前端通过 channels 接口获取 Agent 在线/忙碌状态

### Task 管理

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/msapi/tasks` | 创建任务 |
| GET | `/msapi/tasks?creator_id=X&assignee_id=X&status=X` | 任务列表 |
| GET | `/msapi/tasks/{task_id}` | 任务详情 |
| PATCH | `/msapi/tasks/{task_id}` | 更新任务 |
| POST | `/msapi/tasks/{task_id}/start` | 启动任务（创建执行 session） |
| POST | `/msapi/tasks/{task_id}/report` | 报告进度/完成 |
| POST | `/msapi/tasks/{task_id}/cancel` | 取消任务 |

### 关键数据结构

**Message**：
```
session_id, round_id, message_id(唯一), source, target, seq,
status(1=START/2=CHUNK/3=END/-1=ERROR), payload, timestamp,
delivery_status(P/DELIVERED/ACKED/FAILED/DISCARDED)
```

**Session**：`session_id, agent_id, title, status(active/completed/archived)`

**Task**：`task_id, title, creator_id, assignee_id, source_session_id, execution_session_id, status(pending/running/completed/failed/cancelled), progress(0-100)`

### 错误码

| 代码 | 含义 | 前端处理建议 |
|------|------|-------------|
| MS_ERR_0100 | Channel 离线 | 提示 Agent 不在线 |
| MS_ERR_0103 | Channel 忙碌 | 提示 Agent 正在处理中 |
| MS_ERR_0300 | Session 不存在 | 重新创建 session |

## Agent Service 接口清单（:2049）

> 代码仓库：`../agent-service`，前端通过 `/api/` 前缀访问

### 认证

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/auth/login` | 登录（返回 JWT token + cookie） |
| POST | `/api/auth/logout` | 登出 |

### Agent 管理

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/agents` | Agent 列表 |
| GET | `/api/agents/{agent_id}` | Agent 详情 |
| POST | `/api/agents` | 创建 Agent |
| PUT | `/api/agents/{agent_id}` | 更新 Agent 配置 |
| DELETE | `/api/agents/{agent_id}` | 删除 Agent |

**Agent 配置结构**：
```
agent_id, name, prompt(系统提示词), llm_provider(openai/anthropic),
llm_model, max_rounds, agent_type(react/claude-sdk), tools[],
options{max_tokens, temperature}, config{avatar}, enabled
```

### Todo 管理

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/todos` | Todo 列表（支持筛选） |
| POST | `/api/todos` | 创建 Todo |
| GET | `/api/todos/{id}` | Todo 详情 |
| PATCH | `/api/todos/{id}` | 更新 Todo |
| DELETE | `/api/todos/{id}` | 删除 Todo |
| POST | `/api/todos/{id}/toggle` | 切换完成状态 |

### 工具系统

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/tools/config` | 工具配置 |
| GET | `/tools/` | 所有已注册工具 |
| GET | `/tools/{tool_name}` | 工具详情 |
| GET | `/tools/{tool_name}/schema` | 工具 JSON Schema |

### 文件系统（需认证）

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/fs/list` | 目录列表 |
| GET | `/api/fs/read` | 读取文件内容 |
| GET | `/api/fs/info` | 文件/目录信息 |

### 消息处理（前端通过 SSE 消费）

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/poll-message` | SSE 流（事件类型见下） |
| POST | `/api/send-message` | 直接发送到 Message Station |

**SSE 事件类型**：`round_start` → `thinking` → `tool_call_start` → `tool_result` → `response` → `end`

### 图片上传

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/images/upload` | 上传图片（MD5 去重） |

### Payload 数据结构

```
{ type: "text"|"tool"|"image"|"audio"|"video"|"mixed",
  data: [TextItem|ToolDataItem|ImageItem|...] }

TextItem:  { itemType: "text", text: "..." }
ToolItem:  { itemType: "tool", toolItem: {name, arguments, result} }
ImageItem: { itemType: "image", image: "base64 or URL" }
```

## 协作模式

项目负责人是产品经理，擅长结构化思考、业务逻辑梳理、审美判断，不写代码。

- **需要与负责人讨论的**：产品方向、业务逻辑、信息架构、用户体验、优先级取舍
- **Agent 自主决策的**：技术选型、代码架构、工程实现、性能优化、代码风格 — 直接给出推荐方案并执行，不罗列选项
- **沟通方式**：用产品/业务语言解释技术决策的"做了什么"和"为什么"，跳过代码细节

## 设计系统 → [DESIGN.md](./DESIGN.md)

做任何视觉或 UI 相关改动前，必须先读 DESIGN.md。字体、配色、间距、圆角、动效、布局规范全部定义在该文件中。不得偏离。

| 规范 | 要点 |
|------|------|
| 主色 | Sky Blue #0EA5E9，深色模式 #38BDF8 |
| 中性色 | Slate 系列（冷蓝灰） |
| 标题字体 | DM Sans 600/700 |
| 正文字体 | 系统字体栈（中英文最佳渲染） |
| 代码字体 | JetBrains Mono |
| 间距基数 | 4px |
| 动效 | 功能导向，微交互 150ms，内容 200-300ms |
| 深色模式 | 必须支持，CSS 变量切换 |

## 关键约定

1. **组件样式**：Tailwind CSS utility-first，不写自定义 CSS 文件
2. **状态管理**：React Context + 自定义 Hooks，不用 Redux
3. **消息处理管线**：聚合 → 解析 → 合并 → 线程化，详见 [src/utils/AGENTS.md](./src/utils/AGENTS.md)
4. **面板扩展**：所有新面板在 `src/components/panel/panels/` 下添加，并注册到 `built-in-panels.ts`
5. **国际化**：当前中文为主，UI 文案直接硬编码
6. **移动适配**：768px 断点，`src/components/mobile/` 独立布局

## 深层文档索引

| 需要了解 | 去看 |
|----------|------|
| 设计系统 | [DESIGN.md](./DESIGN.md) |
| 架构设计 | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| API 接口规范 | [docs/api/](./docs/api/) |
| 消息系统设计 | [docs/guides/chatbox-message-system.md](./docs/guides/chatbox-message-system.md) |
| 工具配置系统 | [docs/guides/tool-config-system.md](./docs/guides/tool-config-system.md) |
| 组件开发指南 | [docs/guides/component-development.md](./docs/guides/component-development.md) |
| 设计决策记录 | [docs/design-docs/](./docs/design-docs/) |
| 执行计划 | [docs/exec-plans/](./docs/exec-plans/) |
| 产品规格 | [docs/product-specs/](./docs/product-specs/) |
| 质量标准 | [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) |

## Git 工作流

- 分支命名：`feat/xxx`、`fix/xxx`、`refactor/xxx`
- 提交信息：中文或英文均可，简洁描述变更意图
- PR 前必须：`npm run build` + `npm run test` 通过

## 相关仓库

| 仓库 | 本地路径 | 端口 | 技术栈 | 用途 |
|------|---------|------|--------|------|
| [message-station](https://github.com/zhuchaokn/message-station) | `../message-station` | 2048 | FastAPI + MySQL | 消息队列路由，Notify+Pull 混合模型 |
| [agent-service](https://github.com/zhuchaokn/agent-service) | `../agent-service` | 2049 | FastAPI + MySQL + Redis | Agent 编排，ReAct 推理循环，LLM 调用 |
