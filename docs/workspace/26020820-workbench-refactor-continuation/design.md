# Workbench 重大重构 - 剩余步骤设计文档

## 概述

本设计文档描述 Workbench 重大重构的剩余步骤（步骤 6-9）。前 5 个步骤已经完成核心类型定义、Tab 管理逻辑、基础组件实现。

## 已完成工作

1. ✅ 核心类型定义 (`src/workbench/types/`)
   - `tab.ts` - Tab 数据模型
   - `component-list.ts` - 组件列表类型
   - `storage.ts` - 存储类型

2. ✅ 核心逻辑实现 (`src/workbench/core/`)
   - `tab-manager.ts` - Tab 管理器
   - `tab-reducer.ts` - 状态管理 Reducer
   - `tab-context.tsx` - React Context

3. ✅ 存储层 (`src/workbench/storage/`)
   - `index.ts` - LocalStorage 封装

4. ✅ UI 组件 (`src/workbench/components/`)
   - `TabBar.tsx` - 标签栏
   - `TabContent.tsx` - 标签内容
   - `ComponentListView.tsx` - 组件列表视图
   - `ComponentCard.tsx` - 组件卡片
   - `SearchInput.tsx` - 搜索输入
   - `CategoryFilter.tsx` - 分类筛选

## 待完成工作

### 步骤 6: WorkbenchContainer 重构

**目标**: 创建新的 `WorkbenchContainer` 组件，集成所有新组件

**功能需求**:
1. 使用 `TabContext` 提供的状态管理
2. 集成 `TabBar` 和 `TabContent`
3. 集成 `ComponentListView` 作为默认视图（无 tab 时显示）
4. 处理空状态（无 tabs 时显示组件列表）
5. 支持 tab 切换和关闭
6. 支持从组件列表打开新组件

**技术要点**:
- 使用 `useWorkbench()` hook 获取状态和操作
- 根据 `state.mode` 决定显示列表视图或组件视图
- 根据 `state.activeTabId` 显示对应组件内容
- 保持与原有 `WorkbenchContainer` 的 Shadow DOM 隔离特性

### 步骤 7: 持久化存储完善

**目标**: 完善 TabContext 中的存储集成

**功能需求**:
1. Tab 状态保存和恢复
2. 用户偏好设置（收藏、最近使用）
3. 显示选项（搜索关键词、分类筛选）

**技术要点**:
- 在 TabContext 的 useEffect 中保存状态变化
- 组件加载时从 localStorage 恢复状态
- 防抖存储以避免频繁写入

### 步骤 8: 集成测试和调试

**目标**: 确保所有功能正常工作

**测试项目**:
1. Tab 切换、关闭功能
2. 组件列表展示
3. 搜索和筛选功能
4. 单例/多例模式
5. 持久化存储
6. 空状态处理

**调试方法**:
- 在浏览器中手动测试
- 使用 React DevTools 查看状态
- 检查 localStorage 中的数据

### 步骤 9: 文档更新

**目标**: 更新项目文档

**更新内容**:
1. `docs/architecture/workbench.md` - 更新架构文档
2. `docs/guides/component-development.md` - 更新开发指南

## 架构设计

### 组件层次结构

```
WorkbenchProvider (Context)
└── WorkbenchContainer (主容器)
    ├── TabBar (标签栏)
    │   ├── TabItem (标签项)
    │   └── AddButton (添加按钮)
    ├── TabContent (标签内容区)
    │   └── ComponentInstance (组件实例)
    └── ComponentListView (组件列表视图)
        ├── SearchBar (搜索栏)
        ├── CategoryFilter (分类筛选)
        └── ComponentCard (组件卡片)
```

### 状态流

```
User Action → Context Function → TabManager → Reducer → State Update → UI Re-render
                                      ↓
                               Storage Save
```

## 技术决策

1. **保留原有 WorkbenchContainer**: 原有的 `WorkbenchContainer` 用于单个组件实例的 Shadow DOM 隔离，新组件命名为 `WorkbenchApp` 或重构现有组件

2. **状态管理**: 使用 React Context + useReducer，与 TabManager 配合

3. **持久化**: 使用 localStorage，通过 `workbenchStorage` 统一管理

4. **组件加载**: 保留原有的 Host/Loader 机制，在新容器中集成

## 实现优先级

1. **高优先级**: 步骤 6（WorkbenchContainer 重构）- 核心功能
2. **中优先级**: 步骤 7（存储完善）- 用户体验
3. **中优先级**: 步骤 8（测试调试）- 质量保证
4. **低优先级**: 步骤 9（文档更新）- 可以后续补充

## 风险和注意事项

1. **向后兼容**: 需要确保不破坏现有功能
2. **性能**: 大量 tabs 时的性能问题
3. **内存泄漏**: 组件卸载时正确清理
4. **Edge Cases**: 无 tabs、所有 tabs 都关闭等情况
