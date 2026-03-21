# 组件发布指南

本指南介绍如何将开发中的 Workbench 组件发布到组件市场。

---

## 目录

- [概述](#概述)
- [发布前准备](#发布前准备)
- [发布步骤](#发布步骤)
- [高级功能](#高级功能)
- [常见问题](#常见问题)

---

## 概述

### 什么是组件发布？

组件发布是将开发完成的组件从 `gallery/` 目录部署到组件市场（`/opt/market/`）的过程。发布后，组件可以通过后端 API 被前端动态加载和使用。

### 发布流程概览

```
gallery/my-component/  (开发目录)
    ↓ 发布脚本
/opt/market/components/my-component/  (部署目录)
    ↓ 后端 API
Workbench 前端动态加载
```

### 关键特性

- **自动编译** - TypeScript 自动编译为 ESM 格式 JavaScript
- **注册表更新** - 自动更新 `/opt/market/registry.json`
- **验证机制** - 发布前验证 manifest.json 和必需文件
- **Dry-run 模式** - 支持模拟运行，不实际部署

---

## 发布前准备

### 1. 开发环境要求

确保已安装以下依赖：

```bash
# 项目依赖
npm install --save-dev esbuild typescript ts-node

# 或全局安装
npm install -g esbuild typescript ts-node
```

### 2. 组件结构说明

一个标准的组件目录结构：

```
gallery/my-component/
├── index.ts           # 组件源码（TypeScript）
├── manifest.json      # 组件清单（必需）
├── package.json       # npm 包信息（可选）
└── README.md          # 组件文档（可选）
```

**注意**：编译后会生成 `index.js` 和 `index.js.map`。

### 3. manifest.json 格式

组件清单文件必须包含以下字段：

```json
{
  "name": "my-component",
  "version": "1.0.0",
  "description": "组件描述",
  "author": "作者名",
  "icon": "🎨",
  "entry": "./index.js",
  "capabilities": {
    "required": [],
    "optional": ["host:ui:notify"],
    "provided": []
  },
  "permissions": []
}
```

#### 必需字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `name` | string | 组件名称（小写字母、数字、连字符） | `"my-component"` |
| `version` | string | 版本号（semver 格式） | `"1.0.0"` |
| `description` | string | 组件描述 | `"一个简单的组件"` |
| `entry` | string | 入口文件路径 | `"./index.js"` |
| `capabilities` | object | 能力声明 | 见下方 |

#### capabilities 说明

```json
{
  "capabilities": {
    "required": [],           // 必需的 host 能力
    "optional": [             // 可选的 host 能力
      "host:ui:notify",
      "host:ui:resize"
    ],
    "provided": []            // 组件提供的能力
  }
}
```

#### 可选字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `author` | string | 作者名称 |
| `icon` | string | 组件图标（emoji） |
| `styles` | string[] | 样式文件列表 |
| `permissions` | string[] | 权限列表 |

---

## 发布步骤

### 1. 本地测试

在发布前，确保组件在开发环境中正常运行：

```bash
# 启动开发服务器
npm run dev

# 在浏览器中测试组件功能
# 检查控制台是否有错误
```

### 2. 验证组件配置

使用 dry-run 模式验证组件配置，不实际部署：

```bash
npx tsx scripts/publish-component.ts gallery/my-component --dry-run
```

输出示例：

```
[INFO] Starting component publish...
[INFO] Component directory validated
[INFO] Manifest validated
[INFO] [DRY RUN] Would create directory
[INFO] [DRY RUN] Would compile component
[INFO] [DRY RUN] Would copy files
[INFO] [DRY RUN] Would update registry
```

### 3. 使用发布命令

#### 基本发布

```bash
npx tsx scripts/publish-component.ts gallery/hello-world
```

#### 指定目标目录

```bash
# 发布到自定义目录（默认是 /opt/market）
npx tsx scripts/publish-component.ts gallery/hello-world --target /opt/market
```

#### 跳过编译

如果组件已经是 JavaScript 格式，可以跳过编译（默认不编译）：

```bash
npx tsx scripts/publish-component.ts gallery/hello-world
```

#### 详细日志

查看详细的发布日志：

```bash
npx tsx scripts/publish-component.ts gallery/hello-world --verbose
```

### 4. 验证发布结果

#### 检查文件是否部署

```bash
ls -la /opt/market/components/hello-world/
```

应该看到以下文件：

```
manifest.json
index.js
index.js.map (如果编译)
README.md (如果存在)
```

#### 检查注册表

```bash
cat /opt/market/registry.json
```

应该看到组件已添加到注册表：

```json
{
  "version": "1.0.0",
  "components": [
    {
      "id": "com.workbench.hello-world",
      "name": "hello-world",
      "version": "1.0.0",
      "description": "...",
      "manifestUrl": "/market/hello-world/manifest.json",
      "entryUrl": "/market/hello-world/index.js",
      "publishedAt": "2026-02-08T12:00:00Z"
    }
  ],
  "lastUpdated": "2026-02-08T12:00:00Z"
}
```

#### 通过 API 测试

```bash
# 列出所有组件
curl http://localhost:3000/market/list

# 获取组件详情
curl http://localhost:3000/market/hello-world

# 获取 manifest.json
curl http://localhost:3000/market/hello-world/manifest.json
```

---

## 高级功能

### 版本管理

#### 版本号格式

遵循语义化版本（Semantic Versioning）：

```
MAJOR.MINOR.PATCH

1.0.0   - 初始版本
1.1.0   - 新增功能（向后兼容）
2.0.0   - 破坏性变更
1.0.1   - Bug 修复
```

#### 发布新版本

更新 `manifest.json` 中的版本号，然后重新发布：

```json
{
  "name": "my-component",
  "version": "1.1.0",  // 更新版本号
  ...
}
```

```bash
npx tsx scripts/publish-component.ts gallery/my-component
```

发布脚本会自动更新注册表中的版本信息。

### 组件更新

#### 更新现有组件

当组件代码或配置有变更时，直接重新发布即可：

```bash
# 修改代码或 manifest.json
vim gallery/my-component/index.ts
vim gallery/my-component/manifest.json

# 重新发布
npx tsx scripts/publish-component.ts gallery/my-component
```

#### 更新场景

- **Bug 修复** - 更新 `PATCH` 版本号（如 1.0.0 → 1.0.1）
- **新功能** - 更新 `MINOR` 版本号（如 1.0.0 → 1.1.0）
- **破坏性变更** - 更新 `MAJOR` 版本号（如 1.0.0 → 2.0.0）

### 发布选项总结

| 选项 | 说明 | 示例 |
|------|------|------|
| `--target <path>` | 指定目标目录（默认 `/opt/market`） | `--target /opt/market` |

> **注意**：组件实际发布到 `{target}/components/{组件名}/` 目录下。
| `--compile` | 启用 TypeScript 编译 | `--compile` |
| `--dry-run` | 模拟运行，不实际部署 | `--dry-run` |
| `--verbose` | 显示详细日志 | `--verbose` |

---

## 常见问题

### Q1: 发布失败："Component directory not found"

**原因**：组件路径不正确

**解决方案**：

```bash
# 检查路径是否正确
ls gallery/my-component/

# 使用相对路径或绝对路径
npx tsx scripts/publish-component.ts ./gallery/my-component
```

### Q2: 发布失败："Manifest missing required field: name"

**原因**：manifest.json 缺少必需字段或格式错误

**解决方案**：

```bash
# 检查 manifest.json 内容
cat gallery/my-component/manifest.json

# 确保包含所有必需字段
# name, version, description, entry, capabilities
```

### Q3: 发布失败："Invalid version format"

**原因**：版本号不符合 semver 格式

**解决方案**：

```json
// 错误格式
"version": "1.0"
"version": "v1.0.0"
"version": "1.0.0-beta"

// 正确格式
"version": "1.0.0"
"version": "1.0.0-beta.1"
"version": "2.1.3"
```

### Q4: 编译失败："Esbuild not installed"

**原因**：esbuild 未安装

**解决方案**：

```bash
# 安装 esbuild
npm install --save-dev esbuild

# 或默认不编译，直接复制 JS 文件
npx tsx scripts/publish-component.ts gallery/my-component
```

### Q5: 组件发布后无法加载

**原因**：可能的原因包括：
- 后端 API 未启动
- 文件权限问题
- manifest.json 配置错误

**解决方案**：

```bash
# 1. 检查后端 API 是否运行
curl http://localhost:3000/market/list

# 2. 检查文件权限
ls -la /opt/market/my-component/

# 3. 检查浏览器控制台错误日志
```

### Q6: 如何回滚到之前的版本？

**方案 1**：保留旧版本文件

```bash
# 备份当前版本
cp -r /opt/market/my-component /opt/market/my-component.backup

# 发布新版本
npx tsx scripts/publish-component.ts gallery/my-component

# 如需回滚
cp -r /opt/market/my-component.backup/* /opt/market/my-component/
```

**方案 2**：使用版本控制系统（推荐）

```bash
# 在 /opt/market 目录初始化 git
cd /opt/market
git init
git add .
git commit -m "Release my-component v1.0.0"

# 发布新版本
git add .
git commit -m "Release my-component v1.1.0"

# 回滚到之前版本
git checkout HEAD~1
```

### Q7: 发布后注册表未更新

**原因**：可能是权限问题或脚本错误

**解决方案**：

```bash
# 检查注册表文件
ls -la /opt/market/registry.json

# 手动检查注册表内容
cat /opt/market/registry.json

# 使用 --verbose 查看详细日志
npx tsx scripts/publish-component.ts gallery/my-component --verbose
```

### Q8: 组件名称有什么限制？

**规则**：

- 只能包含小写字母（a-z）
- 可以包含数字（0-9）
- 可以包含连字符（-）
- 不能以连字符开头或结尾
- 不能包含空格或特殊字符

**示例**：

```
✅ 正确: my-component, file-browser, hello-world
❌ 错误: MyComponent, file_browser, Hello World, -component
```

---

## 相关文档

- [组件开发指南](./component-development.md) - 如何开发新组件
- [组件市场 API](../api/component-market.md) - 后端 API 接口文档
- [组件市场架构](../architecture/component-market.md) - 架构设计文档

---

**文档版本**: 1.0.0
**最后更新**: 2026-02-08
**作者**: ZC
