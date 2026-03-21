# 快速入门

本指南帮助新开发者快速上手 MyWorkbench 前端项目。

## 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18.x | JavaScript 运行时 |
| npm | >= 9.x | 包管理器 |
| Git | >= 2.x | 版本控制 |

推荐使用 nvm 管理 Node.js 版本：

```bash
nvm install 18
nvm use 18
```

## 安装步骤

### 1. 克隆项目（如果需要）

```bash
cd /opt/claude
# 项目已存在，跳过克隆
```

### 2. 安装依赖

```bash
cd /opt/claude/myworkbench-fe
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 查看应用。

### 4. 构建生产版本

```bash
npm run build
npm run preview  # 预览构建结果
```

## 项目结构速览

```
myworkbench-fe/
├── src/
│   ├── api/                 # API 请求封装
│   ├── components/          # 通用 UI 组件
│   ├── hooks/               # 自定义 Hooks
│   ├── pages/               # 页面组件
│   │   ├── ChatBoxPage.tsx  # 主聊天页面
│   │   └── ...
│   ├── workbench/           # Workbench 核心系统
│   │   ├── component/       # 组件加载器
│   │   ├── host/            # Host API
│   │   └── registry/        # 组件注册表
│   └── main.tsx             # 入口文件
├── gallery/                 # 组件源码
├── docs/                    # 项目文档
└── public/                  # 静态资源
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览构建结果 |
| `npm run lint` | 代码检查 |

## 开发流程

### 修改主应用

1. 编辑 `src/` 目录下的文件
2. 保存后自动热更新
3. 在浏览器中查看效果

### 开发组件

1. 在 `gallery/` 目录下创建或修改组件
2. 编译组件：

```bash
cd gallery/组件名
npx esbuild index.ts --format=esm --bundle --minify --sourcemap --outfile=index.js
```

3. 部署组件：

```bash
cp index.js /opt/market/components/组件名/
cp index.js.map /opt/market/components/组件名/
```

4. 更新注册表（如果需要）

### 使用 Claude 发布组件

```bash
# 在 Claude Code 中执行
publish-component 组件名
```

## 核心概念

### 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 首页 |
| `/chat` | ChatBoxPage | 聊天页面（主功能） |
| `/novel` | BookshelfPage | 书架 |
| `/novel/:bookId` | BookDetailPage | 小说目录 |
| `/novel/:bookId/:chapterId` | ReaderPage | 章节阅读 |
| `/fs` | FileSystemPage | 文件系统 |
| `/fourier` | FourierDrawPage | 傅里叶绘图 |

### Workbench 组件系统

Workbench 是一个动态组件加载系统，核心流程：

1. **加载** - 从组件市场获取 manifest.json 和 index.js
2. **挂载** - 在 Shadow DOM 中渲染组件
3. **通信** - 通过 Host API 与主应用交互

### Host API

组件可以通过 Host API 访问主应用能力：

```typescript
interface HostAPI {
  ui: {
    notify(options: NotificationOptions): void;  // 显示通知
    resize(width: number, height?: number): void; // 调整大小
    close(): void;  // 关闭组件
  };
  messages: {
    getAll(): Message[];  // 获取所有消息
    send(content: string): Promise<void>;  // 发送消息
  };
  input: {
    append(text: string): void;  // 追加输入
    getValue(): string;  // 获取输入值
  };
}
```

## 相关项目

MyWorkbench 依赖以下后端服务：

| 项目 | 路径 | 说明 |
|------|------|------|
| Message Station | `/opt/claude/message-station` | 消息队列服务 |
| Agent Service | `/opt/claude/agent-service` | Agent 后端服务 |
| Novels | `/opt/novels` | 小说数据目录（独立部署） |

## 下一步

- [小说管理指南](./novel-guide.md) - 学习如何添加小说和章节
- [组件开发指南](./component-development.md) - 学习如何开发新组件
- [Workbench 架构](../architecture/workbench.md) - 了解组件系统设计
- [API 文档](../api/README.md) - 查看后端接口

## 常见问题

### Q: 开发服务器启动失败？

检查端口是否被占用：
```bash
lsof -i :5173
```

### Q: 组件加载失败？

1. 检查组件是否已部署到 `/opt/market/components/`
2. 检查 `registry.json` 是否已更新
3. 检查浏览器控制台错误信息

### Q: API 请求失败？

1. 确认后端服务已启动
2. 检查 API Base URL 配置
3. 检查 Token 是否有效

---

**最后更新**: 2026-02-20
