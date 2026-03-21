# 执行计划: ChatBoxPage 与新 Tab 系统集成

## 进度总览

| 步骤 | 描述 | 状态 |
|------|------|------|
| 1 | 检查 WorkbenchApp 是否支持 ref | 🕐 pending |
| 2 | 为 WorkbenchApp 添加 ref 支持（如需要） | 🕐 pending |
| 3 | 重构 ChatBoxPage 使用 WorkbenchAppWrapper | 🕐 pending |
| 4 | 更新组件引用处理逻辑 | 🕐 pending |
| 5 | 测试构建和类型检查 | 🕐 pending |
| 6 | 更新导出文件 | 🕐 pending |

---

## 步骤 1: 检查 WorkbenchApp 是否支持 ref

**描述**: 检查 WorkbenchApp 组件当前是否支持通过 ref 暴露方法

**依赖文档**:
- `src/workbench/components/WorkbenchApp.tsx` - WorkbenchApp 实现

**任务清单**:
1. 读取 WorkbenchApp 源码
2. 检查是否使用了 forwardRef
3. 检查是否暴露了 openTab 等方法
4. 确定是否需要添加 ref 支持

**产出**: 确认是否需要添加 ref 支持

---

## 步骤 2: 为 WorkbenchApp 添加 ref 支持（如需要）

**描述**: 如果 WorkbenchApp 不支持 ref，添加 forwardRef 支持并暴露必要的方法

**依赖文档**:
- `design.md` - 第 3.2 节"组件引用处理"

**任务清单**:
1. 定义 WorkbenchAppRef 接口
2. 使用 forwardRef 包装 WorkbenchApp
3. 使用 useImperativeHandle 暴露方法
4. 更新 WorkbenchAppWrapper（如果需要）

**需要暴露的方法**:
```typescript
export interface WorkbenchAppRef {
  openTab: (componentName: string, params?: Record<string, unknown>) => string;
  showListView: () => void;
}
```

**产出**:
- 更新后的 WorkbenchApp.tsx
- 支持外部调用 openTab 方法

---

## 步骤 3: 重构 ChatBoxPage 使用 WorkbenchAppWrapper

**描述**: 重构 ChatBoxPage.tsx，使用新的 WorkbenchAppWrapper 替代旧的组合

**依赖文档**:
- `src/pages/ChatBoxPage.tsx` - 当前的 ChatBoxPage 实现
- `design.md` - 第 3 节"实现细节"

**任务清单**:
1. 更新导入语句
   - 移除 `WorkbenchContainer` 和 `ComponentList`
   - 添加 `WorkbenchAppWrapper` 和 `WorkbenchAppRef`
2. 移除不再需要的状态
   - 移除 `selectedComponent` 状态
   - 移除 `workbenchKey` 状态
   - 保留 `showWorkbench` 和面板相关状态
3. 添加 workbenchRef
4. 更新 JSX 结构
   - 移除 ComponentList 部分
   - 用 WorkbenchAppWrapper 替换 WorkbenchContainer
5. 传递正确的 props
   - hostConfig
   - className（如需要）

**产出**:
- 重构后的 ChatBoxPage.tsx

---

## 步骤 4: 更新组件引用处理逻辑

**描述**: 更新 handleComponentReference 以使用新的 Tab 系统

**依赖文档**:
- `design.md` - 第 3.2 节"组件引用处理"

**任务清单**:
1. 修改 handleComponentReference 实现
2. 使用 workbenchRef.current?.openTab()
3. 确保工作台可见
4. 测试从聊天输入中引用组件

**产出**:
- 更新后的 handleComponentReference

---

## 步骤 5: 测试构建和类型检查

**描述**: 运行构建和类型检查，确保没有错误

**任务清单**:
1. 运行 TypeScript 类型检查：`npm run type-check` 或 `tsc --noEmit`
2. 运行 ESLint 检查：`npm run lint`
3. 运行构建：`npm run build`
4. 修复所有错误和警告

**产出**:
- 构建成功的确认
- 错误和警告的修复记录

---

## 步骤 6: 更新导出文件

**描述**: 确保所有新导出的类型和组件都已正确导出

**依赖文档**:
- `src/workbench/components/index.ts` - 组件导出
- `src/workbench/index.ts` - 模块导出

**任务清单**:
1. 检查 WorkbenchAppWrapper 是否已导出
2. 检查 WorkbenchAppRef 是否已导出
3. 如需要，更新导出文件

**产出**:
- 更新后的导出文件（如需要）

---

## 执行记录

### 2026-02-08 20:30
- 创建工作空间: `docs/workspace/26020820-chatbox-integration/`
- 完成 design.md 设计方案
- 完成 plan.md 执行计划

---
*创建时间: 2026-02-08 20:30*
