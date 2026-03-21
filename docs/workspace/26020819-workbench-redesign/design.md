# Workbench 重大重构 - 设计方案

## 1. 项目概述

### 1.1 背景
当前 Workbench 系统已实现基础的动态组件加载功能，支持 Shadow DOM 隔离和双向通信。但在实际使用中存在以下问题：

1. **组件发现困难**：用户无法直接看到所有可用组件，需要通过下拉选择器
2. **显示区域受限**：组件被限制在固定宽度的小框中，无法充分利用屏幕空间
3. **多任务处理不便**：无法同时打开多个组件并在其间快速切换

### 1.2 目标
打造一个以组件为中心的工作台系统，提供：
- 组件列表页作为入口视图
- 全屏组件加载体验
- 多 Tab 支持以便于多任务处理

### 1.3 设计原则
- **渐进增强**：保持现有功能不变，逐步添加新特性
- **向后兼容**：不破坏现有组件和 API
- **用户体验优先**：流畅的交互和直观的界面
- **可扩展性**：为未来功能预留空间

---

## 2. 整体架构设计

### 2.1 架构概览

```
┌────────────────────────────────────────────────────────────────────────┐
│                         ChatBoxPage                                     │
├──────────────┬──────────────────────────┬─────────────────────────────┤
│              │                          │                             │
│  会话列表     │       ChatBox           │        Workbench            │
│  (Sidebar)   │      (Messages)         │       (Container)           │
│              │                          │                             │
└──────────────┴──────────────────────────┴─────────────────────────────┘

                              Workbench 内部结构
┌────────────────────────────────────────────────────────────────────────┐
│                           WorkbenchContainer                            │
├───────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    Tab Bar                                       │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────┐ ┌──────┐           │  │
│  │  │ File    │ │ Todo    │ │ Calc    │ │  +  │ │ ...  │           │  │
│  │  │ Browser │ │ List    │ │         │ │     │ │      │           │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────┘ └──────┘           │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                                                                 │  │
│  │    Tab Content Area                                             │  │
│  │    ┌───────────────────────────────────────────────────────┐   │  │
│  │    │                                                       │   │  │
│  │    │   Component View / Component List View                │   │  │
│  │    │                                                       │   │  │
│  │    │                                                       │   │  │
│  │    └───────────────────────────────────────────────────────┘   │  │
│  │                                                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 WorkbenchContainer (重构)
**职责扩展**：
- 管理 Tab 状态（打开、关闭、切换）
- 管理 Tab 内容（组件列表视图 / 组件视图）
- 处理 Tab 限制策略（单例 / 多例）

**新增状态**：
```typescript
interface WorkbenchState {
  mode: 'list' | 'component';  // 当前显示模式

  // Tab 管理
  tabs: Tab[];
  activeTabId: string | null;

  // 组件列表
  components: ComponentInfo[];

  // 历史和收藏
  recentComponents: string[];  // 最近使用的组件
  favoriteComponents: string[]; // 收藏的组件
}
```

#### 2.2.2 TabBar (新增)
**职责**：
- 显示所有打开的 Tab
- 处理 Tab 切换
- 处理 Tab 关闭
- 显示"新建 Tab"按钮

**接口**：
```typescript
interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
}

interface Tab {
  id: string;
  title: string;
  componentName: string;
  icon?: string;
  state: 'loading' | 'ready' | 'error';
  closable: boolean;  // 是否允许关闭
}
```

#### 2.2.3 ComponentListView (新增)
**职责**：
- 显示所有可用组件
- 支持搜索和筛选
- 显示最近使用和收藏的组件
- 处理组件选择

**功能特性**：
- 组件卡片展示（图标、名称、描述）
- 分类筛选（按类别、标签）
- 搜索功能
- 最近使用记录
- 收藏功能

#### 2.2.4 ComponentView (重构现有 WorkbenchContainer)
**职责**：
- 加载和显示单个组件
- 管理组件生命周期
- 处理组件通信

**调整**：
- 移除头部和关闭按钮（由 TabBar 统一管理）
- 自动适应容器尺寸
- 保持现有通信机制

---

## 3. UI/UX 设计

### 3.1 视图模式

#### 3.1.1 组件列表视图 (默认)
当 Workbench 没有打开任何 Tab 时，显示组件列表：

```
┌─────────────────────────────────────────────────────────┐
│  Workbench                                    [ 筛选 ]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔍 搜索组件...                              [ 收藏 ]   │
│                                                         │
│  ━━━━━━━ 最近使用 ━━━━━━━                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ 📁 File  │  │ ✅ Todo  │  │ 🧮 Calc  │            │
│  │ Browser  │  │ List     │  │          │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                         │
│  ━━━━━━━ 所有组件 ━━━━━━━                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ 📊 Chart │  │ 📝 Note  │  │ 🎨 Draw  │            │
│  │ Viewer   │  │ Editor   │  │          │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ 🌐 Web   │  │ 📈 Stats │  │ ⚙️ Config│            │
│  │ Preview  │  │          │  │          │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 3.1.2 组件视图 (Tab 打开时)
显示组件内容和 Tab 栏：

```
┌─────────────────────────────────────────────────────────┐
│ 📁 File Browser │ ✅ Todo List │ 🧮 Calculator │ ➕ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [组件内容全屏显示]                                      │
│                                                         │
│  /path/to/file                                          │
│  ├── folder1                                            │
│  ├── folder2                                            │
│  └── file.txt                                           │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Tab 交互设计

#### 3.2.1 Tab 打开
1. 用户在组件列表中点击组件卡片
2. 系统检查组件的 Tab 策略：
   - **单例模式**：如果已打开该组件的 Tab，切换到该 Tab
   - **多例模式**：创建新的 Tab 实例
3. 新 Tab 显示加载状态
4. 组件加载完成后显示内容

#### 3.2.2 Tab 切换
- 点击 Tab 标题切换到对应组件
- 未激活的 Tab 保持状态（不卸载）
- 切换时触发组件的 `onVisibilityChange` 回调

#### 3.2.3 Tab 关闭
- 点击 Tab 上的关闭按钮（×）
- 如果是最后一个 Tab，关闭后返回组件列表视图
- 关闭前触发组件的 `unmount` 清理

#### 3.2.4 Tab 限制策略

通过 manifest 配置：

```json
{
  "name": "file-browser",
  "tabStrategy": {
    "mode": "singleton",  // singleton | multiple
    "maxInstances": 1     // 当 mode=multiple 时，最大实例数
  }
}
```

**示例**：
- `file-browser`: `singleton` - 只能开一个
- `todolist`: `multiple` - 可以开多个
- `calculator`: `multiple` + `maxInstances: 3` - 最多 3 个

---

## 4. 数据结构设计

### 4.1 Tab 数据模型

```typescript
interface Tab {
  // 基础信息
  id: string;                    // Tab 唯一 ID
  componentName: string;         // 组件名称
  instanceId: string;            // 组件实例 ID（用于多例模式）

  // 显示信息
  title: string;                 // Tab 显示标题
  icon?: string;                 // Tab 图标

  // 状态
  status: 'loading' | 'ready' | 'error';
  error?: Error;

  // 配置
  closable: boolean;             // 是否允许关闭
  pinned: boolean;               // 是否固定（不可关闭）

  // 组件参数
  params: Record<string, unknown>;

  // 组件实例引用
  componentInstance?: any;

  // 时间戳
  createdAt: number;
  lastActivatedAt: number;
}
```

### 4.2 组件信息扩展

```typescript
interface ComponentInfo {
  // 现有字段
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;

  // 新增字段
  category?: string;             // 组件分类
  tags?: string[];               // 标签

  // Tab 策略
  tabStrategy: {
    mode: 'singleton' | 'multiple';
    maxInstances?: number;
  };

  // 统计信息
  stats?: {
    usageCount: number;          // 使用次数
    lastUsedAt: number;          // 最后使用时间
  };

  // 资源
  manifestUrl: string;
  entryUrl: string;
}
```

### 4.3 状态管理

使用 React Context + useReducer 管理 Workbench 状态：

```typescript
interface WorkbenchContextValue {
  state: WorkbenchState;

  // Tab 操作
  openTab: (componentName: string, params?: Record<string, unknown>) => string;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  getTab: (tabId: string) => Tab | undefined;

  // 组件列表操作
  loadComponents: () => Promise<void>;
  filterComponents: (query: string, category?: string) => ComponentInfo[];
  toggleFavorite: (componentName: string) => void;

  // 视图模式
  showListView: () => void;
  showComponentView: (tabId: string) => void;
}

type WorkbenchAction =
  | { type: 'SET_MODE'; payload: 'list' | 'component' }
  | { type: 'ADD_TAB'; payload: Tab }
  | { type: 'REMOVE_TAB'; payload: string }
  | { type: 'SWITCH_TAB'; payload: string }
  | { type: 'UPDATE_TAB_STATUS'; payload: { tabId: string; status: Tab['status'] } }
  | { type: 'SET_COMPONENTS'; payload: ComponentInfo[] }
  | { type: 'TOGGLE_FAVORITE'; payload: string };
```

---

## 5. API 扩展设计

### 5.1 组件注册表 API 扩展

#### 5.1.1 获取组件统计
```typescript
GET /api/market/stats
Response: {
  usageCount: number;
  lastUsedAt: number;
}
```

#### 5.1.2 更新使用统计
```typescript
POST /api/market/components/{name}/stats
Body: {
  action: 'use' | 'favorite' | 'unfavorite'
}
```

### 5.2 Host API 扩展

#### 5.2.1 Tab 相关 API（可选，供组件使用）
```typescript
interface HostTabAPI {
  // 获取当前 Tab ID
  getCurrentTabId: () => string;

  // 修改 Tab 标题
  setTabTitle: (title: string) => void;

  // 修改 Tab 图标
  setTabIcon: (icon: string) => void;

  // 请求关闭当前 Tab
  closeCurrentTab: () => void;
}
```

### 5.3 事件系统扩展

新增 Tab 相关事件：

```typescript
enum TabEvents {
  TAB_OPENED = 'tab:opened',
  TAB_CLOSED = 'tab:closed',
  TAB_SWITCHED = 'tab:switched',
  TAB_UPDATED = 'tab:updated',
}
```

---

## 6. Manifest 扩展设计

### 6.1 新增字段

```json
{
  "name": "my-component",
  "version": "1.0.0",
  "description": "组件描述",

  // 新增：Tab 策略
  "tabStrategy": {
    "mode": "singleton",        // singleton | multiple
    "maxInstances": 1,          // 多例模式下的最大实例数
    "defaultTitle": "{{name}}", // Tab 标题模板，支持 {{name}} {{version}} 等变量
    "allowClose": true          // 是否允许关闭
  },

  // 新增：分类和标签
  "category": "productivity",   // 组件分类
  "tags": ["files", "browser"], // 标签

  // 新增：默认视图模式
  "viewMode": "fullscreen",     // fullscreen | panel

  // 现有字段...
  "entry": "./index.js",
  "styles": ["./styles.css"],
  "capabilities": { ... }
}
```

### 6.2 分类规范

预定义分类：

| 分类 | 说明 | 示例组件 |
|------|------|----------|
| `productivity` | 生产力工具 | TodoList, NoteEditor |
| `files` | 文件相关 | FileBrowser, CodeEditor |
| `data` | 数据处理 | ChartViewer, DataGrid |
| `communication` | 通信相关 | ChatWidget, NotificationCenter |
| `utilities` | 实用工具 | Calculator, Converter |
| `developer` | 开发工具 | APITester, LogViewer |
| `media` | 媒体相关 | ImageViewer, AudioPlayer |

---

## 7. 实现方案

### 7.1 核心组件实现

#### 7.1.1 WorkbenchContainer 重构
```typescript
// src/workbench/components/WorkbenchContainer.tsx

export function WorkbenchContainer(props: WorkbenchContainerProps) {
  const [state, dispatch] = useReducer(workbenchReducer, initialState);

  // 根据 mode 渲染不同视图
  return (
    <div className="workbench-container">
      {state.mode === 'list' ? (
        <ComponentListView
          components={state.components}
          onSelect={(name) => openTab(name)}
        />
      ) : (
        <>
          <TabBar
            tabs={state.tabs}
            activeTabId={state.activeTabId}
            onSelect={switchTab}
            onClose={closeTab}
            onAdd={() => dispatch({ type: 'SET_MODE', payload: 'list' })}
          />
          <TabContent>
            {state.tabs.map(tab => (
              <TabPane key={tab.id} tab={tab} active={tab.id === state.activeTabId}>
                <ComponentView componentUrl={tab.manifestUrl} />
              </TabPane>
            ))}
          </TabContent>
        </>
      )}
    </div>
  );
}
```

#### 7.1.2 TabBar 实现
```typescript
// src/workbench/components/TabBar.tsx

export function TabBar({ tabs, activeTabId, onTabSelect, onTabClose, onTabAdd }: TabBarProps) {
  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onTabSelect(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-title">{tab.title}</span>
            {tab.closable && (
              <button
                className="tab-close"
                onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button className="tab-add" onClick={onTabAdd}>
          +
        </button>
      </div>
    </div>
  );
}
```

#### 7.1.3 ComponentListView 实现
```typescript
// src/workbench/components/ComponentListView.tsx

export function ComponentListView({ components, onSelect, recent, favorites }: ComponentListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredComponents = useMemo(() => {
    return components.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           c.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [components, searchQuery, selectedCategory]);

  return (
    <div className="component-list-view">
      <div className="search-bar">
        <SearchInput value={searchQuery} onChange={setSearchQuery} />
        <CategoryFilter value={selectedCategory} onChange={setSelectedCategory} />
      </div>

      {recent.length > 0 && (
        <Section title="最近使用">
          {recent.map(name => {
            const component = components.find(c => c.name === name);
            return component ? (
              <ComponentCard key={component.name} component={component} onSelect={onSelect} />
            ) : null;
          })}
        </Section>
      )}

      <Section title="所有组件">
        <div className="component-grid">
          {filteredComponents.map(component => (
            <ComponentCard key={component.name} component={component} onSelect={onSelect} />
          ))}
        </div>
      </Section>
    </div>
  );
}
```

### 7.2 Tab 管理逻辑

```typescript
// src/workbench/utils/tab-manager.ts

export class TabManager {
  private tabs: Map<string, Tab> = new Map();
  private componentStrategies: Map<string, TabStrategy> = new Map();

  // 打开 Tab
  openTab(componentName: string, params: Record<string, unknown>): string {
    const strategy = this.getTabStrategy(componentName);

    if (strategy.mode === 'singleton') {
      // 单例模式：检查是否已存在
      const existingTab = this.findTabByComponent(componentName);
      if (existingTab) {
        return existingTab.id;
      }
    } else if (strategy.maxInstances) {
      // 多例模式：检查实例数量限制
      const instanceCount = this.countTabsByComponent(componentName);
      if (instanceCount >= strategy.maxInstances) {
        throw new Error(`Maximum instances (${strategy.maxInstances}) reached for ${componentName}`);
      }
    }

    // 创建新 Tab
    const tab = this.createTab(componentName, params);
    this.tabs.set(tab.id, tab);
    return tab.id;
  }

  // 关闭 Tab
  closeTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.closable) {
      return;
    }

    // 清理组件实例
    if (tab.componentInstance) {
      tab.componentInstance.unmount();
    }

    this.tabs.delete(tabId);
  }

  // 切换 Tab
  switchTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.lastActivatedAt = Date.now();
    }
  }

  // 获取组件的 Tab 策略
  private getTabStrategy(componentName: string): TabStrategy {
    if (!this.componentStrategies.has(componentName)) {
      // 从 manifest 加载策略
      const manifest = this.loadManifest(componentName);
      this.componentStrategies.set(componentName, manifest.tabStrategy || {
        mode: 'multiple'
      });
    }
    return this.componentStrategies.get(componentName)!;
  }

  // 创建 Tab
  private createTab(componentName: string, params: Record<string, unknown>): Tab {
    return {
      id: uuid(),
      componentName,
      instanceId: uuid(),
      title: componentName,
      status: 'loading',
      closable: true,
      params,
      createdAt: Date.now(),
      lastActivatedAt: Date.now()
    };
  }

  // 查找组件的 Tab（单例模式用）
  private findTabByComponent(componentName: string): Tab | undefined {
    return Array.from(this.tabs.values()).find(
      tab => tab.componentName === componentName
    );
  }

  // 统计组件实例数量
  private countTabsByComponent(componentName: string): number {
    return Array.from(this.tabs.values()).filter(
      tab => tab.componentName === componentName
    ).length;
  }
}
```

### 7.3 持久化存储

使用 localStorage 保存用户偏好：

```typescript
// src/workbench/storage/storage.ts

interface WorkbenchStorage {
  // 最近使用的组件
  recentComponents: string[];

  // 收藏的组件
  favoriteComponents: string[];

  // Tab 状态（可选，用于恢复 Tab）
  savedTabs?: Tab[];
}

export const workbenchStorage = {
  get: (): WorkbenchStorage => {
    const data = localStorage.getItem('workbench-state');
    return data ? JSON.parse(data) : {
      recentComponents: [],
      favoriteComponents: []
    };
  },

  save: (state: Partial<WorkbenchStorage>) => {
    const current = workbenchStorage.get();
    const updated = { ...current, ...state };
    localStorage.setItem('workbench-state', JSON.stringify(updated));
  },

  addRecent: (componentName: string) => {
    const state = workbenchStorage.get();
    const recent = state.recentComponents.filter(n => n !== componentName);
    recent.unshift(componentName);
    workbenchStorage.save({ recentComponents: recent.slice(0, 10) }); // 最多保存 10 个
  },

  toggleFavorite: (componentName: string) => {
    const state = workbenchStorage.get();
    const favorites = state.favoriteComponents.includes(componentName)
      ? state.favoriteComponents.filter(n => n !== componentName)
      : [...state.favoriteComponents, componentName];
    workbenchStorage.save({ favoriteComponents: favorites });
  }
};
```

---

## 8. 迁移策略

### 8.1 向后兼容方案

#### 8.1.1 现有组件无需修改
- 没有配置 `tabStrategy` 的组件默认使用 `multiple` 模式
- 现有组件可以继续在单 Tab 模式下使用

#### 8.1.2 渐进式升级
1. **第一阶段**：添加 Tab 系统基础设施
   - 实现 TabBar、TabContent 组件
   - 实现 TabManager 逻辑
   - 保持原有 WorkbenchContainer 作为单 Tab 视图

2. **第二阶段**：添加组件列表视图
   - 实现 ComponentListView
   - 添加视图模式切换逻辑

3. **第三阶段**：完善功能
   - 添加搜索、筛选、收藏等功能
   - 添加持久化存储
   - 优化性能和用户体验

### 8.2 数据迁移

#### 8.2.1 Manifest 迁移
现有组件的 manifest 无需修改，新字段均为可选：

```typescript
// 提供默认值
const defaultTabStrategy: TabStrategy = {
  mode: 'multiple',
  allowClose: true
};
```

#### 8.2.2 用户数据迁移
localStorage 中的现有数据不受影响，新增字段使用默认值。

---

## 9. 性能优化

### 9.1 组件懒加载
- 只有激活的 Tab 才挂载组件实例
- 未激活的 Tab 保持卸载状态或使用 `display: none`
- 组件列表使用虚拟滚动（当组件数量 > 50 时）

### 9.2 资源预加载
- 组件列表加载后预加载常用组件的资源
- 使用 `<link rel="prefetch">` 预加载 manifest

### 9.3 内存管理
- 关闭 Tab 时立即卸载组件
- 限制最大 Tab 数量（如 20 个）
- 超出限制时提示用户关闭不活跃的 Tab

### 9.4 缓存策略
- 缓存组件 manifest（使用 Cache API 或内存缓存）
- 缓存组件列表（5 分钟有效期）
- 使用 service worker 缓存静态资源

---

## 10. 测试计划

### 10.1 单元测试
- TabManager 测试
  - 单例模式：只能打开一个实例
  - 多例模式：可以打开多个实例
  - 实例数量限制：达到最大值后无法继续打开
- TabReducer 测试
  - 各种 action 的状态变化
- Storage 测试
  - localStorage 读写正确性

### 10.2 集成测试
- 完整的 Tab 生命周期测试
  - 打开 -> 加载 -> 使用 -> 切换 -> 关闭
- 组件列表视图测试
  - 搜索、筛选、收藏功能
- 组件通信测试
  - 多 Tab 间的消息隔离

### 10.3 E2E 测试
- 用户使用流程
  - 打开应用 -> 查看组件列表 -> 选择组件 -> 打开 Tab -> 切换 Tab -> 关闭 Tab

---

## 11. 未来扩展

### 11.1 Tab 分组
- 支持将相关 Tab 分组显示
- 可折叠/展开分组

### 11.2 Tab 拖拽排序
- 支持拖拽 Tab 调整顺序
- 支持拖拽 Tab 到新窗口

### 11.3 工作区保存/恢复
- 保存当前所有 Tab 配置
- 下次打开时恢复工作区

### 11.4 组件间通信
- 允许不同 Tab 的组件之间直接通信
- 提供组件间消息总线

---

## 12. 风险和挑战

### 12.1 性能风险
- **风险**：同时打开多个 Tab 可能导致内存占用过高
- **缓解**：
  - 限制最大 Tab 数量
  - 未激活 Tab 自动卸载
  - 提供内存使用监控

### 12.2 兼容性风险
- **风险**：现有组件可能不适应新的 Tab 交互模式
- **缓解**：
  - 保持向后兼容
  - 提供渐进式迁移路径
  - 充分测试现有组件

### 12.3 用户体验风险
- **风险**：功能复杂度增加可能影响易用性
- **缓解**：
  - 提供简洁的默认视图（组件列表）
  - 添加引导提示
  - 收集用户反馈持续优化

---

## 13. 验收标准

### 13.1 功能验收
- [ ] 默认显示组件列表视图
- [ ] 点击组件卡片打开新 Tab
- [ ] Tab 栏显示所有打开的组件
- [ ] 支持切换 Tab
- [ ] 支持关闭 Tab
- [ ] 最后一个 Tab 关闭后返回组件列表
- [ ] 单例模式组件只能打开一个实例
- [ ] 多例模式组件可以打开多个实例
- [ ] 支持搜索组件
- [ ] 支持按分类筛选组件
- [ ] 支持收藏组件
- [ ] 显示最近使用的组件
- [ ] 组件全屏加载，充分利用空间

### 13.2 性能验收
- [ ] 组件列表加载时间 < 500ms
- [ ] 打开 Tab 加载组件时间 < 2s
- [ ] 切换 Tab 响应时间 < 100ms
- [ ] 同时打开 10 个 Tab 时内存占用 < 500MB

### 13.3 兼容性验收
- [ ] 现有组件无需修改即可使用
- [ ] 现有功能不受影响
- [ ] 支持主流浏览器（Chrome, Firefox, Safari, Edge）

---

**文档版本**: 1.0.0
**创建日期**: 2026-02-08
**作者**: ZC & Claude
