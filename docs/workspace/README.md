# Workspace 临时工作区

此目录用于存放开发过程中的临时工作空间。

## 用途

- 按照结构化工作流程执行任务时创建的工作区
- 每个工作区包含 design.md 和 plan.md 文档
- 任务完成后，工作区应移至 `docs/archive/` 进行归档

## 目录结构

```
workspace/
└── {YYMMDDHH}-{任务名}/
    ├── design.md    # 需求和设计方案
    └── plan.md      # 执行计划和进度跟踪
```

## 注意事项

- 此目录不应长期保留内容
- 完成的任务立即归档到 `docs/archive/`
- 工作区命名格式: `{YYMMDDHH}-{简短任务名}`
