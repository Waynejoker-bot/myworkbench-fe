# Task Card Payload 协议

## 概述

Agent Service 输出任务卡片时，通过 Message Station 的标准消息通道传递。
前端通过 `parsePayloadToBlocks()` 识别 `type: 'TASK_CARD'` 并渲染为交互式卡片。

## Agent 输出格式

Agent 的消息 payload 需要是以下 JSON 格式的字符串：

```json
{
  "type": "TASK_CARD",
  "taskCard": {
    "id": "tc-{timestamp}-{random}",
    "title": "卡片标题",
    "summary": "卡片摘要/结论",
    "cardType": "visit_report | action_suggestion",
    "sourceAgent": "agent-id",
    "priority": "high | medium | low",
    "status": "draft | suggested",
    "assigneeRole": "manager | sales",
    "assigneeName": "可选，指定销售名",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "trustFlags": [],
    "businessContext": {
      "dealId": "可选",
      "customerId": "可选",
      "meetingId": "可选",
      "conversationId": "当前 session_id"
    },
    "explainability": {
      "confidence": 0.82,
      "freshness": "ISO8601",
      "dataTimeRange": "2026-03-20 ~ 2026-03-27",
      "coverage": 0.75,
      "missingData": ["缺失字段1", "缺失字段2"],
      "keyReasons": ["原因1", "原因2", "原因3"],
      "evidenceRefs": [
        {"type": "meeting_transcript", "id": "meeting-id", "label": "3月27日拜访录音"}
      ]
    },

    // visit_report 专有字段
    "meetingNotes": [
      {"label": "会议要点", "content": "要点内容"},
      {"label": "客户态度", "content": "态度描述"}
    ],
    "customerAttitude": "整体积极",
    "suggestedNextSteps": ["下一步1", "下一步2"],
    "recordingDuration": 2820,

    // action_suggestion 专有字段
    "suggestedAction": {
      "label": "建议动作标题",
      "editableDraft": "可编辑的建议内容",
      "dueDate": "2026-04-04"
    }
  }
}
```

## 消息发送方式

通过 Message Station 标准接口 `/msapi/send-message`：

```json
{
  "session_id": "当前会话ID",
  "round_id": "当前轮次ID",
  "message_id": "m-{unique}",
  "source": "agent-id",
  "target": "user-id",
  "payload": "{上面的 JSON 字符串}",
  "seq": 0,
  "status": 3,
  "timestamp": 1774705647000
}
```

注意：
- `status: 3` 表示 END（完整消息）
- `payload` 是 JSON 字符串，需要 `JSON.stringify()` 编码
- `source` 必须是 Agent ID，前端据此展示 Agent 头像和名称

## 状态更新

卡片创建后状态由前端 Zustand Store 管理。后续如需后端持久化：
- 提供 `PUT /api/task-cards/{id}/status` 接口
- 前端的 `TaskCardService` 接口已预留，只需替换 mock 实现为 real 实现

## 卡片类型

| cardType | 初始状态 | 生成方 | 场景 |
|----------|---------|--------|------|
| visit_report | draft | 销售 Agent | 拜访后自动生成汇报草稿 |
| action_suggestion | suggested | 主管 Agent | 汇总分析后生成行动建议 |

## 完整闭环流程

```
1. 销售拜访客户 → 销售 Agent 输出 visit_report (draft)
2. 销售在对话中确认汇报 → 状态变 reported → 自动上报主管 Agent
3. 主管 Agent 汇总多个汇报 → 输出 action_suggestion (suggested)
4. 主管在对话中确认 → 派发给销售 → 状态变 dispatched
5. 销售确认接收 → 执行 → 提交反馈 → 状态变 feedback_submitted
6. 主管确认反馈 → 状态变 completed → 闭环
```
