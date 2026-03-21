# 执行计划: Workbench 重大重构

## 进度总览

| 步骤 | 描述 | 状态 |
|------|------|------|
| 1 | 需求分析和设计文档 | ✅ completed |
| 2 | 核心数据结构和类型定义 | ✅ completed |
| 3 | Tab 管理逻辑实现 | ✅ completed |
| 4 | TabBar 组件实现 | ✅ completed |
| 5 | ComponentListView 组件实现 | ✅ completed |
| 6 | WorkbenchContainer 重构 | 🕐 pending |
| 7 | 持久化存储实现 | 🕐 pending |
| 8 | 集成测试和调试 | 🕐 pending |
| 9 | 文档更新 | 🕐 pending |
| 5 | ComponentListView 组件实现 | 🕐 pending |
| 6 | WorkbenchContainer 重构 | 🕐 pending |
| 7 | 持久化存储实现 | 🕐 pending |
| 8 | 集成测试和调试 | 🕐 pending |
| 9 | 文档更新 | 🕐 pending |

---

## 步骤 1: 需求分析和设计文档

**描述**: 完成需求分析和设计方案文档编写

**产出**:
- `design.md` - 完整的设计方案文档
- `plan.md` - 本执行计划文档

**状态**: ✅ 已完成

---

## 步骤 2: 核心数据结构和类型定义

**描述**: 定义所有需要的数据类型和接口

**依赖文档**:
- `design.md` - 第 4 节"数据结构设计"

**任务清单**:
1. 创建 `src/workbench/types/tab.ts` - Tab 相关类型
2. 创建 `src/workbench/types/component-list.ts` - 组件列表相关类型
3. 更新 `src/workbench/types/component.ts` - 扩展组件信息类型
4. 创建 `src/workbench/types/storage.ts` - 存储相关类型

**产出**:
- 完整的 TypeScript 类型定义
- JSDoc 注释

---

## 步骤 3: Tab 管理逻辑实现

**描述**: 实现 TabManager 类和相关的 Reducer

**依赖文档**:
- `src/workbench/types/tab.ts` - Tab 类型定义
- `design.md` - 第 7.2 节"Tab 管理逻辑"

**任务清单**:
1. 创建 `src/workbench/core/tab-manager.ts` - TabManager 类
2. 创建 `src/workbench/core/tab-reducer.ts` - Tab 状态管理 Reducer
3. 创建 `src/workbench/core/tab-context.tsx` - React Context
4. 添加单元测试

**核心功能**:
- `openTab(componentName, params)` - 打开 Tab
- `closeTab(tabId)` - 关闭 Tab
- `switchTab(tabId)` - 切换 Tab
- `getTab(tabId)` - 获取 Tab 信息
- 支持 singleton/multiple 模式
- 支持实例数量限制

**产出**:
- `TabManager` 类
- `workbenchReducer` 函数
- `WorkbenchContext` React Context
- 单元测试文件

---

## 步骤 4: TabBar 组件实现

**描述**: 实现 Tab 栏 UI 组件

**依赖文档**:
- `src/workbench/types/tab.ts` - Tab 类型定义
- `design.md` - 第 3.2 节"Tab 交互设计"

**任务清单**:
1. 创建 `src/workbench/components/TabBar.tsx`
2. 实现 Tab 切换交互
3. 实现 Tab 关闭交互
4. 实现"新建 Tab"按钮
5. 添加样式（使用 Tailwind CSS）
6. 添加动画效果（切换、关闭）

**UI 特性**:
- 显示所有打开的 Tab
- 高亮当前激活的 Tab
- Tab 标题截断（过长的标题）
- 关闭按钮（根据 `closable` 属性）
- 新建 Tab 按钮
- 响应式布局（Tab 过多时支持滚动）

**产出**:
- `TabBar.tsx` 组件
- 样式文件（内联或 CSS module）

---

## 步骤 5: ComponentListView 组件实现

**描述**: 实现组件列表视图

**依赖文档**:
- `src/workbench/registry/client.ts` - 组件注册表客户端
- `design.md` - 第 3.1.1 节"组件列表视图"

**任务清单**:
1. 创建 `src/workbench/components/ComponentListView.tsx`
2. 创建 `src/workbench/components/ComponentCard.tsx` - 组件卡片子组件
3. 创建 `src/workbench/components/SearchInput.tsx` - 搜索框子组件
4. 创建 `src/workbench/components/CategoryFilter.tsx` - 分类筛选子组件
5. 实现搜索功能
6. 实现分类筛选功能
7. 实现收藏功能
8. 显示最近使用的组件

**UI 特性**:
- 组件卡片网格布局
- 搜索框（实时搜索）
- 分类下拉筛选
- 收藏按钮（星标）
- 最近使用区域
- 响应式布局（自适应不同屏幕尺寸）

**产出**:
- `ComponentListView.tsx` 组件
- `ComponentCard.tsx` 子组件
- `SearchInput.tsx` 子组件
- `CategoryFilter.tsx` 子组件

---

## 步骤 6: WorkbenchContainer 重构

**描述**: 重构 WorkbenchContainer 以支持 Tab 系统

**依赖文档**:
- `src/workbench/components/WorkbenchContainer.tsx` - 现有实现
- `src/workbench/core/tab-context.tsx` - Tab Context
- `design.md` - 第 7.1.1 节"WorkbenchContainer 重构"

**任务清单**:
1. 创建新的 `WorkbenchContainerV2.tsx`（或直接重构现有文件）
2. 集成 TabContext
3. 实现视图模式切换（list/component）
4. 集成 TabBar 组件
5. 集成 ComponentListView 组件
6. 实现 TabContent 区域
7. 保持与现有 API 的兼容性

**核心逻辑**:
```typescript
state.mode === 'list'
  ? <ComponentListView onSelect={(name) => openTab(name)} />
  : (
      <>
        <TabBar ... />
        <TabContent>
          {tabs.map(tab => (
            <TabPane key={tab.id} active={tab.id === activeTabId}>
              <ComponentView componentUrl={tab.manifestUrl} />
            </TabPane>
          ))}
        </TabContent>
      </>
    )
```

**产出**:
- 重构后的 `WorkbenchContainer.tsx`
- 向后兼容的 props 接口

---

## 步骤 7: 持久化存储实现

**描述**: 实现 localStorage 持久化存储

**依赖文档**:
- `design.md` - 第 7.3 节"持久化存储"

**任务清单**:
1. 创建 `src/workbench/storage/index.ts`
2. 实现存储读写逻辑
3. 集成到 TabContext
4. 实现最近使用记录
5. 实现收藏功能
6. 实现 Tab 状态保存和恢复（可选）

**存储内容**:
- `recentComponents`: 最近使用的组件列表（最多 10 个）
- `favoriteComponents`: 收藏的组件列表
- `savedTabs`: 保存的 Tab 配置（可选，用于工作区恢复）

**产出**:
- `workbenchStorage` 模块
- 与 TabContext 的集成

---

## 步骤 8: 集成测试和调试

**描述**: 进行完整的集成测试和调试

**依赖文档**:
- 所有已实现的组件和模块

**任务清单**:
1. 单元测试
   - TabManager 测试
   - TabReducer 测试
   - Storage 测试
2. 集成测试
   - Tab 生命周期测试
   - 组件列表视图功能测试
   - 多 Tab 切换测试
   - 单例/多例模式测试
3. E2E 测试（手动）
   - 完整用户流程测试
   - 边界情况测试
4. 性能测试
   - 组件列表加载时间
   - Tab 切换响应时间
   - 内存占用测试
5. 兼容性测试
   - 测试现有组件（file-browser, hello-world）
   - 跨浏览器测试

**测试用例**:
- 打开应用，默认显示组件列表
- 点击组件卡片，打开新 Tab
- 单例组件只能打开一个实例
- 多例组件可以打开多个实例
- 切换 Tab，组件状态保持
- 关闭 Tab，返回组件列表
- 搜索组件，结果正确过滤
- 收藏组件，星标状态保持
- 刷新页面，最近使用记录保持

**产出**:
- 测试报告
- Bug 修复清单
- 性能优化建议

---

## 步骤 9: 文档更新

**描述**: 更新相关文档

**依赖文档**:
- `docs/architecture/workbench.md` - 架构文档
- `docs/guides/component-development.md` - 组件开发指南

**任务清单**:
1. 更新架构文档
   - 添加 Tab 系统架构说明
   - 更新组件交互流程图
2. 更新组件开发指南
   - 添加 tabStrategy 配置说明
   - 添加最佳实践
3. 更新 API 文档
   - 添加 Tab 相关 API
   - 添加存储 API
4. 创建用户指南（可选）
   - 如何使用 Tab 系统
   - 如何管理组件

**产出**:
- 更新后的架构文档
- 更新后的组件开发指南
- API 参考文档

---

## 执行记录

### 2026-02-08 19:00
- 创建工作空间: `docs/workspace/26020819-workbench-redesign/`
- 完成 design.md 设计文档
- 完成 plan.md 执行计划

### 2026-02-08 20:15
- ✅ 完成步骤 2: 核心数据结构和类型定义
  - 创建 `src/workbench/types/tab.ts` - Tab 相关类型（Tab, TabStrategy, TabEvent 等）
  - 创建 `src/workbench/types/component-list.ts` - 组件列表相关类型（ComponentInfo, ComponentFilter 等）
  - 创建 `src/workbench/types/storage.ts` - 存储相关类型（WorkbenchStorage, UserPreferences 等）
  - 更新 `src/workbench/types/component.ts` - 扩展 ComponentManifest 支持 tabStrategy 和 category
  - 更新 `src/workbench/types/index.ts` - 导出所有新类型

### 2026-02-08 20:30
- ✅ 完成步骤 3: Tab 管理逻辑实现
  - 创建 `src/workbench/core/tab-manager.ts` - TabManager 类，实现 Tab 生命周期管理
    - openTab/closeTab/switchTab/getTab 等核心方法
    - 支持 singleton/multiple 模式
    - 支持实例数量限制
    - 事件系统（tab:opened, tab:closed, tab:switched 等）
  - 创建 `src/workbench/core/tab-reducer.ts` - React Reducer 状态管理
    - WorkbenchState 类型定义
    - workbenchReducer 函数实现
    - workbenchActions action creators
  - 创建 `src/workbench/core/tab-context.tsx` - React Context
    - WorkbenchProvider 组件
    - useWorkbench/useTabOperations/useComponentOperations hooks
    - 与 localStorage 集成
  - 创建 `src/workbench/storage/index.ts` - LocalStorage 持久化
    - workbenchStorage 模块
    - 最近使用记录管理
    - 收藏功能管理
  - 更新 `src/workbench/core/index.ts` 和 `src/workbench/index.ts` - 导出新模块

### 2026-02-08 21:00
- ✅ 完成步骤 4: TabBar 组件实现
  - 创建 `src/workbench/components/TabBar.tsx` - Tab 栏组件
    - 显示所有打开的 Tab
    - 支持 Tab 切换和关闭
    - 新建 Tab 按钮
    - 滚动支持（Tab 过多时）
    - 加载状态和错误状态指示器
    - Pinned 状态指示
  - 创建 `src/workbench/components/TabContent.tsx` - Tab 内容区域组件
    - TabPane 子组件（单个 Tab 内容）
    - TabEmptyState 空状态组件
    - 支持保持非活跃 Tab 挂载选项
  - 更新 `src/workbench/components/index.ts` - 导出新组件

- ✅ 完成步骤 5: ComponentListView 组件实现
  - 创建 `src/workbench/components/ComponentCard.tsx` - 组件卡片
    - 显示组件图标、名称、描述、版本
    - 收藏按钮
    - 使用统计显示
    - 标签显示
    - ComponentCardGrid 网格布局
  - 创建 `src/workbench/components/SearchInput.tsx` - 搜索输入组件
    - 防抖搜索（300ms）
    - 清除按钮
    - ESC 键清除
    - SearchBar 组合组件
  - 创建 `src/workbench/components/CategoryFilter.tsx` - 分类筛选组件
    - Dropdown 下拉样式
    - Tabs 标签页样式
    - Chips 芯片样式
  - 创建 `src/workbench/components/ComponentListView.tsx` - 主组件列表视图
    - 搜索和筛选功能
    - 最近使用组件区域
    - 收藏组件区域
    - 所有组件列表
    - 空状态处理
    - ComponentSection 和 EmptyState 子组件
  - 更新 `src/workbench/components/index.ts` - 导出新组件

---
*创建时间: 2026-02-08 19:00*
