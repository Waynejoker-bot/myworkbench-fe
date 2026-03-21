#!/bin/bash
# 发布脚本：构建并复制到 /opt/publish/fe

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLISH_DIR="/opt/publish/fe"

echo "📦 开始构建..."
npm run build

echo "📋 复制构建产物到 $PUBLISH_DIR..."
# 创建目标目录
mkdir -p "$PUBLISH_DIR"

# 清空目标目录（保留 .git 等）
rm -rf "$PUBLISH_DIR"/*

# 复制 dist 目录内容
cp -r "$PROJECT_ROOT/dist/"* "$PUBLISH_DIR/"

echo "✅ 发布完成！"
echo "   构建产物已复制到: $PUBLISH_DIR"
