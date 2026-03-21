# 组件市场资源路径重构方案

## 需求 ID
26021410-remove-api-prefix

## 状态
✅ **已完成** - 2026-02-14

---

## 问题分析

### 当前架构问题

当前组件市场资源请求使用 `/api/market` 前缀，这带来以下问题：

1. **不必要的后端依赖**
   - 组件资源（manifest.json, index.js 等）是纯静态文件
   - 当前却需要后端 API 服务来提供这些静态资源
   - 增加了系统复杂性和部署依赖

2. **语义混淆**
   - `/api` 前缀通常暗示动态 API 请求
   - 组件资源本质上是静态资源，不应使用 API 路径

### 改造前路径格式
```
/api/market/{component-name}/manifest.json
/api/market/{component-name}/index.js
/api/market/list
```

### 改造后路径格式
```
/market/components/{component-name}/manifest.json
/market/components/{component-name}/index.js
/market/registry.json
```

---

## 最终改动记录

### 核心代码文件

| 文件 | 改动说明 |
|------|----------|
| `src/vite-plugin-market.ts` | `marketRoot` 改为 `/opt/market`，移除 `/api/market` 支持 |
| `src/workbench/host/loader.ts` | 路径转换改为 `/market/components/` |
| `src/workbench/registry/client.ts` | 重构为纯静态客户端，`list()` 直接读取 `/market/registry.json` |
| `src/workbench/host/host.ts` | 注释更新 |

### 脚本文件

| 文件 | 改动说明 |
|------|----------|
| `scripts/publish-component.ts` | apiBase 改为 `/market/components` |
| `.claude/skills/publish-component/publish-component.sh` | URL 改为 `/market/components/{name}/...` |

### 数据文件

| 文件 | 改动说明 |
|------|----------|
| `/opt/market/registry.json` | URL 从 `/api/market/` 改为 `/market/components/` |

### 文档文件

| 文件 | 改动说明 |
|------|----------|
| `docs/api/component-market.md` | 路径更新 |
| `docs/architecture/component-market.md` | 路径更新 |
| `docs/guides/component-development.md` | 路径更新 |
| `docs/guides/publishing-components.md` | 路径更新 |

---

## 关键改动详情

### 1. client.ts 重构

**改动前：**
```typescript
async list(): Promise<ComponentInfo[]> {
  const url = `${this.apiBase}/list`;  // 调用后端 API
  // ...
}
```

**改动后：**
```typescript
async list(): Promise<ComponentInfo[]> {
  const registry = await this.getRegistry();  // 读取静态文件
  return registry.components;
}

private async getRegistry(): Promise<RegistryData> {
  const response = await this.fetchWithTimeout('/market/registry.json');
  // ... 带缓存的实现
}
```

### 2. 统一路径格式

所有组件资源路径统一为 `/market/components/{name}/...` 格式：

| 用途 | 旧路径 | 新路径 |
|------|--------|--------|
| 组件列表 API | `/api/market/list` | `/market/registry.json` |
| 组件清单 | `/api/market/hello-world/manifest.json` | `/market/components/hello-world/manifest.json` |
| 组件入口 | `/api/market/hello-world/index.js` | `/market/components/hello-world/index.js` |

---

## 验证结果

- ✅ 代码中已无 `/api/market` 残留
- ✅ registry.json URL 格式正确
- ✅ 生产环境资源访问正常（200）
- ✅ `/market/registry.json` 可正常访问

---

## 备注

此改造完成后，组件市场完全独立于后端服务运行：

1. **组件列表** - 直接读取 `/market/registry.json` 静态文件
2. **组件资源** - 通过 nginx 静态服务从 `/market/components/` 提供
3. **无需后端 API** - 所有组件相关操作都是纯静态的
