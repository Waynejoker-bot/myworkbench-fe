# 执行计划: Workspace 文档归档整理

## 进度总览

| 步骤 | 描述 | 状态 |
|------|------|------|
| 1 | 创建 archive 目录 | 🕐 pending |
| 2 | 归档未完成的工作区 | 🕐 pending |
| 3 | 整合 002-chatbox-message-rendering 文档 | 🕐 pending |
| 4 | 整合 26020817-tool-config-display 文档 | 🕐 pending |
| 5 | 删除 workspace 下的空目录 | 🕐 pending |
| 6 | 更新 docs/README.md 索引 | 🕐 pending |

---

## 步骤 1: 创建 archive 目录

**描述**: 在 workspace 目录下创建 archive 子目录，用于存放已归档的工作区文档。

**依赖文档**:
- `docs/workspace/` - 当前 workspace 目录

**产出**: `docs/workspace/archive/` 目录

---

## 步骤 2: 归档未完成的工作区

**描述**: 将以下未完成/被替代的工作区移动到 archive 目录：
- 26020816-config-api
- 26020816-tool-call-ui
- 26020817-message-station
- 26020817-tool-config-api
- 26020817-tool-config-system

**依赖文档**:
- `docs/workspace/26020816-config-api/`
- `docs/workspace/26020816-tool-call-ui/`
- `docs/workspace/26020817-message-station/`
- `docs/workspace/26020817-tool-config-api/`
- `docs/workspace/26020817-tool-config-system/`

**产出**: archive/ 目录下包含所有归档的工作区

---

## 步骤 3: 整合 002-chatbox-message-rendering 文档

**描述**: 将已完成的消息渲染文档整合到项目文档目录：
- 复制 architecture.md → docs/architecture/message-rendering.md
- 复制 design.md → docs/guides/message-rendering-guide.md
- 复制 message-content-design.md → docs/architecture/content-blocks.md
- 复制 payload-format.md → docs/api/message-payload-format.md
- 删除 tasks.md, README.md
- 移动整个目录到 archive/

**依赖文档**:
- `docs/workspace/002-chatbox-message-rendering/architecture.md`
- `docs/workspace/002-chatbox-message-rendering/design.md`
- `docs/workspace/002-chatbox-message-rendering/message-content-design.md`
- `docs/workspace/002-chatbox-message-rendering/payload-format.md`

**产出**: 项目文档目录下的消息渲染相关文档

---

## 步骤 4: 整合 26020817-tool-config-display 文档

**描述**: 将已完成的工具配置显示文档整合到项目文档目录：
- 从 IMPLEMENTATION_COMPLETE.md 提取关键内容 → docs/components/tool-display.md
- 复制 USAGE_EXAMPLES.md → docs/guides/tool-display-usage.md
- 复制 design.md → docs/architecture/tool-display.md
- 删除 plan.md, README.md
- 移动整个目录到 archive/

**依赖文档**:
- `docs/workspace/26020817-tool-config-display/IMPLEMENTATION_COMPLETE.md`
- `docs/workspace/26020817-tool-config-display/USAGE_EXAMPLES.md`
- `docs/workspace/26020817-tool-config-display/design.md`

**产出**: 项目文档目录下的工具配置显示相关文档

---

## 步骤 5: 删除 workspace 下的空目录

**描述**: 确认所有文档已整理或归档后，清理 workspace 目录下的空目录。

**依赖文档**:
- `docs/workspace/` - 整理后的 workspace 目录

**产出**: 干净的 workspace 目录，只保留当前正在进行的工作区

---

## 步骤 6: 更新 docs/README.md 索引

**描述**: 在 docs/README.md 中添加新整合的文档索引，确保文档导航清晰。

**依赖文档**:
- `docs/README.md` - 现有的文档索引
- `docs/architecture/` - 新增的架构文档
- `docs/api/` - 新增的 API 文档
- `docs/components/` - 新增的组件文档
- `docs/guides/` - 新增的指南文档

**产出**: 更新后的 docs/README.md，包含所有新文档的链接

---

## 执行记录

### 2026-02-08 18:30
- 创建工作区
- 创建 design.md 和 plan.md

---
*创建时间: 2026-02-08 18:30*
