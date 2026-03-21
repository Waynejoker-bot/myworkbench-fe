# MyWorkbench FE

ChatBox 工作台前端应用，支持动态组件加载和多 Agent 交互。

## 项目概述

MyWorkbench 是一个基于 React 的聊天工作台应用，核心特性：

- **ChatBox**：支持 SSE 流式消息、Markdown 渲染、多轮对话
- **Workbench**：动态组件系统，支持远程加载和沙箱隔离
- **组件市场**：可扩展的组件生态

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS 3 |
| 路由 | React Router 7 |
| Markdown | marked + highlight.js |
| 测试 | Vitest |

## 目录结构

```
/opt/claude/myworkbench-fe/
├── src/
│   ├── api/                 # API 请求封装
│   ├── components/          # 通用 UI 组件
│   ├── constants/           # 常量定义
│   ├── features/            # 功能模块
│   ├── hooks/               # 自定义 Hooks
│   ├── lib/                 # 工具库
│   ├── pages/               # 页面组件
│   │   ├── HomePage.tsx     # 首页
│   │   ├── ChatBoxPage.tsx  # 聊天页面（主页面）
│   │   ├── FileSystemPage.tsx
│   │   └── FourierDrawPage.tsx
│   ├── services/            # 服务层
│   ├── types/               # TypeScript 类型
│   ├── workbench/           # Workbench 核心系统
│   │   ├── component/       # 组件加载器
│   │   ├── core/            # 核心逻辑
│   │   ├── host/            # Host API
│   │   ├── registry/        # 组件注册表
│   │   ├── storage/         # 持久化存储
│   │   └── types/           # 类型定义
│   ├── App.tsx
│   ├── router.tsx
│   └── main.tsx
├── gallery/                 # 组件源码（开发目录）
│   ├── agent-management/    # Agent 管理组件
│   ├── file-browser/        # 文件浏览器组件
│   ├── hello-world/         # 示例组件
│   └── todolist/            # 待办事项组件
├── docs/                    # 项目文档
└── public/                  # 静态资源
```

## 核心页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 首页，项目介绍 |
| `/chat` | ChatBoxPage | 聊天页面，三栏布局 |
| `/fs` | FileSystemPage | 文件系统浏览 |
| `/fourier` | FourierDrawPage | 傅里叶绘图（实验性） |

## 组件市场

编译后的组件部署在 `/opt/market/`：

```
/opt/market/
├── components/              # 组件文件
│   ├── agent-management/    # Agent 管理组件
│   ├── agent-status/        # Agent 状态监控
│   ├── file-browser/        # 文件浏览器
│   ├── hello-world/         # Hello World 示例
│   └── todolist/            # 待办事项
└── registry.json            # 组件注册表
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 文档导航

| 需求 | 文档 |
|------|------|
| 了解架构设计 | [architecture/](./architecture/) |
| 查看 API 接口 | [api/](./api/) |
| 开发新组件 | [guides/](./guides/) |
| 查看组件列表 | [components/](./components/) |

## 相关项目

| 项目 | 路径 | 说明 |
|------|------|------|
| Message Station | `/opt/claude/message-station` | 消息队列服务 |
| Agent Service | `/opt/claude/agent-service` | Agent 后端服务 |
| Components Market | `/opt/market` | 组件市场部署目录 |

---

**最后更新**: 2026-02-14
