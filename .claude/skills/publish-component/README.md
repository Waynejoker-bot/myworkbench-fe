# publish-component

发布组件到正确的市场目录 `/opt/market`。

## 参数

- `component`: 组件路径（相对于 gallery 目录，例如 `file-browser`、`hello-world`）

## 说明

将 gallery 中的组件发布到正确的市场目录 `/opt/market`，包括：
1. 复制组件文件到 `/opt/market/components/<component-name>/`
2. 复制已编译的 `index.js`（如果存在）
3. 复制 `manifest.json`、`package.json`、`README.md`
4. 更新 `/opt/market/registry.json`
