# API Reference

MyWorkbench 前端应用依赖的所有 API 接口文档。

## Base URL

```
生产环境: https://zc.hqdx.store/api
开发环境: http://localhost:8001/api
```

## API 概览

| 模块 | 说明 | 文档 |
|------|------|------|
| 认证 | 用户登录、Token 管理 | [backend.md](./backend.md#认证) |
| 文件系统 | 文件/目录的读写操作 | [backend.md](./backend.md#文件系统-api) |
| 组件市场 | 组件列表、加载、发布 | [component-market.md](./component-market.md) |
| 工具配置 | 工具调用显示配置 | [tool-config-api.md](./tool-config-api.md) |
| 工具跟踪 | 工具执行状态管理 | [message-station-tool-tracking.md](./message-station-tool-tracking.md) |

## 认证

使用 Bearer Token 认证：

```http
Authorization: Bearer <access_token>
```

获取 Token：
```http
POST /auth/login
Content-Type: application/json

{
  "password": "your-password"
}
```

## 快速参考

### 文件系统

| 接口 | 方法 | 说明 |
|------|------|------|
| `/fs/list` | GET | 列出目录内容 |
| `/fs/read` | GET | 读取文件内容 |

### 组件市场

| 接口 | 方法 | 说明 |
|------|------|------|
| `/market/list` | GET | 获取所有组件列表 |
| `/market/{name}` | GET | 获取组件详情 |
| `/market/{name}/manifest.json` | GET | 获取组件清单 |
| `/market/{name}/index.js` | GET | 获取组件入口文件 |

### 工具配置

| 接口 | 方法 | 说明 |
|------|------|------|
| `/tools/config` | GET | 获取所有工具配置 |
| `/tools/config?tool_name={name}` | GET | 获取单个工具配置 |
| `/tool-config` | GET/POST | 工具显示配置（前端） |

> 注：`/tools/config` 是后端 API，`/tool-config` 是前端配置服务。详见 [tool-config.md](./tool-config.md)。

### 工具状态跟踪

| 接口 | 方法 | 说明 |
|------|------|------|
| `/v1/tool-tracking/status/{call_id}` | GET | 获取工具执行状态 |
| `/v1/tool-tracking/status/{call_id}` | PUT | 更新工具执行状态 |
| `/v1/tool-tracking/status/batch` | POST | 批量获取工具状态 |

## HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（token 无效或过期） |
| 403 | 禁止访问（权限不足） |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## 使用示例

### JavaScript (fetch)

```javascript
// 登录
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'your-password' })
});
const { access_token } = await loginRes.json();

// 带认证的请求
const listRes = await fetch('/api/fs/list?prefix=/opt/claude/ZC', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const data = await listRes.json();
```

### TypeScript 类型

```typescript
// 通用响应格式
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  detail?: string;
}

// 文件项
interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number | null;
  modified_time: string;
  full_path?: string;
}

// 组件信息
interface ComponentInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon: string;
  manifestUrl: string;
  entryUrl: string;
  capabilities: {
    required: string[];
    optional: string[];
  };
  publishedAt: string;
}
```

## 注意事项

1. **Token 过期**：Token 有效期由后端配置决定，过期后需重新登录
2. **路径编码**：路径参数需要正确编码，使用 `URLSearchParams` 或 `encodeURIComponent`
3. **大文件**：读取大文件时注意内存限制
4. **错误处理**：所有请求应包含错误处理逻辑

---

**最后更新**: 2026-02-14
