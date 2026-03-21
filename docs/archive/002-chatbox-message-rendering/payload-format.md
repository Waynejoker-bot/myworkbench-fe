# Payload 格式协议

## 概述

本文档定义了 ChatBox 系统中消息 payload 的格式协议，与 Message Station 和 Agent Service 保持一致。

## Payload 格式

### 基本结构

```json
{
  "type": "text",
  "data": [
    {
      "itemType": "text",
      "text": "消息内容"
    }
  ]
}
```

### Payload 类型

| type | 说明 | data 结构 |
|------|------|----------|
| `text` | 文本消息 | `[{"itemType": "text", "text": "内容"}]` |
| `tool` | 工具结果 | `[{"itemType": "tool", "toolItem": {"name": "工具名", "arguments": {}, "result": "结果"}}]` |
| `image` | 图片消息 | `[{"itemType": "image", "image": "base64或URL"}]` |
| `audio` | 音频消息 | `[{"itemType": "audio", "audio": "base64或URL"}]` |
| `video` | 视频消息 | `[{"itemType": "video", "video": "base64或URL"}]` |

### 示例

#### 纯文本消息
```json
{
  "type": "text",
  "data": [
    {
      "itemType": "text",
      "text": "你好，世界！"
    }
  ]
}
```

#### 工具调用消息
```json
{
  "type": "tool",
  "data": [
    {
      "itemType": "tool",
      "toolItem": {
        "name": "web_search",
        "arguments": {"query": "Python教程"},
        "result": "找到 5 个相关结果..."
      }
    }
  ]
}
```

#### 图片消息
```json
{
  "type": "image",
  "data": [
    {
      "itemType": "image",
      "image": "data:image/png;base64,iVBORw0KGgo..."
    }
  ]
}
```

#### 混合消息
```json
{
  "type": "text",
  "data": [
    {
      "itemType": "text",
      "text": "我帮你执行了这个命令："
    },
    {
      "itemType": "tool",
      "toolItem": {
        "name": "code_execution",
        "arguments": {"code": "print('Hello')"},
        "result": "Hello",
        "status": "success"
      }
    }
  ]
}
```

## 与现有系统的兼容性

### Message Station 格式
- Message Station 中的 `payload` 字段直接存储上述 JSON 字符串
- 与 Agent Service 的 session API 返回格式一致

### 前端处理
1. 从 API 获取的 `payload` 是 JSON 字符串
2. 需要解析为可显示的内容块
3. 支持多种类型的内容块混合

### 转换关系

```
API Response (payload: JSON string)
    ↓
parsePayloadToBlocks()
    ↓
ContentBlock[]
    ↓
MessageContent 组件渲染
```

---

*文档创建时间：2026-02-08*
