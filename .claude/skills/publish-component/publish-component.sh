#!/bin/bash
set -e

# Component Publish Script
# 正确发布组件到 /opt/market

MARKET_PATH="/opt/market"
# Skills 目录可能是 .claude/skills 或 ~/.claude/skills
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 如果是 .claude/skills，向上两级；如果是 ~/.claude/skills，特殊处理
if [[ "$SCRIPT_DIR" == */.claude/skills ]]; then
    PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
elif [[ "$SCRIPT_DIR" == */.claude ]]; then
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
else
    # 默认使用工作目录
    PROJECT_ROOT="/opt/claude/myworkbench-fe"
fi
GALLERY_DIR="$PROJECT_ROOT/gallery"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示使用说明
show_usage() {
    cat << EOF
Usage: publish-component <component-name>

发布组件到正确的市场目录 /opt/market

Arguments:
  component-name    组件名称 (例如: file-browser, hello-world)

Examples:
  publish-component file-browser
  publish-component hello-world

EOF
    exit 1
}

# 检查参数
if [ $# -eq 0 ]; then
    show_usage
fi

COMPONENT_NAME="$1"
SOURCE_DIR="$GALLERY_DIR/$COMPONENT_NAME"
TARGET_DIR="$MARKET_PATH/components/$COMPONENT_NAME"

# 验证源目录存在
if [ ! -d "$SOURCE_DIR" ]; then
    log_error "Component directory not found: $SOURCE_DIR"
    log_info "Available components:"
    ls -1 "$GALLERY_DIR" 2>/dev/null || echo "  (none)"
    exit 1
fi

# 验证 manifest.json 存在
if [ ! -f "$SOURCE_DIR/manifest.json" ]; then
    log_error "manifest.json not found in: $SOURCE_DIR"
    exit 1
fi

# 读取 manifest 信息
VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$SOURCE_DIR/manifest.json" | cut -d'"' -f4)
DESCRIPTION=$(grep -o '"description"[[:space:]]*:[[:space:]]*"[^"]*"' "$SOURCE_DIR/manifest.json" | cut -d'"' -f4)

log_info "Publishing component: $COMPONENT_NAME v$VERSION"
log_info "Source: $SOURCE_DIR"
log_info "Target: $TARGET_DIR"

# 创建目标目录
mkdir -p "$TARGET_DIR"

# 复制 manifest.json
cp "$SOURCE_DIR/manifest.json" "$TARGET_DIR/"
log_info "Copied manifest.json"

# 复制 package.json (如果存在)
if [ -f "$SOURCE_DIR/package.json" ]; then
    cp "$SOURCE_DIR/package.json" "$TARGET_DIR/"
    log_info "Copied package.json"
fi

# 复制 README.md (如果存在)
if [ -f "$SOURCE_DIR/README.md" ]; then
    cp "$SOURCE_DIR/README.md" "$TARGET_DIR/"
    log_info "Copied README.md"
fi

# 复制 index.js (优先使用已编译的版本)
if [ -f "$SOURCE_DIR/index.js" ]; then
    # 检查是否是真正的 JS 文件（不是 TS 文件复制过来的）
    if head -1 "$SOURCE_DIR/index.js" | grep -q "^var"; then
        cp "$SOURCE_DIR/index.js" "$TARGET_DIR/index.js"
        cp "$SOURCE_DIR/index.js.map" "$TARGET_DIR/" 2>/dev/null || true
        log_info "Copied compiled index.js"
    else
        log_warn "index.js appears to be uncompiled, copying anyway"
        cp "$SOURCE_DIR/index.js" "$TARGET_DIR/index.js"
    fi
elif [ -f "$SOURCE_DIR/index.ts" ]; then
    log_warn "No compiled index.js found, copying index.ts as index.js"
    cp "$SOURCE_DIR/index.ts" "$TARGET_DIR/index.js"
fi

# 更新 registry.json
log_info "Updating registry.json..."

COMPONENT_ID="com.workbench.$COMPONENT_NAME"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# 使用 Python 更新 registry.json (更可靠)
python3 << PYTHON_SCRIPT
import json
from datetime import datetime

registry_path = "$MARKET_PATH/registry.json"
component_name = "$COMPONENT_NAME"
component_id = "$COMPONENT_ID"
timestamp = "$TIMESTAMP"

# 读取现有 registry
with open(registry_path, 'r') as f:
    registry = json.load(f)

# 读取组件 manifest
with open("$SOURCE_DIR/manifest.json", 'r') as f:
    manifest = json.load(f)

# 构建组件条目
entry = {
    "name": manifest["name"],
    "version": manifest["version"],
    "description": manifest["description"],
    "author": manifest.get("author", "ZC"),
    "icon": manifest.get("icon", ""),
    "manifestUrl": f"/market/components/{component_name}/manifest.json",
    "entryUrl": f"/market/components/{component_name}/index.js",
    "capabilities": {
        "required": manifest["capabilities"].get("required", []),
        "optional": manifest["capabilities"].get("optional", [])
    },
    "publishedAt": timestamp
}

# 更新 registry
registry[component_id] = entry

# 写回
with open(registry_path, 'w') as f:
    json.dump(registry, f, indent=2)

print(f"Updated registry for {component_id}")
PYTHON_SCRIPT

log_success "Component published successfully!"
log_info "Component: $COMPONENT_NAME v$VERSION"
log_info "Location: $TARGET_DIR"
