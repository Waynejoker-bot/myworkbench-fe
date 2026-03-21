# ChatBoxPage 与新 Tab 系统集成方案

## 1. 问题背景

### 1.1 当前状态
之前的 agent 已经完成了以下工作：
- 创建了新的 `WorkbenchApp` 组件和 Tab 系统
- 创建了 `ComponentListView`、`TabBar`、`TabContent` 等组件
- 创建了 `TabManager` 和 `WorkbenchContext`
- 实现了持久化存储

### 1.2 遗留问题
**ChatBoxPage 仍在使用旧的实现**：
- 使用 `WorkbenchContainer` + `ComponentList` 组合
- 没有集成新的 Tab 系统
- 没有使用 `WorkbenchApp` 组件

### 1.3 目标
完成 ChatBoxPage 与新 Tab 系统的集成，使其能够：
- 使用新的 `WorkbenchApp` 组件
- 利用 Tab 管理功能
- 保持与 ChatBox 的现有功能兼容

---

## 2. 技术方案

### 2.1 WorkbenchApp 组件分析

根据 `src/workbench/components/WorkbenchApp.tsx`，组件提供了以下接口：

```typescript
export interface WorkbenchAppProps {
  /** Host 配置 */
  hostConfig?: Partial<Omit<HostConfig, 'messageAPI' | 'sessionAPI' | 'inputAPI'>>;

  /** 是否在组件加载时自动加载组件列表（默认：true） */
  autoLoadComponents?: boolean;

  /** 额外的 CSS 类名 */
  className?: string;

  /** TabBar 额外的 CSS 类名 */
  tabBarClassName?: string;

  /** 内容区域额外的 CSS 类名 */
  contentClassName?: string;
}
```

还有一个包装组件：

```typescript
export interface WorkbenchAppWrapperProps extends WorkbenchAppProps {
  /** 是否从存储加载状态（默认：true） */
  loadFromStorage?: boolean;
}
```

### 2.2 当前 ChatBoxPage 实现

当前的 ChatBoxPage 特点：
- 有左侧会话列表（ChatSidebar）
- 中间是聊天区域（ChatMessages + ChatInput）
- 右侧是 Workbench 面板
  - 上部是组件选择器（ComponentList）
  - 下部是组件容器（WorkbenchContainer）
- 支持调整右侧面板宽度
- 可以显示/隐藏工作台

### 2.3 集成方案

#### 方案选择
**推荐：使用 WorkbenchAppWrapper**

原因：
1. `WorkbenchAppWrapper` 已经包含了 `WorkbenchProvider`
2. 自动处理状态持久化
3. 提供完整的 Tab 系统功能

#### 集成步骤

1. **替换组件导入**
   ```typescript
   // 旧
   import { WorkbenchContainer, ComponentList } from "@/workbench/components";

   // 新
   import { WorkbenchAppWrapper } from "@/workbench/components";
   import type { HostConfig } from "@/workbench";
   ```

2. **简化状态管理**
   - 移除 `selectedComponent` 状态（由 Tab 系统管理）
   - 移除 `workbenchKey` 状态（Tab 系统自动处理）
   - 保留 `showWorkbench` 控制面板显示

3. **更新 Host 配置**
   - 保持现有的 `hostConfig` 结构
   - 确保 `sessionId` 和 `selectedAgentId` 正确传递

4. **处理组件引用**
   - `handleComponentReference` 需要适配新的 Tab 系统
   - 使用 `openTab` 方法而不是切换组件

5. **导出更新**
   - 确保 `WorkbenchAppWrapper` 已导出
   - 确保类型已导出

---

## 3. 实现细节

### 3.1 状态变化

#### 移除的状态
```typescript
// 不再需要，由 Tab 系统管理
const [selectedComponent, setSelectedComponent] = useState<string>(DEFAULT_COMPONENT);
const [workbenchKey, setWorkbenchKey] = useState(0);
```

#### 保留的状态
```typescript
const [showWorkbench, setShowWorkbench] = useState(true);  // 控制面板显示
const [rightPanelWidth, setRightPanelWidth] = useState(560);  // 控制面板宽度
```

### 3.2 组件引用处理

旧的实现：
```typescript
const handleComponentReference = useCallback((componentName: string, _remainingText: string) => {
  setSelectedComponent(componentName);
  setWorkbenchKey(prev => prev + 1);
  setShowWorkbench(true);
}, []);
```

需要改为使用 Tab 系统的 API。但问题是 `ChatBoxPage` 不在 `WorkbenchProvider` 内部，需要找到一种方式来调用 `openTab`。

**解决方案：通过 ref 暴露 openTab 方法**

```typescript
// 在 WorkbenchApp 中添加 ref 支持
export interface WorkbenchAppRef {
  openTab: (componentName: string, params?: Record<string, unknown>) => string;
  showListView: () => void;
}

export const WorkbenchApp = forwardRef<WorkbenchAppRef, WorkbenchAppProps>(...)
```

然后在 ChatBoxPage 中：
```typescript
const workbenchRef = useRef<WorkbenchAppRef>(null);

const handleComponentReference = useCallback((componentName: string, _remainingText: string) => {
  workbenchRef.current?.openTab(componentName);
  setShowWorkbench(true);
}, []);
```

### 3.3 Host 配置传递

保持现有的 Host 配置结构，但需要确保正确传递：

```typescript
const hostConfig: Partial<Omit<HostConfig, 'messageAPI' | 'sessionAPI' | 'inputAPI'>> = useMemo(
  () => ({
    context: {
      sessionId: activeConversationId || '',
      currentAgent: selectedAgentId,
      metadata: {}
    },
    security: {
      allowedOrigins: ['*'],
      allowedPermissions: ['*']
    }
  }),
  [activeConversationId, selectedAgentId]
);
```

---

## 4. 兼容性考虑

### 4.1 向后兼容
- 保持现有的 UI 布局不变
- 保持现有的交互行为不变
- 只是内部实现从旧的组合切换到新的 Tab 系统

### 4.2 用户体验
- 组件列表视图现在由 Tab 系统管理
- 默认显示组件列表（当没有 Tab 时）
- 用户可以打开多个组件 Tab
- 用户可以在 Tab 间切换

---

## 5. 验收标准

### 5.1 功能验收
- [ ] ChatBoxPage 正确使用 WorkbenchAppWrapper
- [ ] 组件列表视图作为默认入口显示
- [ ] 点击组件卡片打开新 Tab
- [ ] Tab 栏正常显示和交互
- [ ] 可以从聊天输入中引用组件
- [ ] 面板显示/隐藏功能正常
- [ ] 面板宽度调整功能正常
- [ ] Host 配置正确传递

### 5.2 代码验收
- [ ] 移除了不再需要的状态
- [ ] 移除了对旧组件的导入
- [ ] 代码风格一致
- [ ] TypeScript 类型检查通过
- [ ] 构建成功

---

## 6. 风险评估

### 6.1 潜在问题
1. **ref API 不存在**：WorkbenchApp 可能没有暴露 ref API
   - **缓解**：需要添加 forwardRef 支持

2. **Host 配置变化**：新的 WorkbenchApp 可能需要不同的 Host 配置
   - **缓解**：检查 WorkbenchApp 的实现，确保兼容

3. **状态持久化冲突**：可能有多个 WorkbenchApp 实例
   - **缓解**：确保使用唯一的 storage key

### 6.2 回退方案
如果集成出现问题，可以：
1. 暂时保持旧的实现
2. 逐步迁移功能
3. 或创建一个新的页面来测试新实现

---

**文档版本**: 1.0.0
**创建日期**: 2026-02-08
**作者**: ZC & Claude
