# 组件市场资源路径重构 - 任务清单

## 进度总览

| 序号 | 任务内容 | 状态 |
|------|----------|------|
| 1 | 修改 `vite-plugin-market.ts` | ✅ 已完成 |
| 2 | 修改 `loader.ts` | ✅ 已完成 |
| 3 | 修改 `client.ts` | ✅ 已完成 |
| 4 | 修改 `publish-component.ts` | ✅ 已完成 |
| 5 | 修改 `publish-component.sh` | ✅ 已完成 |
| 6 | 更新 `/opt/market/registry.json` | ✅ 已完成 |
| 7 | 更新 `docs/api/component-market.md` | ✅ 已完成 |
| 8 | 更新 `docs/architecture/component-market.md` | ✅ 已完成 |
| 9 | 更新 `docs/guides/component-development.md` | ✅ 已完成 |
| 10 | 更新 `docs/guides/publishing-components.md` | ✅ 已完成 |
| 11 | 验证测试 | ✅ 已完成 |

---

## 详细步骤

### 步骤 1: 修改 `vite-plugin-market.ts`

**目标：** 移除 `/api/market/` 路径支持，仅保留 `/market/`

**改动内容：**
- 移除 `apiMarketPrefix` 变量
- 简化路径判断逻辑

---

### 步骤 2: 修改 `loader.ts`

**目标：** 将所有路径转换从 `/api/market/` 改为 `/market/`

**改动位置：** 行 83, 85, 93, 95, 130, 132, 143, 145

---

### 步骤 3: 修改 `client.ts`

**目标：** 将 `apiBase` 默认值从 `/api/market` 改为 `/market`

**改动位置：** 行 39

---

### 步骤 4: 修改 `publish-component.ts`

**目标：** 发布脚本生成的 URL 使用 `/market/` 前缀

**改动位置：** 行 532

---

### 步骤 5: 修改 `publish-component.sh`

**目标：** Shell 脚本生成的 URL 使用 `/market/` 前缀

**改动位置：** 行 148-149

---

### 步骤 6: 更新 `registry.json`

**目标：** 将现有注册表中的 URL 从 `/api/market/` 改为 `/market/`

**执行命令：** `sed -i 's|/api/market/|/market/|g' /opt/market/registry.json`

---

### 步骤 7-10: 文档更新

**目标：** 更新所有相关文档中的路径说明

---

### 步骤 11: 验证测试

**目标：** 确认所有改动正常工作

---

## 状态说明

- ⏳ 待执行
- 🔄 进行中
- ✅ 已完成
- ❌ 失败/阻塞
