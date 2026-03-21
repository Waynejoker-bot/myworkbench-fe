# Workbench 组件市场 - 后端 API 接口文档

## 一、背景与需求

### 1.1 背景

Workbench 组件市场需要一个后端 API 来支持以下功能：

1. **组件列表查询** - 前端需要获取所有已发布的组件列表
2. **组件详情查询** - 前端需要获取指定组件的详细信息
3. **组件文件服务** - 前端需要加载组件的 manifest.json 和 index.js 文件
4. **组件发布管理** - （可选）管理员可通过 API 发布新组件

### 1.2 需求

1. **组件文件存储** - 所有已发布的组件文件存储在 `/opt/market/` 目录
2. **自动化注册表** - `/opt/market/registry.json` 自动维护所有组件信息
3. **API 前缀** - 所有接口使用 `/market` 前缀
4. **文件访问限制** - 只能访问 `/opt/market/` 目录下的文件，禁止路径遍历
5. **无需认证** - 当前阶段不需要用户认证（未来可扩展）

---

## 二、组件文件存储结构

```
/opt/market/                    # 根目录（后端可配置）
├── components/                # 已发布的组件
│   ├── hello-world/
│   │   ├── manifest.json      # 组件清单
│   │   ├── index.js          # 编译后的 JS
│   │   └── package.json      # 可选
│   └── file-browser/
│       ├── manifest.json
│       ├── index.js
│       └── package.json
└── registry.json              # 组件注册表
```

### registry.json 格式

```json
{
  ""com.workbench.hello-world": {
    "name": "hello-world",
    "version": "1.0.0",
    "description": "一个简单的 Hello World 示例组件",
    "author": "ZC",
    "icon": "👋",
    "manifestUrl": "/market/hello-world/manifest.json",
    "entryUrl": "/market/hello-world/index.js",
    "publishedAt": "2026-02-07T00:00:00Z"
  },
  "com.workbench.file-browser": {
    "name": "file-browser",
    "version": "1.0.0",
    "description": "文件浏览器组件，浏览和管理服务器文件系统",
    "author": "ZC",
    "icon": "📁",
    "manifestUrl": "/market/file-browser/manifest.json",
    "entryUrl": "/market/file-browser/index.js",
    "publishedAt": "2026-02-07T00:00:00Z"
  }
}
```

---

## 三、API 接口定义

### 3.1 列出所有组件

**接口**: `GET /market/list`

**描述**: 返回所有已发布的组件列表

**请求参数**: 无

**响应格式**:

```json
{
  "success": true,
  "components": [
    {
      "id": "com.workbench.hello-world",
      "name": "hello-world",
      "version": "1.0.0",
      "description": "一个简单的 Hello World 示例组件",
      "author": "ZC",
      "icon": "👋",
      "manifestUrl": "/market/hello-world/manifest.json",
      "entryUrl": "/market/hello-world/index.js",
      "capabilities": {
        "required": [],
        "optional": ["host:ui:notify", "host:ui:resize"]
      },
      "publishedAt": "2026-02-07T00:00:00Z"
    }
  ]
}
```

**错误响应**:

```json
{
  "success": false,
  "error": "Failed to read registry"
}
```

**实现要点**:
1. 读取 `/opt/market/registry.json`
2. 如果文件不存在，返回空数组
3. 将 JSON 转换为数组格式返回
4. 计算文件大小（可选）

---

### 3.2 获取组件详情

**接口**: `GET /market/{component_name}`

**描述**: 获取指定组件的详细信息

**路径参数**:
- `component_name` - 组件名称（如 `hello-world`）

**响应格式**:

```json
{
  "success": true,
  "component": {
    "id": "com.workbench.hello-world",
    "name": "hello-world",
    "version": "1.0.0",
    "description": "一个简单的 Hello World 示例组件",
    "author": "ZC",
    "icon": "👋",
    "manifestUrl": "/market/hello-world/manifest.json",
    "entryUrl": "/market/hello-world/index.js",
    "capabilities": {
      "required": [],
      "optional": ["host:ui:notify", "host:ui:resize"]
    },
    "publishedAt": "2026-02-07T00:00:00Z"
  }
}
```

**错误响应**:

```json
{
  "success": false,
  "error": "Component not found: hello-world"
}
```

**实现要点**:
1. 读取 `/opt/market/registry.json`
2. 查找指定组件
3. 如果不存在，返回 404 或错误信息

---

### 3.3 获取组件 manifest.json

**接口**: `GET /market/{component_name}/manifest.json`

**描述**: 获取组件的 manifest.json 文件

**路径参数**:
- `component_name` - 组件名称（如 `hello-world`）

**响应**: 直接返回 manifest.json 文件内容

**Content-Type**: `application/json`

**错误响应**:

```json
{
  "success": false,
  "error": "Component not found: hello-world"
}
```

**实现要点**:
1. 读取 `/opt/market/components/{component_name}/manifest.json`
2. 验证路径安全性（防止 `../` 遍历）
3. 设置正确的 Content-Type
4. 如果文件不存在，返回 404

---

### 3.4 获取组件入口文件

**接口**: `GET /market/{component_name}/index.js`

**描述**: 获取组件的入口 JS 文件

**路径参数**:
- `component_name` - 组件名称（如 `hello-world`）

**响应**: 直接返回 index.js 文件内容

**Content-Type**: `application/javascript` 或 `text/javascript`

**错误响应**:

```json
{
  "success": false,
  "error": "Component not found: hello-world"
}
```

**实现要点**:
1. 读取 `/opt/market/components/{component_name}/index.js`
2. 验证路径安全性
3. 设置正确的 Content-Type
4. 可选：设置缓存头
5. 如果文件不存在，返回 404

---

### 3.5 获取组件其他文件（可选）

**接口**: `GET /market/{component_name}/{filename}`

**描述**: 获取组件的其他文件（如 package.json, styles.css 等）

**路径参数**:
- `component_name` - 组件名称
- `filename` - 文件名

**响应**: 直接返回文件内容

**错误响应**:

```json
{
  "success": false,
  "error": "File not found"
}
```

**实现要点**:
1. 读取 `/opt/market/components/{component_name}/{filename}`
2. 验证路径安全性
3. 根据文件扩展名设置 Content-Type
4. 如果文件不存在，返回 404

---

## 四、安全管理

### 4.1 路径遍历防护

所有文件访问接口必须验证路径，防止 `../` 攻击：

```python
# 伪代码示例
def validate_path(component_name: str, filename: str = None) -> str:
    # 获取市场根目录
    market_root = "/opt/market"

    # 构建完整路径
    if filename:
        full_path = os.path.join(market_root, "components", component_name, filename)
    else:
        full_path = os.path.join(market_root, "components", component_name)

    # 规范化路径并验证
    full_path = os.path.abspath(full_path)
    market_root = os.path.abspath(market_root)

    # 确保路径在市场目录下
    if not full_path.startswith(market_root):
        raise SecurityError("Path traversal attempt detected")

    return full_path
```

### 4.2 组件白名单（可选）

可以配置允许的组件列表：

```python
ALLOWED_COMPONENTS = [
    "hello-world",
    "file-browser",
    # ...
]
```

### 4.3 文件大小限制（可选）

限制组件文件大小：

```python
MAX_COMPONENT_SIZE = 10 * 1024 * 1024  # 10MB
```

---

## 五、注册表维护

### 5.1 更新时机

registry.json 应在以下时机更新：

1. 组件发布时（由发布脚本更新）
2. 组件删除时
3. 组件版本更新时

### 5.2 更新格式

```json
{
  "com.workbench.{component_name}": {
    "name": "component_name",
    "version": "1.0.0",
    "description": "...",
    "author": "...",
    "icon": "...",
    "manifestUrl": "/market/component_name/manifest.json",
    "entryUrl": "/market/component_name/index.js",
    "capabilities": {
      "required": [],
      "optional": []
    },
    "publishedAt": "2026-02-07T00:00:00Z"
  }
}
```

---

## 六、错误码定义

| 错误码 | 描述 |
|--------|------|
| `COMPONENT_NOT_FOUND` | 组件不存在 |
| `FILE_NOT_FOUND` | 文件不存在 |
| `INVALID_PATH` | 无效的路径 |
| `REGISTRY_ERROR` | 注册表读取失败 |
| `INTERNAL_ERROR` | 内部错误 |

---

## 七、实现建议

### 7.1 技术栈

- Python (FastAPI) - 推荐用于快速开发
- Node.js (Express) - 与前端技术栈一致
- Go (Gin/Fiber) - 高性能需求

### 7.2 配置

```python
# market_config.py
MARKET_CONFIG = {
    "root_path": "/opt/market",
    "components_subdir": "components",
    "registry_file": "registry.json",
    "max_file_size": 10 * 1024 * 1024,  # 10MB
    "allowed_components": None,  # None 表示允许所有
}
```

### 7.3 示例路由（Python FastAPI）

```python
from fastapi import FastAPI, HTTPException
from pathlib import Path

app = FastAPI()
MARKET_ROOT = Path("/opt/market")

@app.get("/market/list")
async def list_components():
    registry_file = MARKET_ROOT / "registry.json"

    if not registry_file.exists():
        return {"success": True, "components": []}

    import json
    with open(registry_file) as f:
        registry = json.load(f)

    components = list(registry.values())
    return {"success": True, "components": components}

@app.get("/market/{component_name}")
async def get_component(component_name: str):
    # 实现逻辑...
    pass
```

---

## 八、测试用例

### 8.1 列表接口测试

```
GET /market/list
预期: 成功返回所有组件

# 当 registry.json 不存在时
预期: 返回空数组
```

### 8.2 组件详情测试

```
GET /market/hello-world
预期: 成功返回组件详情

GET /market/nonexistent
预期: 返回错误或 404
```

### 8.3 文件访问测试

```
GET /market/hello-world/manifest.json
预期: 成功返回 manifest.json

GET /market/hello-world/index.js
预期: 成功返回 index.js

# 路径遍历测试
GET /market/../etc/passwd
预期: 返回错误（安全拦截）
```

---

## 九、未来扩展

### 9.1 组件版本管理

```
GET /market/{component_name}/versions
响应: 返回该组件所有版本
```

### 9.2 组件搜索

```
GET /market/search?q=hello
响应: 返回匹配的组件列表
```

### 9.3 组件分类

```
GET /market/list?category=tools
响应: 返回指定分类的组件
```

### 9.4 组件统计

```
GET /market/stats
响应: 返回组件数量、总大小等统计信息
```

---

**文档版本**: 1.0.0
**最后更新**: 2026-02-07
**作者**: ZC & Claude
