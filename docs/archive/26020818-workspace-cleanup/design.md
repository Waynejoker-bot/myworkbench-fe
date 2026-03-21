# Workspace 文档归档整理方案

## 需求背景

当前 workspace 目录下有多个工作区文档，需要：
1. 将已完成的有价值文档整合到项目文档目录
2. 将未完成/被替代/方向错误的文档归档
3. 清理 workspace 目录，保持整洁

## 整理策略

### 保留并整合的文档

#### 1. 002-chatbox-message-rendering（已完成）
- **价值**: 消息渲染架构设计，已完成实施
- **整合方案**:
  - `architecture.md` → `docs/architecture/message-rendering.md`
  - `design.md` → `docs/guides/message-rendering-guide.md`
  - `message-content-design.md` → `docs/architecture/content-blocks.md`
  - `payload-format.md` → `docs/api/message-payload-format.md`
  - `tasks.md`, `README.md` → 合并关键内容后删除

#### 2. 26020817-tool-config-display（已完成）
- **价值**: 工具配置显示组件，已完成实施
- **整合方案**:
  - `IMPLEMENTATION_COMPLETE.md` → 提取关键内容到 `docs/components/tool-display.md`
  - `USAGE_EXAMPLES.md` → `docs/guides/tool-display-usage.md`
  - `design.md` → `docs/architecture/tool-display.md`
  - `plan.md`, `README.md` → 合并关键内容后删除

### 归档的文档

以下工作区未完成或被替代，移至 `docs/workspace/archive/`：
1. **26020816-config-api** - 未开始实施
2. **26020816-tool-call-ui** - 未开始实施
3. **26020817-message-station** - 方向错误，被替代
4. **26020817-tool-config-api** - 设计阶段，未实施
5. **26020817-tool-config-system** - 设计阶段，未实施

## 执行步骤

1. 创建 archive 目录
2. 移动需要归档的工作区
3. 整合并保留有价值的文档到项目文档目录
4. 删除 workspace 下的空目录
5. 更新 docs/README.md 索引

## 预期结果

- workspace 目录只保留当前正在进行的工作区
- 已完成的文档整合到项目文档结构中
- 历史工作区保留在 archive 目录中供参考
- docs/README.md 提供清晰的文档导航
