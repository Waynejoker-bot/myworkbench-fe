# 前端设计系统落地计划

## 背景

/design-review 审计结果 Design Score: C，主要问题：无品牌字体 (D)、单一配色 (C)、零动效 (D)。
已通过 /design-consultation 生成 DESIGN.md（Option A 冷峻专业），需要将规范落地到代码中。

项目已有 CSS 变量架构（HSL 格式）+ `darkMode: ["class"]` 配置，但深色模式变量未定义，且大量组件使用内联 hex 颜色绕过了变量系统。

## 四步执行计划

---

### Step 1：基础设施落地（改一次，全局生效）

**目标：** 把 DESIGN.md 的规范写进 Tailwind 配置和全局 CSS，所有组件自动继承。

**1.1 引入字体**
- 文件：`index.html`
- 操作：head 中添加 Google Fonts link（DM Sans 500/600/700 + JetBrains Mono 400/500）
- 文件：`tailwind.config.js`
- 操作：fontFamily 扩展 `display: ['DM Sans', ...]`、`mono: ['JetBrains Mono', ...]`

**1.2 更新 CSS 变量为 DESIGN.md 色值**
- 文件：`src/index.css`
- 操作：`:root` 中更新现有 HSL 变量，对齐 DESIGN.md 的 Sky Blue 主色 + Slate 中性色 + 语义色
- 新增变量：`--success`、`--warning`、`--info`（当前缺失）

**1.3 添加深色模式 CSS 变量**
- 文件：`src/index.css`
- 操作：添加 `.dark` 选择器下的完整变量集（DESIGN.md 中已定义深色模式色值）

**1.4 Tailwind 扩展语义色**
- 文件：`tailwind.config.js`
- 操作：colors 中添加 success、warning、info 映射到 CSS 变量

**1.5 深色模式切换组件**
- 新建：`src/components/ui/theme-toggle.tsx`
- 操作：读写 `<html>` 的 class="dark"，localStorage 持久化，跟随系统偏好

**关键文件：**
- `index.html`
- `tailwind.config.js`
- `src/index.css`
- `src/components/ui/theme-toggle.tsx`（新建）

---

### Step 2：高优 Finding 修复

**目标：** 修复 /design-review 审计报告中 HIGH 级别的 6 个问题。

**2.1 FINDING-012：触控目标过小（24px → 44px）**
- 文件：`src/components/chat/ConversationList.tsx` 及侧栏图标按钮
- 操作：增大按钮的 padding/min-size 到 44px

**2.2 FINDING-004：品牌字体**
- 文件：品牌名 "ARMfn" 出现的组件（登录页、侧栏头部）
- 操作：添加 `font-display`（对应 DM Sans）class

**2.3 FINDING-005：标题层级**
- 文件：涉及 H2/H3 的组件
- 操作：用 DESIGN.md 字号阶梯拉开层级差距

**2.4 FINDING-017：零动效**
- 文件：所有交互元素
- 操作：添加 `transition-colors duration-150` 到按钮、列表项、卡片的 hover 状态

**2.5 FINDING-019：隐藏 Agent slug**
- 文件：`src/components/chat/ConversationList.tsx`
- 操作：只显示 Agent 显示名，不展示内部 ID（如 yangwenxing-sales-bp）

**2.6 FINDING-001：会话列表分隔线**
- 文件：`src/components/chat/ConversationList.tsx`
- 操作：每个列表项之间添加 `border-bottom: 1px solid var(--border)`

---

### Step 3：内联颜色清理 + 深色模式适配

**目标：** 把散落在组件中的内联 hex 颜色统一替换为 CSS 变量，确保深色模式下所有组件正常。

**3.1 内联颜色迁移**
- 搜索所有 `style={{ color: "#...` 和 `style={{ background: "#...` 的用法
- 逐个替换为 Tailwind class（`text-primary`、`bg-surface` 等）
- 重点组件：ConversationList、MessageBubble、ChatInput、Markdown 样式

**3.2 深色模式适配**
- 检查所有组件在 `.dark` 模式下的渲染效果
- Markdown 代码块的高亮主题需要深色版本
- Ghost 按钮深色模式下添加 `rgba(255,255,255,0.06)` 底色

**3.3 深色模式切换入口**
- 在侧栏用户头像区域或顶部导航添加切换按钮

---

### Step 4：验证

**目标：** 用工具化的方式验证设计系统落地效果。

**4.1 回归审计**
- 运行 `/design-review --regression`
- 对比 `design-baseline.json`，输出分数变化

**4.2 功能验证**
- `npm run build` 无报错
- `npm run test` 全部通过
- 浅色/深色模式切换正常
- 移动端布局不破坏

**4.3 视觉验证**
- 用 browse 工具截图对比 before/after
- 检查所有语义色状态（成功/错误/警告/信息）显示正确

---

## 执行策略

- Step 1 和 Step 2 可以在同一个会话中完成（预计 30 分钟）
- Step 3 工作量最大（内联颜色散落在多个文件），建议用并行 Agent 处理
- Step 4 在每个 Step 完成后都跑一次快速验证，最后跑完整回归

## 风险点

1. **内联颜色替换可能遗漏**：需要全局搜索，不能靠记忆
2. **Markdown 代码高亮的深色主题**：可能需要引入额外的 highlight.js 主题
3. **第三方组件样式**：如果有 UI 库组件不支持 CSS 变量，需要 override
