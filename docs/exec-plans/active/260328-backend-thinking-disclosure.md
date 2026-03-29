# 后端改动计划：Agent 思考过程披露优化

> **状态**: 待执行
> **目标**: 让后端输出的数据保留完整的叙事结构（thinking → tool → thinking → tool → response），前端能还原 Claude Code 风格的思考过程展示
> **涉及仓库**: https://github.com/zhuchaokn/agent-service

---

## 背景

当前 `StreamSender` 把所有 `thinking` 事件累积到同一个 `TextItem`，导致前端无法区分：
- 哪些文本是"思考过程"（中间推理）
- 哪些文本是"最终回复"（给用户看的结果）
- 多轮 thinking 之间的边界在哪里

目标是让 payload 的 `data` 数组保持原始叙事顺序，前端按顺序渲染即可呈现 Claude Code 风格的展示。

---

## 改动 1：TextItem 增加 role 字段

**文件**: `models/payload.py`

```python
# 当前（第 30-34 行）
class TextItem(BaseModel):
    """文本项"""
    itemType: Literal["text"] = "text"
    text: str

# 改为
class TextItem(BaseModel):
    """文本项"""
    itemType: Literal["text"] = "text"
    text: str
    role: str = "response"  # "thinking" | "response"
```

- `role: "thinking"` — Agent 的中间推理过程（"找到了 15 条新闻，让我筛选..."）
- `role: "response"` — 最终回复内容（默认值，向后兼容）

**注意**: `role` 默认值为 `"response"`，确保所有现有逻辑不受影响。

---

## 改动 2：StreamSender 保留叙事结构

**文件**: `services/stream_sender.py`

### 核心逻辑改动（`add` 方法，约第 98-231 行）

**当前行为**：
- `thinking` 事件：追加到最后一个 TextItem（所有轮次的 thinking 混在一起）
- `tool_call_start` 后再来 `thinking`：继续追加到同一个 TextItem

**目标行为**：
- `thinking` 事件：如果上一个 item 是 ToolDataItem（刚执行完工具），创建**新的** TextItem(role="thinking")
- `thinking` 事件：如果上一个 item 是 TextItem(role="thinking")，继续追加
- `response` 事件：创建 TextItem(role="response")

### 具体改动

#### 2a. thinking 处理（约第 124-139 行）

```python
# 当前
if result_type == "thinking":
    self._current_type = "thinking"
    if not self.pending_items or not isinstance(self.pending_items[-1], TextItem):
        await self._check_and_flush_if_full()
        self.pending_items.append(TextItem(text=result["content"]))
    else:
        self.pending_items[-1].text += result["content"]
    if self._should_send():
        await self._send_pending_items()

# 改为
if result_type == "thinking":
    self._current_type = "thinking"
    last = self.pending_items[-1] if self.pending_items else None

    # 如果上一个 item 是 thinking 的 TextItem，继续追加
    if isinstance(last, TextItem) and last.role == "thinking":
        last.text += result["content"]
    else:
        # 其他情况（无 item、上一个是 ToolItem、上一个是 response TextItem），创建新的 thinking TextItem
        await self._check_and_flush_if_full()
        self.pending_items.append(TextItem(text=result["content"], role="thinking"))

    if self._should_send():
        await self._send_pending_items()
```

#### 2b. thinking_final 处理（约第 141-153 行）

```python
# 当前
elif result_type == "thinking_final":
    self._current_type = "thinking"
    if self.pending_items and isinstance(self.pending_items[-1], TextItem):
        self.pending_items[-1].text = result["content"]
    else:
        await self._check_and_flush_if_full()
        self.pending_items.append(TextItem(text=result["content"]))
    await self._send_pending_items()

# 改为
elif result_type == "thinking_final":
    self._current_type = "thinking"
    last = self.pending_items[-1] if self.pending_items else None
    if isinstance(last, TextItem) and last.role == "thinking":
        last.text = result["content"]
    else:
        await self._check_and_flush_if_full()
        self.pending_items.append(TextItem(text=result["content"], role="thinking"))
    await self._send_pending_items()
```

#### 2c. response 处理（约第 155-174 行）

```python
# 当前
elif result_type == "response":
    if self._current_type == "thinking":
        await self._check_and_flush_if_full()
        self.pending_items.append(TextItem(text=""))
    self._current_type = "response"
    if not self.pending_items or not isinstance(self.pending_items[-1], TextItem):
        await self._check_and_flush_if_full()
        self.pending_items.append(TextItem(text=result["content"]))
    else:
        self.pending_items[-1].text += result["content"]
    if self._should_send():
        await self._send_pending_items()

# 改为
elif result_type == "response":
    self._current_type = "response"
    last = self.pending_items[-1] if self.pending_items else None

    # 如果上一个是 response TextItem，追加
    if isinstance(last, TextItem) and last.role == "response":
        last.text += result["content"]
    else:
        # 其他情况，创建新的 response TextItem
        await self._check_and_flush_if_full()
        self.pending_items.append(TextItem(text=result["content"], role="response"))

    if self._should_send():
        await self._send_pending_items()
```

#### 2d. response_final 处理（约第 176-188 行）

```python
# 改为
elif result_type == "response_final":
    self._current_type = "response"
    last = self.pending_items[-1] if self.pending_items else None
    if isinstance(last, TextItem) and last.role == "response":
        last.text = result["content"]
    else:
        await self._check_and_flush_if_full()
        self.pending_items.append(TextItem(text=result["content"], role="response"))
    await self._send_pending_items()
```

#### 2e. end 处理（约第 217-227 行）

```python
# 当前
elif result_type == "end":
    content = result.get("content", "").strip()
    if content:
        self._current_type = "response"
        if not self.pending_items or not isinstance(self.pending_items[-1], TextItem):
            self.pending_items.append(TextItem(text=content))
        else:
            self.pending_items[-1].text += content
    await self._send_end()

# 改为
elif result_type == "end":
    content = result.get("content", "").strip()
    if content:
        self._current_type = "response"
        last = self.pending_items[-1] if self.pending_items else None
        if isinstance(last, TextItem) and last.role == "response":
            last.text += content
        else:
            self.pending_items.append(TextItem(text=content, role="response"))
    await self._send_end()
```

---

## 改动 3：context 中增加 round 信息

**文件**: `services/stream_sender.py`

在 `_send_pending_items` 方法（约第 233 行）中，已有 `context["message_type"]`，增加当前 round 信息：

```python
async def _send_pending_items(self):
    if not self.pending_items:
        return
    payload = self._build_payload(self.pending_items)
    if payload is None:
        return
    context = self._build_context()
    context["message_type"] = self._current_type or "unknown"
    context["current_round"] = str(self.round_count)  # 新增
    await self._send_payload(payload.model_dump_json(), context=context)
```

---

## 改动后的 Payload 示例

### 改动前（所有 thinking 混在一起）
```json
{
  "type": "mixed",
  "data": [
    {"itemType": "text", "text": "让我搜索今日新闻...找到了15条，让我筛选...已获取全部详情"},
    {"itemType": "tool", "toolItem": {"name": "web_search", "arguments": {}, "result": "..."}},
    {"itemType": "tool", "toolItem": {"name": "read_url", "arguments": {}, "result": "..."}}
  ]
}
```

### 改动后（保留叙事结构）
```json
{
  "type": "mixed",
  "data": [
    {"itemType": "text", "text": "让我搜索今日新闻...", "role": "thinking"},
    {"itemType": "tool", "toolItem": {"name": "web_search", "arguments": {"query": "今日科技新闻"}, "result": "找到15条结果"}},
    {"itemType": "text", "text": "找到了15条，让我筛选最重要的5条。", "role": "thinking"},
    {"itemType": "tool", "toolItem": {"name": "read_url", "arguments": {"urls": ["..."]}, "result": "文章内容..."}},
    {"itemType": "text", "text": "已获取全部详情。现在整理早报格式。", "role": "thinking"},
    {"itemType": "text", "text": "📰 **今日早报 - 2024.03.28**\n1. ...\n2. ...", "role": "response"}
  ]
}
```

---

## 向后兼容性

| 方面 | 兼容策略 |
|------|---------|
| TextItem.role 默认值 | `"response"`，旧数据无 role 字段时前端按 response 处理 |
| 前端解析 | 前端会检查 `item.role`，不存在则默认 `"response"` |
| 其他 Agent 类型 | 不影响，SDK Agent 和其他 Agent 走同一个 StreamSender |
| 消息历史 | 旧消息无 role 字段，前端降级为当前展示方式 |

---

## 测试要点

1. 发送一条需要工具调用的消息（如"生成每日早报"），检查 payload 中：
   - thinking TextItem 和 response TextItem 的 role 字段是否正确
   - 多轮 thinking 是否被正确分割（工具调用后的 thinking 是新的 TextItem）
   - 工具调用的 ToolItem 顺序是否正确
2. 发送一条不需要工具调用的简单消息，检查：
   - 输出的 TextItem 是否有 `role: "response"`
   - 无异常行为
3. 检查 context 中是否包含 `current_round` 字段

---

## 改动文件清单

| 文件 | 改动内容 |
|------|---------|
| `models/payload.py` | TextItem 增加 `role: str = "response"` 字段 |
| `services/stream_sender.py` | thinking/response 处理逻辑改为按 role 分割 TextItem；context 增加 current_round |

总共 **2 个文件**，改动量较小，核心是 stream_sender.py 中的 thinking/response 事件处理逻辑。
