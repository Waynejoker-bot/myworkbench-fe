# CLAUDE.md

## 项目导航

请先阅读 [AGENTS.md](./AGENTS.md) 获取项目完整导航和上下文。
架构详见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 子系统指南

修改某个子系统时，先读取该目录下的 AGENTS.md：

- `src/api/AGENTS.md` — API 请求层约定
- `src/components/chat/AGENTS.md` — 聊天 UI 约定
- `src/components/panel/AGENTS.md` — 面板系统约定
- `src/utils/AGENTS.md` — 消息处理管线约定

## 快速命令

```bash
npm run dev          # 启动开发服务器 (localhost:5179)
npm run build        # 构建
npm run test         # 运行测试
npm run lint         # 代码检查
```

## Plan Mode 工作流

当使用 Plan Mode 完成规划后，必须执行以下归档流程：

1. Plan Mode 结束后，将计划内容写入 `docs/exec-plans/active/{YYMMDD}-{计划名}.md`
2. 使用 exec-plans 模板格式（见 `docs/exec-plans/README.md`）
3. 计划完成后，将文件从 `active/` 移到 `completed/`
4. 过程中发现的技术债记录到 `docs/exec-plans/tech-debt/tracker.md`

可以使用 `/archive-plan` 技能一键完成归档。

## 注意事项

- `vite.config.ts` 中的 proxy target 当前指向 `https://arm.hqdx.store`（仅本地开发），提交前确认是否需要还原
- 质量标准见 [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)
