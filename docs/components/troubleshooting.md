# Issues

已知问题和解决方案。

## file-browser 组件

### ✅ 已修复

#### 1. 点击文件一直显示"加载中..."

**问题描述**: 点击文件后，接口正确返回数据，但组件一直显示"加载中..."状态。

**原因**: `render()` 在 `setLoading(false)` 之前被调用，导致模板渲染时 `loading` 状态仍为 `true`。

**解决方案**:
```typescript
// 错误写法
try {
  this.fileContent = response.content;
  this.render();
} finally {
  this.setLoading(false);  // render 已经执行，loading 还是 true
}

// 正确写法
try {
  this.fileContent = response.content;
  this.setLoading(false);  // 先清除 loading
  this.render();           // 再渲染
} catch (err) {
  this.setLoading(false);
  this.render();
}
```

**修复位置**: `index.ts:317-342`

---

#### 2. 代码区域没有滚动条

**问题描述**: 文件内容超过一屏时，无法滚动查看。

**原因**: 多个容器都设置了 `overflow`，导致嵌套滚动冲突。

**解决方案**: 确保只有一层滚动容器：
```css
.fb-content-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  min-height: 0;
}

.fb-code-container {
  display: flex;
  /* 不要设置 overflow */
}
```

**修复位置**: `index.ts:1199-1240`

---

#### 3. 行号只显示 1

**问题描述**: 所有代码行都显示行号 1。

**原因**: 在模板字符串中使用 `split('\\n')`，反斜杠被转义成字面量。

**解决方案**:
```typescript
// 错误写法
${(this.fileContent || '').split('\\n').map((_, i) => `<div>${i + 1}</div>`).join('')}

// 正确写法：在模板外预先生成
const lines = this.fileContent.split('\n');
const lineNumbersHtml = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
```

**修复位置**: `index.ts:925-965`

---

#### 4. 拖动工作台时组件不响应大小变化

**问题描述**: 拖动调整 workbench 窗口大小时，file-browser 没有跟着变化。

**原因**: ResizeObserver 调用了 `host.ui.resize()`，这不是用来做响应式布局的。

**解决方案**: 让 CSS flex 布局自动处理：
```css
.fb-container {
  height: 100%;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
}

.fb-content {
  flex: 1;
  min-height: 0;  /* 让 flex 子元素正确收缩 */
}
```

**修复位置**: `index.ts:1002-1012`, `index.ts:684-699`

---

#### 5. 右侧内容被遮挡

**问题描述**: 全屏时，右侧内容看起来被遮挡了。

**原因**: 缺少右侧 padding。

**解决方案**:
```css
.fb-content-body {
  padding-right: 8px;
}
```

**修复位置**: `index.ts:1199-1206`

---

## 已知限制

### file-browser

1. **大文件性能**: 读取超大文件（>10MB）时可能卡顿
2. **二进制文件**: 不支持二进制文件显示
3. **图片文件**: 只显示文件名，不预览图片内容
4. **编辑功能**: 只读模式，不支持编辑文件

---

## 待办事项

### file-browser

- [ ] 添加图片预览功能
- [ ] 支持大文件分页加载
- [ ] 添加搜索功能
- [ ] 支持书签/收藏
- [ ] 添加暗黑模式
- [ ] 支持多选操作

---

## 报告新问题

如发现新问题，请记录以下信息：

1. **问题描述**: 清晰描述问题现象
2. **复现步骤**: 如何触发问题
3. **预期行为**: 期望的正确行为
4. **环境信息**: 浏览器、屏幕尺寸等
5. **错误日志**: 控制台错误信息
