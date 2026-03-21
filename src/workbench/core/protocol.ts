/**
 * Workbench Protocol Constants
 * 定义消息类型、事件名称等常量
 */

// ============ 消息来源 ============
export enum MessageSource {
  ChatBox = 'chatbox',
  Workbench = 'workbench',
  Component = 'component'
}

// ============ 消息目标 ============
export enum MessageTarget {
  Broadcast = 'broadcast',
  ChatBox = 'chatbox',
  Workbench = 'workbench',
  Component = 'component'
}

// ============ Host → Component 消息类型 ============
export const MessageTypes = {
  // 组件生命周期
  COMPONENT_INIT: 'component:init',
  COMPONENT_UPDATE: 'component:update',
  COMPONENT_VISIBILITY: 'component:visibility',
  COMPONENT_DATA_REQUEST: 'component:dataRequest',

  // SDK 初始化
  SDK_INIT: 'sdk:init',
  SDK_READY: 'sdk:ready',

  // 方法调用
  METHOD_CALL: 'method:call',
  METHOD_RESPONSE: 'method:response',

  // 事件消息
  EVENT_MESSAGE_STREAM: 'event:message:stream',
  EVENT_MESSAGE_STATE: 'event:message:state',
  EVENT_SESSION_CHANGE: 'event:session:change',
  EVENT_INPUT_CHANGE: 'event:input:change'
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];

// ============ Component → Host 消息类型 ============
export const ComponentMessageTypes = {
  // 输入操作
  HOST_APPEND_INPUT: 'host:appendInput',
  HOST_SEND_MESSAGE: 'host:sendMessage',
  HOST_GET_CONTEXT: 'host:getContext',

  // 会话操作
  HOST_SWITCH_SESSION: 'host:switchSession',
  HOST_CREATE_SESSION: 'host:createSession',

  // UI 操作
  HOST_NOTIFY: 'host:notify',

  // 容器操作
  CONTAINER_RESIZE: 'container:resize',
  CONTAINER_CLOSE: 'container:close',
  CONTAINER_FOCUS: 'container:focus'
} as const;

export type ComponentMessageType = typeof ComponentMessageTypes[keyof typeof ComponentMessageTypes];

// ============ 工作台事件名称 ============
export const WorkbenchEvents = {
  // 组件事件
  COMPONENT_LOADED: 'component:loaded',
  COMPONENT_READY: 'component:ready',
  COMPONENT_ERROR: 'component:error',
  COMPONENT_UNLOADED: 'component:unloaded',

  // 容器事件
  CONTAINER_RESIZED: 'container:resized',
  CONTAINER_FOCUSED: 'container:focused',
  CONTAINER_CLOSED: 'container:closed',

  // 会话事件
  SESSION_CHANGED: 'session:changed',
  SESSION_CREATED: 'session:created',

  // 消息事件
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',

  // 错误事件
  ERROR: 'error'
} as const;

export type WorkbenchEventType = typeof WorkbenchEvents[keyof typeof WorkbenchEvents];

// ============ 权限常量 ============
export const StandardPermissions = {
  // 消息操作
  READ_MESSAGES: 'read:messages',
  SEND_MESSAGES: 'send:messages',
  MODIFY_INPUT: 'modify:input',

  // 会话操作
  READ_SESSIONS: 'read:sessions',
  SWITCH_SESSIONS: 'switch:sessions',
  CREATE_SESSIONS: 'create:sessions',

  // UI 操作
  RESIZE_CONTAINER: 'resize:container',
  SHOW_NOTIFICATIONS: 'show:notifications',

  // 网络操作
  NETWORK_REQUEST: 'network:request',
  READ_CLIPBOARD: 'read:clipboard',
  WRITE_CLIPBOARD: 'write:clipboard'
} as const;

export type Permission = typeof StandardPermissions[keyof typeof StandardPermissions] | string;

// ============ 默认配置 ============
export const DEFAULT_TIMEOUT = 5000; // 默认消息超时时间（毫秒）
export const MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 最大消息大小 10MB
export const HEARTBEAT_INTERVAL = 30000; // 心跳间隔（毫秒）

// ============ 响应状态 ============
export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout'
}

// ============ 消息优先级 ============
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}
