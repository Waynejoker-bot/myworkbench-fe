# 执行计划 (Execution Plans)

执行计划是版本化的仓库产物，让 agent 在后续任务中能推理出先前的决策。

## 目录结构

```
exec-plans/
├── active/          # 正在进行的计划
│   └── {日期}-{名称}.md
├── completed/       # 已完成的计划
│   └── {日期}-{名称}.md
└── tech-debt/       # 技术债追踪
    └── tracker.md
```

## 计划模板

```markdown
# {计划名称}

## 背景
为什么要做这件事

## 目标
- [ ] 目标 1
- [ ] 目标 2

## 方案
选择了什么方案，为什么

## 执行步骤
1. 步骤 1
2. 步骤 2

## 决策日志
- {日期}: 决定了 X，因为 Y

## 完成标准
- [ ] 标准 1
- [ ] 标准 2
```

## 生命周期

1. 新计划创建在 `active/`
2. 完成后移到 `completed/`
3. 发现的技术债记录到 `tech-debt/tracker.md`

## 与 workspace 的关系

`docs/workspace/` 是历史遗留的临时工作区（design.md + plan.md）。
新的任务规划统一使用 `docs/exec-plans/`，不再使用 workspace 模式。
