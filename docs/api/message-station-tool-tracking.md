# Message Station 工具执行状态跟踪 API

## 概述

本文档描述如何跟踪和管理 Message Station 中 Agent 调用工具的执行状态。

**参考文档**:
- [Message Station 协议](../../message-station/docs/PROTOCOL.md)
- [Message Station 架构](../../message-station/docs/ARCHITECTURE.md)

---

## 背景

### 问题

当 Agent 调用工具时，前端需要：

1. **解析工具调用** - 从消息内容中提取工具调用信息
2. **跟踪执行状态** - 实时显示工具的 pending/running/success/error 状态
3. **显示执行结果** - 将工具返回的内容展示给用户
4. **处理异常** - 确保工具调用失败不影响消息渲染

### 消息格式

Message Station 使用 XML 标记来表示工具调用和输出：

**工具调用**:
```xml
<tool_call>
<invoke name="tool_name">
<parameter name="param1">value1</parameter>
<parameter name="param2">value2</parameter>
</invoke>
</tool_call>
```

**工具输出**:
```xml
<tool_output>
<result call_id="xxx">
<output>执行结果内容</output>
<error>错误信息（如果有）</error>
</result>
</tool_output>
```

---

## API 端点

### 1. 获取工具执行状态

**端点**: `GET /api/v1/tool-tracking/status/{call_id}`

**描述**: 获取指定工具调用的执行状态

**请求参数**:
- `call_id` (路径参数): 工具调用 ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "call_id": "tool_search_123_1707331200000",
    "tool_name": "search",
    "status": "success",
    "parameters": {
      "query": "TypeScript types",
      "limit": 10
    },
    "result": {
      "results": [...]
    },
    "error": null,
    "start_time": 1707331200000,
    "end_time": 1707331205000
  }
}
```

**状态枚举**:
- `pending` - 等待执行
- `running` - 正在执行
- `success` - 执行成功
- `error` - 执行失败

---

### 2. 更新工具执行状态

**端点**: `PUT /api/v1/tool-tracking/status/{call_id}`

**描述**: 更新工具调用的执行状态

**请求体**:
```json
{
  "call_id": "tool_search_123_1707331200000",
  "status": "success",
  "result": {
    "results": [...]
  },
  "error": null
}
```

**响应**: 与获取工具执行状态相同

---

### 3. 批量获取工具状态

**端点**: `POST /api/v1/tool-tracking/status/batch`

**描述**: 批量获取多个工具调用的执行状态

**请求体**:
```json
{
  "call_ids": [
    "tool_search_123_1707331200000",
    "tool_code_456_1707331201000"
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "statuses": [
      {
        "call_id": "tool_search_123_1707331200000",
        "tool_name": "search",
        "status": "success",
        ...
      },
      {
        "call_id": "tool_code_456_1707331201000",
        "tool_name": "code_interpreter",
        "status": "running",
        ...
      }
    ]
  }
}
```

---

## 前端实现

### 工具执行状态管理

#### 工具类: `ToolExecutionManager`

位置: `src/workbench/utils/tool-execution.ts`

```typescript
import {
  ToolExecutionManager,
  createToolExecutionState,
  updateToolExecutionState
} from '@/workbench/utils/tool-execution';

// 创建管理器实例
const manager = new ToolExecutionManager();

// 注册工具调用
const state = manager.registerToolCall(
  'tool_search_123',
  'search',
  { query: 'test', limit: 10 }
);

// 开始执行
manager.startToolExecution('tool_search_123');

// 完成执行
manager.completeToolExecution('tool_search_123', { results: [...] });

// 获取状态
const currentState = manager.getToolState('tool_search_123');
```

#### React Hook: `useToolExecution`

位置: `src/hooks/useToolExecution.ts`

```typescript
import { useToolExecution } from '@/hooks/useToolExecution';

function MyComponent() {
  const {
    registerToolCall,
    startToolExecution,
    completeToolExecution,
    failToolExecution,
    getRunningTools
  } = useToolExecution();

  // 注册并开始执行工具
  const handleToolCall = () => {
    const state = registerToolCall('tool_123', 'search', { query: 'test' });
    startToolExecution('tool_123');

    // 模拟异步执行
    setTimeout(() => {
      completeToolExecution('tool_123', { results: [] });
    }, 1000);
  };

  return <button onClick={handleToolCall}>执行工具</button>;
}
```

---

### 消息解析

#### 解析工具调用

位置: `src/workbench/utils/message-parser.ts`

```typescript
import { parseToolCalls, parsedToToolCallBlock } from '@/workbench/utils/message-parser';

const content = `
<tool_call>
<invoke name="search">
<parameter name="query">TypeScript</parameter>
</invoke>
</tool_call>
`;

// 解析工具调用
const toolCalls = parseToolCalls(content);

// 转换为内容块
const blocks = toolCalls.map(call => parsedToToolCallBlock(call, 'pending'));
```

#### 解析工具输出

```typescript
import { parseToolOutputs } from '@/workbench/utils/message-parser';

const content = `
<tool_output>
<result call_id="tool_123">
<output>{ "results": [] }</output>
</result>
</tool_output>
`;

const outputs = parseToolOutputs(content);
const result = outputs.get('tool_123'); // { output: '...', status: 'success' }
```

---

### 消息排序

确保消息按正确的时间顺序渲染（旧消息在前，新消息在后）：

位置: `src/workbench/utils/message-ordering.ts`

```typescript
import { sortMessagesByTime } from '@/workbench/utils/message-ordering';

// 对消息排序
const sortedMessages = sortMessagesByTime(messages);

// 或者确保已排序（仅在未排序时才排序）
const messages = ensureMessagesSorted(rawMessages);
```

---

### API 调用

位置: `src/workbench/utils/tool-tracking-api.ts`

```typescript
import {
  getToolExecutionStatus,
  updateToolExecutionStatus,
  pollToolExecutionStatus
} from '@/workbench/utils/tool-tracking-api';

// 获取工具状态
const status = await getToolExecutionStatus('tool_123');

// 更新工具状态
await updateToolExecutionStatus({
  call_id: 'tool_123',
  status: 'success',
  result: { data: '...' }
});

// 轮询工具状态（直到完成）
const finalStatus = await pollToolExecutionStatus('tool_123', {
  interval: 1000,  // 每秒轮询一次
  timeout: 30000,  // 最多等待 30 秒
  onProgress: (status) => console.log('当前状态:', status.status)
});
```

---

## UI 组件集成

### 在 ChatMessages 中使用

位置: `src/components/chat/ChatMessages.tsx`

```typescript
import { sortMessagesByTime } from '@/workbench/utils/message-ordering';

export function ChatMessages({ uiMessages }: ChatMessagesProps) {
  // 确保消息按时间升序排序（旧消息在前，新消息在后）
  const displayMessages = useMemo(() => {
    return sortMessagesByTime(uiMessages);
  }, [uiMessages]);

  return (
    <div className="space-y-6">
      {displayMessages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

---

## 类型定义

### ToolExecutionState

```typescript
interface ToolExecutionState {
  callId: string;
  toolName: string;
  status: ToolExecutionStatus;
  parameters: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;

  // 计算属性
  isCompleted: boolean;
  isRunning: boolean;
  isFailed: boolean;
  duration?: number;
}
```

### ToolExecutionStatus

```typescript
type ToolExecutionStatus = 'pending' | 'running' | 'success' | 'error';
```

### ToolCallBlock (内容块)

```typescript
interface ToolCallBlock extends ContentBlock {
  type: ContentType.TOOL_CALL;
  id: string;  // callId
  toolName: string;
  parameters: Record<string, unknown>;
  status: ToolExecutionStatus;
  result?: unknown;
  error?: string;
}
```

---

## 配置常量

位置: `src/workbench/utils/constants.ts`

```typescript
import {
  TOOL_EXECUTION_DEFAULTS,
  TOOL_EXECUTION_STATUS_MAP,
  API_ENDPOINTS,
  getToolStatusDisplay,
  getErrorMessage
} from '@/workbench/utils/constants';

// 获取工具状态显示信息
const display = getToolStatusDisplay('running');
// { label: '执行中', icon: '🔄', color: '#3B82F6' }

// 获取错误消息
const errorMsg = getErrorMessage('TOOL_EXECUTION_TIMEOUT');
// '工具执行超时，请稍后重试'
```

---

## 错误处理

所有 API 调用都应包含错误处理：

```typescript
try {
  const status = await getToolExecutionStatus('tool_123');
  // 处理成功响应
} catch (error) {
  if (error instanceof ToolTrackingApiError) {
    if (error.code === 'NETWORK_ERROR') {
      // 处理网络错误
      console.error('网络连接失败');
    } else if (error.code === 'TIMEOUT_ERROR') {
      // 处理超时
      console.error('工具执行超时');
    }
  } else {
    // 处理其他错误
    console.error('未知错误:', error);
  }
}
```

**错误码**:
- `NETWORK_ERROR` - 网络连接失败
- `TIMEOUT_ERROR` - 工具执行超时
- `HTTP_ERROR` - HTTP 请求失败
- `API_ERROR` - API 返回错误

---

## 最佳实践

### 1. 消息排序

**重要**: 始终确保消息按时间升序排序（旧消息在前，新消息在后）

```typescript
// ✅ 正确
const sortedMessages = sortMessagesByTime(messages);

// ❌ 错误（可能导致消息顺序混乱）
const unsortedMessages = messages;
```

### 2. 工具状态管理

- 使用 `ToolExecutionManager` 集中管理工具状态
- 使用 React Hook 在组件中访问和更新状态
- 及时清理已完成的工具状态（可选）

### 3. 错误处理

- 所有 API 调用都应包含 try-catch
- 工具调用失败不应影响消息渲染
- 显示友好的错误消息给用户

### 4. 性能优化

- 使用批量 API 减少请求次数
- 轮询时设置合理的间隔和超时
- 使用 useMemo/useCallback 优化组件性能

---

## 相关文件

```
src/
├── workbench/
│   ├── types/
│   │   ├── content-block.ts        # 内容块类型定义
│   │   ├── message-station.ts      # Message Station 消息类型
│   │   └── index.ts                # 类型导出
│   └── utils/
│       ├── tool-execution.ts       # 工具执行状态管理
│       ├── message-parser.ts       # 消息解析
│       ├── message-ordering.ts     # 消息排序
│       ├── tool-tracking-api.ts    # API 调用
│       └── constants.ts            # 配置常量
├── hooks/
│   └── useToolExecution.ts         # React Hook
└── components/
    └── chat/
        ├── ChatMessages.tsx        # 消息列表组件
        └── message/
            └── index.tsx           # 消息气泡组件
```

---

## 更新日志

- **2025-02-08**: 初始版本，实现工具执行状态跟踪功能
  - 创建工具执行状态管理器
  - 实现消息解析工具
  - 实现 API 调用函数
  - 创建 React Hook
  - 修复消息渲染顺序问题

---

**维护者**: Claude Code
**最后更新**: 2025-02-08
