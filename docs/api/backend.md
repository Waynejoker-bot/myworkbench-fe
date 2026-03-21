# API Reference

后端 API 接口文档。

## Base URL

```
https://zc.hqdx.store/api
```

本地开发环境：
```
http://localhost:8001/api
```

## 认证

使用 Bearer Token 认证：

```http
Authorization: Bearer <access_token>
```

### 获取 Token

```http
POST /auth/login
Content-Type: application/json

{
  "password": "your-password"
}
```

响应：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 7200
}
```

## 文件系统 API

### 列出目录内容

```http
GET /fs/list?prefix=<prefix>&path=<path>
```

参数：
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| prefix | string | 否 | 前缀路径（如 `/opt/claude/ZC`） |
| path | string | 否 | 相对路径 |

响应：
```json
{
  "success": true,
  "prefix": "",
  "path": "",
  "full_path": "/",
  "items": [
    {
      "name": "file.txt",
      "type": "file",
      "size": 1024,
      "modified_time": "2026-02-07T12:00:00Z"
    },
    {
      "name": "directory",
      "type": "directory",
      "size": null,
      "modified_time": "2026-02-07T12:00:00Z"
    }
  ]
}
```

### 读取文件内容

```http
GET /fs/read?path=<full_path>
```

参数：
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| path | string | 是 | 完整文件路径 |

响应：
```json
{
  "success": true,
  "prefix": "",
  "path": "/opt/claude/ZC/preferences/music.md",
  "full_path": "/opt/claude/ZC/preferences/music.md",
  "content": "# 音乐偏好\n\n## 最喜欢的歌手\n- 孙燕姿",
  "size": 102,
  "encoding": "utf-8"
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误描述",
  "detail": "详细错误信息"
}
```

HTTP 状态码：
| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 401 | 未授权（token 无效或过期） |
| 403 | 禁止访问（权限不足） |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## 组件市场 API

### 获取注册表

```http
GET /market/registry
```

响应：
```json
{
  "com.workbench.hello-world": {
    "name": "hello-world",
    "version": "1.0.0",
    "description": "一个简单的 Hello World 示例组件",
    "author": "ZC",
    "icon": "👋",
    "manifestUrl": "/api/market/hello-world/manifest.json",
    "entryUrl": "/api/market/hello-world/index.js",
    "capabilities": {
      "required": [],
      "optional": ["host:ui:notify", "host:ui:resize"]
    },
    "publishedAt": "2026-02-07T00:00:00Z"
  }
}
```

### 获取组件 Manifest

```http
GET /market/{component-name}/manifest.json
```

### 加载组件

```http
GET /market/{component-name}/index.js
```

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

// 列出目录
const listRes = await fetch('/api/fs/list?prefix=/opt/claude/ZC', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const data = await listRes.json();

// 读取文件
const readRes = await fetch('/api/fs/read?path=/opt/claude/ZC/readme.md', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const { content } = await readRes.json();
```

### TypeScript

```typescript
interface ListResponse {
  success: boolean;
  prefix: string;
  path: string;
  full_path: string;
  items: FileItem[];
}

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number | null;
  modified_time: string;
  full_path?: string;
}

// 使用
const response = await request<ListResponse>('/fs/list?prefix=/opt/claude/ZC');
```

## 注意事项

1. **Token 过期**: Token 有效期由后端配置决定，过期后需要重新登录
2. **路径编码**: 路径参数需要正确编码，使用 `URLSearchParams`
3. **大文件**: 读取大文件时注意内存限制
