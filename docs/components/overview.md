# 组件列表

Workbench 组件市场中的所有可用组件。

## 组件一览

| 组件 | 版本 | 描述 | 状态 |
|------|------|------|------|
| [agent-management](#agent-management) | 2.0.1 | Agent 管理组件 | ✅ 稳定 |
| [agent-status](#agent-status) | 1.0.0 | Agent 状态监控 | ✅ 稳定 |
| [file-browser](#file-browser) | 1.0.2 | 文件浏览器 | ✅ 稳定 |
| [hello-world](#hello-world) | 1.0.6 | Hello World 示例 | ✅ 示例 |
| [todolist](#todolist) | 1.0.1 | 待办事项管理 | ✅ 稳定 |

---

## agent-management

Agent 管理组件，支持 Agent 的增删查改和实时状态监控。

### 基本信息

| 属性 | 值 |
|------|-----|
| ID | `com.workbench.agent-management` |
| 版本 | `2.0.1` |
| 作者 | ZC |
| 图标 | ⚙️ |

### 能力需求

```json
{
  "required": [],
  "optional": ["host:ui:notify", "host:ui:resize", "host:ui:close"]
}
```

### 功能特性

- Agent 列表查看
- Agent 配置管理
- 实时状态监控
- Agent 启停控制

---

## agent-status

Agent 状态监控组件，实时显示所有 Agent 的运行状态和当前活动。

### 基本信息

| 属性 | 值 |
|------|-----|
| ID | `com.workbench.agent-status` |
| 版本 | `1.0.0` |
| 作者 | ZC |
| 图标 | 🤖 |

### 能力需求

```json
{
  "required": [],
  "optional": ["host:ui:notify", "host:ui:resize", "host:ui:close"]
}
```

### 配置项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `apiBaseUrl` | string | `""` | API 基础路径 |
| `refreshInterval` | number | `5000` | 刷新间隔（毫秒） |
| `showInactiveAgents` | boolean | `true` | 是否显示离线 Agent |

### 功能特性

- 实时监控所有 Agent 运行状态
- 显示空闲/忙碌/离线统计
- 显示 Agent 详细信息（头像、描述、模型、工具）
- 忙碌状态显示当前处理的会话 ID

---

## file-browser

文件浏览器组件，用于浏览和管理服务器文件系统。

### 基本信息

| 属性 | 值 |
|------|-----|
| ID | `com.workbench.file-browser` |
| 版本 | `1.0.2` |
| 作者 | ZC |
| 图标 | 📁 |

### 能力需求

```json
{
  "required": [],
  "optional": ["host:ui:notify", "host:ui:resize", "host:ui:close"]
}
```

### 功能特性

- 🔐 密码认证登录
- 📁 浏览目录结构
- 📄 查看文件内容
- 📝 Markdown 渲染支持
- 🎨 代码语法高亮
- 🔢 行号显示
- 📋 复制内容/路径
- 🔄 刷新目录

### 支持的文件类型

| 类型 | 扩展名 | 渲染方式 |
|------|--------|----------|
| Markdown | `.md`, `.markdown` | Markdown 渲染 + 代码高亮 |
| 代码 | `.js`, `.ts`, `.py`, `.java` 等 | 语法高亮 + 行号 |
| 纯文本 | 其他 | 纯文本显示 + 行号 |

### 依赖的 CDN

| 库 | 版本 | 用途 |
|----|------|------|
| marked.js | 11.1.1 | Markdown 解析 |
| highlight.js | 11.9.0 | 代码语法高亮 |

---

## hello-world

一个简单的 Hello World 示例组件，展示 Workbench 组件系统的基本功能。

### 基本信息

| 属性 | 值 |
|------|-----|
| ID | `com.workbench.hello-world` |
| 版本 | `1.0.6` |
| 作者 | ZC |
| 图标 | 👋 |

### 能力需求

```json
{
  "required": [],
  "optional": [
    "host:ui:notify",
    "host:ui:resize",
    "host:ui:close",
    "host:messages:getAll",
    "host:sessions:getCurrent",
    "host:input:append"
  ]
}
```

### 功能

- 显示 "Hello, World!" 消息
- 演示基本的组件生命周期
- 演示如何使用 Host API

---

## todolist

一个优雅的待办事项管理组件，灵感来自 Wunderlist。

### 基本信息

| 属性 | 值 |
|------|-----|
| ID | `com.workbench.todolist` |
| 版本 | `1.0.1` |
| 作者 | ZC |
| 图标 | ✓ |

### 能力需求

```json
{
  "required": [],
  "optional": ["host:ui:notify", "host:ui:resize", "host:ui:close", "host:ui:focus"]
}
```

### 功能特性

- ✅ 添加待办事项
- 📝 编辑待办内容
- 🗑️ 删除待办事项
- ✔️ 标记完成状态
- 💾 本地持久化存储
- 🎨 优雅的 UI 设计

---

## 组件开发

如需开发新组件，请参考：

- [组件开发指南](../guides/component-development.md)
- [组件发布指南](../guides/publishing-components.md)
- [Workbench 架构设计](../architecture/workbench.md)

---

**最后更新**: 2026-02-14
