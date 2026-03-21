# Message Station API 更新设计方案

## 1. 需求概述

根据 Message Station API 文档更新（v1.1），需要适配以下两个关键变更：

### 变更1：poll-message 接口需要传入 last_update_time 参数
- **当前接口**：`GET /msapi/poll-message?session_id=xxx`
- **新接口**：`GET /msapi/poll-message?session_id=xxx&last_update_time=1738521600000`
- **核心要求**：
  1. 每次调用都必须传入 `last_update_time` 参数（毫秒时间戳）
  2. 必须使用当前能获取到的最晚的 `update_time` 作为入参
  3. 首次连接时，可以先获取历史消息，用历史消息中最晚的 `update_time` 作为起点；或使用 `Date.now()` 作为起点
  4. 断线重连时，使用上次保存的 `last_update_time`

### 变更2：获取历史消息改用新接口
- **旧接口**（可能还在用）：`/api/sessions/${id}/messages`
- **新接口**：`GET /msapi/messages?session_id=xxx&page=1&page_size=200`
- **返回格式**：包含 `messages` 数组（按 id 倒序）、`total`、`page`、`page_size`、`total_pages`

---

## 2. 类型定义更新

### 2.1 更新 `src/workbench/types/message-station.ts`

**新增类型**：

```typescript
/**
 * SSE Connected 事件数据
 * 当 SSE 连接建立时返回
 */
export interface SSEConnectedEvent {
  session_id: string;
  last_update_time: number;  // 毫秒时间戳
}

/**
 * 历史消息分页响应
 * 从 /msapi/messages 接口返回
 */
export interface MessagesPageResponse {
  /** 消息列表（按 id 倒序，最新的在前） */
  messages: RawMessage[];
  /** 消息总数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页消息数量 */
  page_size: number;
  /** 总页数 */
  total_pages: number;
}

/**
 * 会话时间戳追踪
 * 用于追踪每个会话的最后更新时间
 */
export interface SessionTimestamps {
  /** 会话 ID */
  session_id: string;
  /** 最后收到的消息的 update_time */
  last_update_time: number;
  /** 最后更新时间戳 */
  last_updated: number;
}
```

### 2.2 更新 `src/workbench/types/storage.ts`

**扩展 StorageKey 枚举**：

```typescript
export enum StorageKey {
  // ... 现有 key ...

  /** Session timestamps for Message Station polling */
  SESSION_TIMESTAMPS = 'ms-session-timestamps',
}
```

**扩展 WorkbenchStorage 接口**：

```typescript
export interface WorkbenchStorage {
  // ... 现有字段 ...

  /** Session timestamps for Message Station polling */
  sessionTimestamps?: Record<string, number>;  // session_id -> last_update_time
}
```

---

## 3. API 调用层修改

### 3.1 新增 `src/api/message-station.ts`

**新文件**：封装 Message Station API 调用

```typescript
/**
 * Message Station API 封装
 * 处理与消息队列服务的所有交互
 */

import type { MessagesPageResponse } from '@/workbench/types/message-station';

const MSAPI_BASE = '/msapi';

/**
 * 获取历史消息（分页）
 * @param sessionId 会话 ID
 * @param page 页码（从 1 开始）
 * @param pageSize 每页消息数量（最大 1000）
 */
export async function getMessages(
  sessionId: string,
  page = 1,
  pageSize = 200
): Promise<MessagesPageResponse> {
  const params = new URLSearchParams({
    session_id: sessionId,
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  const response = await fetch(`${MSAPI_BASE}/messages?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 提取消息列表中最晚的 update_time
 * @param messages 消息列表
 * @returns 最晚的 update_time，如果没有消息则返回 0
 */
export function extractLatestUpdateTime(messages: Array<{ update_time?: number }>): number {
  if (!messages || messages.length === 0) {
    return 0;
  }

  const times = messages
    .map(m => m.update_time)
    .filter((t): t is number => t !== undefined && t !== null);

  return times.length > 0 ? Math.max(...times) : 0;
}
```

### 3.2 更新 `src/api/chat.ts`

**关键修改点**：

1. **修改 `PollMessage` 接口的 `update_time` 类型**：
   ```typescript
   export interface PollMessage {
     // ... 现有字段 ...
     update_time: number;  // 从 string 改为 number（毫秒时间戳）
   }
   ```

2. **新增 SSE Connected 事件处理类型**：
   ```typescript
   export interface SSEConnectedData {
     session_id: string;
     last_update_time: number;
   }

   type ConnectedCallback = (data: SSEConnectedData) => void;
   ```

3. **修改 `startPolling` 函数签名**：
   ```typescript
   export function startPolling(
     sessionId: string,
     lastUpdateTime: number,  // 新增参数：毫秒时间戳
     onMessage: MessageCallback,
     onConnected?: ConnectedCallback,  // 新增回调
     onError?: ErrorCallback
   ): () => void
   ```

4. **修改 SSE URL 构建逻辑**：
   ```typescript
   const url = `${MSAPI_BASE}/poll-message?session_id=${sessionId}&last_update_time=${lastUpdateTime}`;
   ```

5. **处理 connected 事件**：
   ```typescript
   eventSource.addEventListener('connected', (event) => {
     const data: SSEConnectedData = JSON.parse(event.data);
     console.log('[SSE] Connected:', data);
     onConnected?.(data);  // 通知上层保存 last_update_time
   });
   ```

---

## 4. 状态管理设计

### 4.1 时间戳存储策略

#### 方案选择：**内存状态 + localStorage 持久化**

**理由**：
- **内存状态**：快速访问，避免频繁读取 localStorage
- **localStorage 持久化**：断线重连时恢复状态，刷新页面后保留
- **每个会话独立存储**：支持多个会话切换

#### 存储结构：

```typescript
// 内存状态（在 useChatMessages Hook 中维护）
const sessionTimestampsRef = useRef<Record<string, number>>({});

// localStorage 结构
{
  "ms-session-timestamps": {
    "session-123": 1738521605000,
    "session-456": 1738521678000
  }
}
```

### 4.2 时间戳获取逻辑（优先级从高到低）

| 场景 | 时间戳来源 | 说明 |
|------|-----------|------|
| 连续轮询 | 收到消息的 `update_time` | 每次收到消息后更新 |
| SSE Connected 事件 | 事件返回的 `last_update_time` | 连接建立时使用 |
| 断线重连 | localStorage 恢复 | 从持久化存储读取 |
| 历史消息加载后 | 历史消息中最晚的 `update_time` | 作为轮询起点 |
| 首次连接（无历史） | `Date.now()` | 使用当前时间 |

### 4.3 时间戳更新时机

```
┌─────────────────────────────────────────────────────────────┐
│                     会话生命周期                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 会话创建/切换                                            │
│     ├── 尝试从 localStorage 读取 last_update_time            │
│     └── 如果没有，初始化为 0                                 │
│                                                             │
│  2. 加载历史消息（如果有）                                   │
│     └── 提取最晚的 update_time，覆盖步骤1的值                │
│                                                             │
│  3. 启动 SSE 轮询                                           │
│     └── 使用当前 last_update_time 作为参数                  │
│                                                             │
│  4. 收到 SSE Connected 事件                                 │
│     └── 更新内存状态和 localStorage                         │
│                                                             │
│  5. 收到消息（SSE message 事件）                             │
│     ├── 处理消息内容                                        │
│     └── 更新 last_update_time = max(current, msg.update_time)│
│                                                             │
│  6. 断线重连                                                │
│     └── 使用内存状态中的 last_update_time（如果还在）       │
│        否则从 localStorage 读取                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 具体实现步骤

### 5.1 修改文件清单

| 顺序 | 文件 | 修改类型 | 依赖 |
|------|------|----------|------|
| 1 | `src/workbench/types/message-station.ts` | 修改 | 无 |
| 2 | `src/workbench/types/storage.ts` | 修改 | 无 |
| 3 | `src/api/message-station.ts` | 新建 | 1 |
| 4 | `src/api/chat.ts` | 修改 | 1, 3 |
| 5 | `src/workbench/storage/index.ts` | 修改 | 2 |
| 6 | `src/hooks/useChatMessages.ts` | 修改 | 1, 4, 5 |
| 7 | `src/api/session.ts` | 可选：保留或标记废弃 | 无 |

### 5.2 详细修改点

#### 步骤 1：类型定义扩展
**文件**：`src/workbench/types/message-station.ts`

**操作**：
- 新增 `SSEConnectedEvent` 接口
- 新增 `MessagesPageResponse` 接口
- 新增 `SessionTimestamps` 接口
- 导出所有新类型

**验证**：
- TypeScript 编译无错误
- 类型导出正确

---

#### 步骤 2：存储类型扩展
**文件**：`src/workbench/types/storage.ts`

**操作**：
- 在 `StorageKey` 枚举中添加 `SESSION_TIMESTAMPS = 'ms-session-timestamps'`
- 在 `WorkbenchStorage` 接口中添加 `sessionTimestamps?: Record<string, number>`

**验证**：
- TypeScript 编译无错误

---

#### 步骤 3：新建 Message Station API 模块
**文件**：`src/api/message-station.ts` (新建)

**操作**：
- 实现 `getMessages()` 函数
- 实现 `extractLatestUpdateTime()` 工具函数
- 导出所有函数

**验证**：
- TypeScript 编译无错误
- 函数签名符合 MSAPI 文档

---

#### 步骤 4：更新 chat.ts
**文件**：`src/api/chat.ts`

**操作**：
1. 修改 `PollMessage.update_time` 类型：`string` -> `number`
2. 新增 `SSEConnectedData` 接口
3. 新增 `ConnectedCallback` 类型
4. 修改 `startPolling()` 函数签名：
   - 添加 `lastUpdateTime: number` 参数
   - 添加 `onConnected?: ConnectedCallback` 参数
5. 修改 SSE URL 构建逻辑，添加 `last_update_time` 参数
6. 在 `connected` 事件监听器中调用 `onConnected` 回调

**验证**：
- TypeScript 编译无错误
- 导出的函数签名正确

---

#### 步骤 5：扩展 Storage 实现
**文件**：`src/workbench/storage/index.ts`

**操作**：
1. 在 `defaultStorage` 中添加 `sessionTimestamps: {}`
2. 在 `get()` 方法中合并 `sessionTimestamps` 字段
3. 新增方法：
   ```typescript
   /**
    * Get last_update_time for a session
    */
   getSessionTimestamp(sessionId: string): number

   /**
    * Save last_update_time for a session
    */
   saveSessionTimestamp(sessionId: string, timestamp: number): StorageResult

   /**
    * Remove timestamp for a session
    */
   removeSessionTimestamp(sessionId: string): StorageResult

   /**
    * Clear all session timestamps
    */
   clearSessionTimestamps(): StorageResult
   ```

**验证**：
- TypeScript 编译无错误
- 新方法能正确读写 localStorage

---

#### 步骤 6：更新 useChatMessages Hook（核心）
**文件**：`src/hooks/useChatMessages.ts`

**操作**：

1. **新增 import**：
   ```typescript
   import { getMessages, extractLatestUpdateTime } from '@/api/message-station';
   import { workbenchStorage } from '@/workbench/storage';
   ```

2. **新增状态**：
   ```typescript
   // 当前会话的 last_update_time
   const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
   ```

3. **新增 Ref**：
   ```typescript
   // 跟踪是否已初始化 last_update_time
   const initializedRef = useRef(false);
   ```

4. **修改 loadMessages 逻辑**：
   ```typescript
   const loadMessages = async () => {
     setIsLoading(true);
     try {
       // 1. 尝试从 localStorage 恢复 last_update_time
       const savedTimestamp = workbenchStorage.getSessionTimestamp(activeConversationId);
       setLastUpdateTime(savedTimestamp);

       // 2. 从新的 MSAPI 接口获取历史消息
       const data = await getMessages(activeConversationId, 1, 200);
       const rawMsgs: RawMessage[] = data.messages || [];

       // 3. 从历史消息中提取最晚的 update_time
       const latestTime = extractLatestUpdateTime(rawMsgs);
       if (latestTime > 0) {
         const newTimestamp = Math.max(savedTimestamp, latestTime);
         setLastUpdateTime(newTimestamp);
         workbenchStorage.saveSessionTimestamp(activeConversationId, newTimestamp);
       }

       // 4. 处理消息
       handleNewMessages(rawMsgs, true);
     } catch (error) {
       console.error('Failed to load messages:', error);
       // ... 错误处理
     } finally {
       setIsLoading(false);
     }
   };
   ```

5. **修改 handlePollMessage**：
   ```typescript
   const handlePollMessage = useCallback((data: PollMessage) => {
     // ... 现有逻辑 ...

     // 更新 last_update_time
     if (data.update_time && data.update_time > lastUpdateTime) {
       const newTimestamp = data.update_time;
       setLastUpdateTime(newTimestamp);
       workbenchStorage.saveSessionTimestamp(activeConversationId, newTimestamp);
     }

     // ... 现有逻辑 ...
   }, [activeConversationId, lastUpdateTime, handleNewMessages]);
   ```

6. **新增 handleConnected 回调**：
   ```typescript
   const handleConnected = useCallback((data: SSEConnectedData) => {
     console.log('[SSE] Connected with last_update_time:', data.last_update_time);

     // 更新内存状态
     setLastUpdateTime(data.last_update_time);

     // 持久化到 localStorage
     workbenchStorage.saveSessionTimestamp(activeConversationId, data.last_update_time);
   }, [activeConversationId]);
   ```

7. **修改 apiStartPolling 调用**：
   ```typescript
   const cleanup = apiStartPolling(
     activeConversationId,
     lastUpdateTime,  // 传入 last_update_time
     handlePollMessage,
     handleConnected,  // 传入 connected 回调
     (error) => {
       console.error('Polling error:', error);
     }
   );
   ```

8. **处理首次连接（无历史消息）**：
   ```typescript
   // 在 loadMessages 后，如果 lastUpdateTime 仍为 0，使用 Date.now()
   useEffect(() => {
     if (activeConversationId && !isLoading && lastUpdateTime === 0) {
       const now = Date.now();
       setLastUpdateTime(now);
       workbenchStorage.saveSessionTimestamp(activeConversationId, now);
     }
   }, [activeConversationId, isLoading, lastUpdateTime]);
   ```

**验证**：
- TypeScript 编译无错误
- 首次连接正确初始化 last_update_time
- 断线重连使用正确的时间戳
- 历史消息加载后提取正确的时间戳

---

#### 步骤 7：处理 session.ts（可选）
**文件**：`src/api/session.ts`

**操作**：
- 保留 `getSessionMessages` 函数（向后兼容）
- 添加 `@deprecated` 注释，建议使用 `getMessages` from `message-station.ts`

---

## 6. 边界情况处理

### 6.1 首次连接（无历史消息）

**场景**：用户创建新会话，还没有任何消息

**处理流程**：
```
1. loadMessages 返回空数组
2. extractLatestUpdateTime([]) 返回 0
3. lastUpdateTime 保持为 0
4. 触发 useEffect，使用 Date.now() 作为初始值
5. 启动 SSE 连接
```

**代码示例**：
```typescript
const now = Date.now();
setLastUpdateTime(now);
workbenchStorage.saveSessionTimestamp(activeConversationId, now);
```

### 6.2 断线重连

**场景**：网络中断后 SSE 连接恢复

**处理流程**：
```
1. SSE 自动重连（EventSource 内置机制）
2. 使用内存中的 lastUpdateTime（如果还在）
3. 否则从 localStorage 恢复
4. connected 事件更新时间戳
```

**代码示例**：
```typescript
const savedTimestamp = workbenchStorage.getSessionTimestamp(sessionId);
const timestampToUse = lastUpdateTime > 0 ? lastUpdateTime : savedTimestamp;
```

### 6.3 历史消息为空

**场景**：会话存在但没有历史消息

**处理流程**：
```
1. getMessages 返回 { messages: [], total: 0, ... }
2. extractLatestUpdateTime([]) 返回 0
3. 使用 Date.now() 作为起点
```

**代码示例**：
```typescript
if (latestTime === 0) {
  latestTime = Date.now();
}
```

### 6.4 消息乱序处理

**场景**：SSE 推送的消息 update_time 可能不严格递增

**处理方案**：
```typescript
// 始终使用 max() 更新时间戳
const newTimestamp = Math.max(lastUpdateTime, data.update_time);
if (newTimestamp !== lastUpdateTime) {
  setLastUpdateTime(newTimestamp);
  workbenchStorage.saveSessionTimestamp(sessionId, newTimestamp);
}
```

### 6.5 多会话切换

**场景**：用户在多个会话间快速切换

**处理方案**：
```typescript
// 每个会话的时间戳独立存储
const sessionTimestampsRef = useRef<Record<string, number>>({});

// 切换时加载对应会话的时间戳
useEffect(() => {
  if (activeConversationId) {
    const saved = workbenchStorage.getSessionTimestamp(activeConversationId);
    setLastUpdateTime(saved || 0);
  }
}, [activeConversationId]);
```

### 6.6 历史消息分页

**场景**：历史消息超过 200 条，需要分页加载

**处理方案**（第一阶段实现基础分页）：
```typescript
// 加载第一页
const data = await getMessages(activeConversationId, 1, 200);

// 如果 total > 200，后续可以加载更多
if (data.total > data.page_size) {
  const totalPages = Math.ceil(data.total / data.page_size);
  // 可以实现"加载更多"功能
}
```

**注**：第一阶段只加载第一页（最新的 200 条消息），后续可扩展分页加载。

---

## 7. 测试要点

### 7.1 单元测试

| 测试项 | 测试场景 | 预期结果 |
|--------|----------|----------|
| `extractLatestUpdateTime` | 空数组 | 返回 0 |
| `extractLatestUpdateTime` | 单条消息 | 返回该消息的 update_time |
| `extractLatestUpdateTime` | 多条消息 | 返回最大的 update_time |
| `getSessionTimestamp` | 不存在的会话 | 返回 0 |
| `saveSessionTimestamp` | 正常保存 | localStorage 更新成功 |
| `getMessages` | 正常请求 | 返回 MessagesPageResponse |

### 7.2 集成测试

| 测试项 | 测试步骤 | 验证点 |
|--------|----------|--------|
| **首次连接** | 1. 创建新会话<br>2. 发送消息 | SSE URL 包含正确的 last_update_time<br>消息正常收发 |
| **历史消息加载** | 1. 切换到有历史消息的会话 | 从历史消息中提取最晚的 update_time<br>SSE 轮询使用正确起点 |
| **断线重连** | 1. 正常连接<br>2. 断网<br>3. 恢复网络 | 重连时使用保存的 last_update_time<br>不会丢失消息 |
| **时间戳更新** | 1. 接收多条消息 | last_update_time 持续更新为最新值<br>localStorage 同步更新 |
| **多会话切换** | 1. 会话 A 发送消息<br>2. 切换到会话 B<br>3. 切换回会话 A | 每个会话的时间戳独立正确<br>不会互相干扰 |

### 7.3 手动测试流程

#### 测试 1：新会话首次连接
```
1. 打开浏览器 DevTools -> Application -> Local Storage
2. 创建新会话
3. 发送消息 "Hello"
4. 检查 Network 标签中的 SSE 连接 URL
   预期：?session_id=xxx&last_update_time=<当前时间戳>
5. 检查 localStorage 中是否有该 session 的 last_update_time
   预期：存在且值为最新消息的 update_time
```

#### 测试 2：加载历史消息
```
1. 切换到一个有历史消息的会话
2. 检查 Network 标签
   预期：先调用 /msapi/messages，再调用 /msapi/poll-message
3. 检查 SSE 连接 URL
   预期：last_update_time = 历史消息中最晚的 update_time
```

#### 测试 3：断线重连
```
1. 正常连接到一个会话
2. DevTools -> Network -> 选择 "Offline"
3. 发送一条消息（会失败）
4. 等待几秒，取消 "Offline"
5. 观察控制台
   预期：SSE 自动重连，last_update_time 使用断线前的值
```

#### 测试 4：时间戳持久化
```
1. 连接到会话 A，发送几条消息
2. 刷新页面
3. 切换到会话 A
4. 检查 SSE 连接 URL
   预期：last_update_time 与刷新前一致
```

### 7.4 性能测试

| 测试项 | 测试方法 | 预期指标 |
|--------|----------|----------|
| localStorage 读写频率 | 连续接收 100 条消息 | 不造成性能问题（去抖动可考虑） |
| 时间戳更新频率 | 每条消息更新一次 | 不影响 UI 渲染 |
| 多会话时间戳存储 | 切换 10 个会话 | 每个会话时间戳独立正确 |

---

## 8. 兼容性考虑

### 8.1 向后兼容

- 保留 `src/api/session.ts` 中的 `getSessionMessages` 函数
- 添加 `@deprecated` 注释
- 未来版本可以逐步移除

### 8.2 数据迁移

**localStorage 结构变化**：
```
旧：无 session 时间戳存储
新：{
  "workbench-state": {
    ...
    "sessionTimestamps": {
      "session-123": 1738521605000
    }
  }
}
```

**迁移策略**：
- `workbenchStorage.get()` 中 `sessionTimestamps` 为可选字段
- 如果不存在，初始化为空对象 `{}`
- 自动兼容旧数据，无需手动迁移

### 8.3 API 回退

如果新的 `/msapi/messages` 接口不可用，可以回退到旧接口：
```typescript
// 尝试使用新接口
try {
  const data = await getMessages(sessionId);
} catch (error) {
  // 回退到旧接口
  const data = await getSessionMessages(sessionId);
}
```

**注**：第一阶段不考虑回退，直接使用新接口。

---

## 9. 未来优化方向

### 9.1 性能优化
- **时间戳去抖动**：不要每条消息都写 localStorage，可以批量更新
- **内存缓存**：使用 Map 数据结构存储会话时间戳

### 9.2 功能扩展
- **分页加载**：实现"加载更多历史消息"功能
- **消息去重**：基于 message_id 去重，防止重复接收
- **离线消息**：检测离线期间的消息，上线后提示用户

### 9.3 监控和调试
- **时间戳日志**：记录每次时间戳更新的原因（来源）
- **SSE 连接状态**：可视化显示连接状态和最后更新时间

---

## 10. 总结

### 核心修改点
1. **类型定义**：新增 SSEConnectedEvent、MessagesPageResponse 等
2. **API 封装**：新建 `message-station.ts`，更新 `chat.ts`
3. **存储扩展**：在 WorkbenchStorage 中添加 sessionTimestamps
4. **Hook 改造**：useChatMessages 中管理 last_update_time 生命周期

### 关键设计决策
1. **存储策略**：内存状态 + localStorage 持久化
2. **时间戳来源优先级**：消息 update_time > connected 事件 > localStorage > Date.now()
3. **每个会话独立**：支持多会话切换而不互相干扰

### 风险点
1. **首次连接时间戳**：如果过早轮询，可能错过初始化期间的消息
   - **缓解**：在 loadMessages 完成后再启动 SSE
2. **时区问题**：update_time 是服务器时间戳，Date.now() 是客户端时间
   - **缓解**：两者都是毫秒时间戳，直接比较即可
3. **localStorage 容量**：大量会话可能占用较多存储
   - **缓解**：只存储当前活跃会话的时间戳，定期清理旧数据

---

*设计方案版本: 1.0*
*创建时间: 2026-02-12*
*作者: Claude*
