# Workbench 组件市场设计方案

## 一、背景与需求

### 1.1 背景

当前 Workbench 组件系统已完成基础架构，但组件的发布和加载方式存在以下问题：

1. **组件与 ChatBox 耦合** - 目前组件代码放在项目 `gallery/` 目录下，与主应用耦合
2. **无发布机制** - 缺少组件的标准化发布流程
3. **无远程加载支持** - 只能加载本地组件，无法扩展第三方组件
4. **缺少组件市场** - 没有统一的组件注册和发现机制

### 1.2 需求

基于当前架构，设计一个组件发布和加载系统，满足以下需求：

1. **解耦** - 组件开发与 ChatBox 主应用完全解耦
2. **本地发布** - 构建后的组件发布到 `/opt/market` 目录
3. **动态加载** - 通过后端 API 动态加载已发布的组件
4. **快捷引用** - 支持在聊天输入中使用 `@component-name` 快捷加载组件
5. **无需 CDN** - 不依赖外部 CDN，所有文件存储在本地
6. **无需 Marketplace** - 暂不支持公共市场，仅限本地使用

---

## 二、架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                      Component Market                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Frontend   │───►│   Backend    │───►│   Market    │   │
│  │ (Workbench) │    │   API       │    │   (Files)   │   │
│  └──────┬───────┘    └──────────────┘    └──────────────┘   │
│         │                    │                    │              │
│         │  1.获取列表       │  2.组件注册          │  3.组件文件    │
│         │  2.获取详情       │  3.提供文件          │  - manifest.js  │
│         │  3.加载组件       │                     │  - index.js    │
│         └────────────────────┴────────────────────┘              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

组件发布流程:
开发者 ──► 组件代码 ──► 构建脚本 ──► /opt/market/ ──► 后端读取
```

---

## 三、目录结构

### 3.1 市场文件存储（后端）

```
/opt/market/                    # 组件市场根目录
├── components/                # 已发布的组件
│   ├── hello-world/
│   │   ├── manifest.json      # 组件清单
│   │   ├── index.js          # 编译后的 JS（ESM 格式）
│   │   └── package.json
│   └── file-browser/
│       ├── manifest.json
│       ├── index.js
│       └── package.json
└── registry.json              # 组件注册表（自动生成）
```

### 3.2 前端项目结构

```
src/workbench/
├── registry/                  # 组件注册表模块
│   ├── types.ts              # 类型定义
│   ├── client.ts             # API 客户端
│   ├── resolver.ts           # URL 解析器
│   └── index.ts             # 导出

scripts/                      # 发布脚本
└── publish-component.ts       # 组件发布工具

gallery/                      # 组件开发目录（源码，不发布）
├── hello-world/
├── file-browser/
└── ...
```

---

## 四、数据结构

### 4.1 组件信息

```typescript
interface ComponentInfo {
  id: string;                    // com.workbench.hello-world
  name: string;                  // hello-world
  version: string;               // 1.0.0
  description: string;
  author?: string;
  icon?: string;

  // 资源 URL（相对路径）
  manifestUrl: string;            // /market/hello-world/manifest.json
  entryUrl: string;              // /market/hello-world/index.js

  // 能力声明
  capabilities: {
    required: string[];
    optional: string[];
  };

  // 元数据
  publishedAt: string;           // ISO 时间戳
  size?: number;                 // 文件大小（字节）
}
```

### 4.2 组件清单

```typescript
interface ComponentManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;
  entry: string;              // 相对路径，如 "./index.js"
  styles?: string[];
  capabilities: {
    required: string[];
    optional: string[];
    provided: string[];
  };
  permissions?: string[];
}
```

---

## 五、工作流程

### 5.1 组件开发流程

```
┌─────────────────────────────────────────────────────────────┐
│                  组件开发流程                              │
└─────────────────────────────────────────────────────────────┘

1. 开发组件
   └── 在 gallery/my-component/ 目录编写代码
       ├── index.ts          # 组件源码
       ├── manifest.json     # 组件清单
       └── README.md        # 文档

2. 本地测试
   └── 直接加载 gallery/ 目录进行测试

3. 发布组件
   └── 运行发布脚本
       $ npx ts-node scripts/publish-component.ts gallery/my-component

4. 组件部署
   └── 自动完成以下步骤：
       ├── 编译 index.ts -> index.js
       ├── 复制到 /opt/market/components/my-component/
       ├── 更新 /opt/market/registry.json
       └── 通知后端刷新（可选）

5. 在 Workbench 中使用
   └── 聊天中输入 @my-component 即可加载
```

### 5.2 组件加载流程

```
┌─────────────────────────────────────────────────────────────┐
│                  组件加载流程                              │
└─────────────────────────────────────────────────────────────┘

用户输入: "帮我分析一下 @file-browser 中的文件"

1. 解析输入
   └── 识别出 @file-browser 引用

2. 查询组件信息
   └── GET /market/list
       └── 返回所有可用组件

3. 获取组件清单
   └── GET /market/file-browser/manifest.json

4. 加载组件资源
   └── GET /market/file-browser/index.js
       └── 通过 Blob URL 加载到沙箱

5. 初始化组件
   └── 发送 init 消息
   └── 组件就绪
```

---

## 六、前端实现要点

### 6.1 组件注册表客户端

```typescript
// src/workbench/registry/client.ts

class ComponentRegistryClient {
  // 列出所有组件
  list(): Promise<ComponentInfo[]>

  // 获取指定组件信息
  get(name: string): Promise<ComponentInfo | null>

  // 获取组件 manifest
  getManifest(name: string): Promise<ComponentManifest>

  // 获取组件入口文件
  getEntry(name: string): Promise<string>
}
```

### 6.2 URL 解析器

```typescript
// src/workbench/registry/resolver.ts

// 解析输入中的组件引用
// 例如: "使用 @file-browser 查看文件" => { component: "file-browser" }
function resolveComponentUrl(
  text: string
): { component?: string; originalText: string }
```

### 6.3 集成到 WorkbenchContainer

```typescript
// 改进现有的 loadComponent 方法
async loadComponent(componentName: string) {
  const client = new ComponentRegistryClient();
  const info = await client.get(componentName);

  if (info) {
    // 通过市场 API 加载组件
    return this.host.loadComponent(info.manifestUrl);
  } else {
    throw new Error(`Component not found: ${componentName}`);
  }
}
```

---

## 七、发布脚本设计

### 7.1 发布脚本功能

```typescript
// scripts/publish-component.ts

// 使用方法:
// npx ts-node scripts/publish-component.ts gallery/hello-world

// 功能:
// 1. 验证组件目录存在
// 2. 读取 manifest.json 并验证
// 3. 编译 index.ts 到 index.js（使用 ES5/ESM）
// 4. 创建 /opt/market/components/{name}/ 目录
// 5. 复制文件到目标目录
// 6. 更新 /opt/market/registry.json
// 7. 输出发布结果
```

### 7.2 编译选项

由于组件需要在沙箱中运行，编译时需要注意：

1. **目标环境** - ES5 或现代浏览器
2. **模块格式** - ESM (ES Modules)
3. **不打包依赖** - 组件应保持最小体积
4. **保留类型** - 可选，生成 .d.ts 文件

---

## 八、任务分解

### Phase 1: 后端接口支持

| 任务 | 描述 | 依赖 |
|------|------|------|
| Task 1.1 | 设计并实现组件列表接口 | - |
| Task 1.2 | 设计并实现组件详情接口 | - |
| Task 1.3 | 设计并实现文件服务接口 | - |

### Phase 2: 前端组件注册表

| 任务 | 描述 | 依赖 |
|------|------|------|
| Task 2.1 | 创建类型定义文件 | - |
| Task 2.2 | 实现 API 客户端 | 1.1, 1.2, 1.3 |
| Task 2.3 | 实现 URL 解析器 | - |
| Task 2.4 | 创建组件选择器 UI | 2.2 |

### Phase 3: 组件发布工具

| 任务 | 描述 | 依赖 |
|------|------|------|
| Task 3.1 | 实现基础发布脚本 | - |
| Task 3.2 | 集成 TypeScript 编译 | - |
| Task 3.3 | 实现 registry.json 更新 | - |
| Task 3.4 | 添加发布验证 | - |

### Phase 4: 集成到 Workbench

| 任务 | 描述 | 依赖 |
|------|------|------|
| Task 4.1 | 集成组件注册表到 ChatBox | 2.1, 2.2, 2.3 |
| Task 4.2 | 实现聊天输入解析 | 2.3 |
| Task 4.3 | 添加组件快捷加载按钮 | 2.4, 4.1 |
| Task 4.4 | 改进组件加载错误处理 | 4.1 |

---

## 九、安全考虑

### 9.1 文件访问控制

- 组件只能访问 `/opt/market/` 目录
- 禁止路径遍历攻击（`../`）
- 文件大小限制（可选）

### 9.2 组件验证

- manifest.json 格式验证
- 版本号格式验证（semver）
- 必需字段检查

### 9.3 来源限制

- 仅允许从已注册的组件加载
- 沙箱隔离运行

---

## 十、未来扩展

### 10.1 组件版本管理

- 支持组件多版本并存
- 版本更新提示

### 10.2 公共市场

- 支持从 CDN 加载组件
- 第三方组件发布

### 10.3 组件审核

- 发布前审核流程
- 管理员批准机制

---

**文档版本**: 1.0.0
**最后更新**: 2026-02-07
**作者**: ZC & Claude
