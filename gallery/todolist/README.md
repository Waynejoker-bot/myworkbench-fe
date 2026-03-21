# TodoList Component

一个优雅的待办事项管理组件，设计灵感来自 Wunderlist。

## 功能特性

- ✅ **完整的 CRUD 操作** - 创建、读取、更新、删除待办事项
- 🎨 **Wunderlist 风格设计** - 清爽简洁的蓝色主题界面
- 📊 **统计信息** - 实时显示总计和待完成数量
- 🔍 **智能过滤** - 支持查看全部、待完成、已完成的任务
- ✏️ **在线编辑** - 点击编辑按钮即可修改任务内容和描述
- 📱 **响应式设计** - 适配各种屏幕尺寸
- 🔄 **状态切换** - 点击复选框快速切换完成状态
- ⚡ **加载动画** - 操作时的流畅视觉反馈

## 快速开始

### 1. 配置组件

在 `manifest.json` 中配置组件信息：

```json
{
  "name": "todolist",
  "version": "1.0.0",
  "configSchema": {
    "properties": {
      "apiBaseUrl": {
        "type": "string",
        "default": "http://127.0.0.1:8001"
      }
    }
  }
}
```

### 2. 启动后端 API

确保 Todo API 服务正在运行：

```bash
# 默认地址: http://127.0.0.1:8001
curl http://127.0.0.1:8001/api/todos
```

### 3. 构建组件

```bash
npm run build
# 或
npx tsc --project tsconfig.json
```

### 4. 在 Workbench 中加载

```typescript
import { Workbench } from '@workbench/core';

const workbench = new Workbench();
await workbench.loadComponent('/gallery/todolist/manifest.json');
```

## API 接口

组件使用以下 Todo API 端点：

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/todos` | 获取所有 todo（支持过滤） |
| POST | `/api/todos` | 创建新 todo |
| GET | `/api/todos/{id}` | 获取 todo 详情 |
| PATCH | `/api/todos/{id}` | 更新 todo |
| DELETE | `/api/todos/{id}` | 删除 todo |
| POST | `/api/todos/{id}/toggle` | 切换完成状态 |

### 数据模型

```typescript
interface Todo {
  id: number;
  title: string;        // 标题（1-200字符）
  content?: string;     // 可选的描述内容
  completed: boolean;   // 完成状态
  created_at: number;   // 创建时间戳
  updated_at: number;   // 更新时间戳
}
```

## 使用说明

### 添加新任务

1. 在顶部的输入框中输入任务标题
2. 可选：在下方输入框添加描述
3. 点击"添加"按钮或按 Enter 键

### 管理任务

- **标记完成/未完成**：点击任务前的复选框
- **编辑任务**：点击任务右侧的编辑图标（✎）
- **删除任务**：点击任务右侧的删除图标（✕）

### 过滤视图

使用顶部的过滤标签：
- **全部**：显示所有任务
- **待完成**：只显示未完成的任务
- **已完成**：只显示已完成的任务

## 样式自定义

组件使用 CSS 类前缀 `td-`，可以通过以下方式自定义样式：

```css
/* 修改主题色 */
.td-header {
  background: linear-gradient(135deg, #your-color 0%, #your-color2 100%);
}

.td-add-btn {
  background: linear-gradient(135deg, #your-color 0%, #your-color2 100%);
}

/* 修改圆角 */
.td-item {
  border-radius: 12px;
}
```

## 开发

### 项目结构

```
todolist/
├── manifest.json      # 组件清单
├── index.ts           # TypeScript 源码
├── index.js           # 编译后的 JavaScript
├── index.d.ts         # TypeScript 类型定义
├── package.json       # 包配置
├── tsconfig.json      # TypeScript 配置
└── README.md          # 说明文档
```

### 构建

```bash
# 编译 TypeScript
npm run build

# 监听模式
npm run watch
```

## 设计理念

本组件的设计灵感来源于 Wunderlist，强调：

- **简洁至上**：干净整洁的界面，没有多余的元素
- **高效操作**：最少点击完成常用操作
- **视觉反馈**：流畅的动画和状态变化
- **色彩愉悦**：蓝色主题带来专业而友好的感觉

## 许可证

MIT

## 作者

ZC
