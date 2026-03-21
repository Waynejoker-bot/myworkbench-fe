/**
 * Workbench Types
 *
 * Central export point for all Workbench-related types.
 * This file provides a clean import interface for consumers.
 */

// ============ Common Types ============
export type {
  Message,
  Session,
  ChatContext,
  ComponentConfig,
  ComponentState,
  NotificationOptions,
  SubscriptionOptions,
  UnsubscribeFunction,
  SessionContext
} from './common';

// ============ Message Types ============
export type {
  WorkbenchMessage,
  MessageStreamEvent,
  AllWorkbenchMessages,
  MessagePayload,
  ComponentInitMessage,
  ComponentUpdateMessage,
  ComponentVisibilityMessage,
  ComponentDataRequest,
  MessageStreamEventMessage,
  MessageStateEvent,
  SessionChangeEvent,
  InputChangeEvent,
  AppendInputMessage,
  SendMessageRequest,
  SwitchSessionRequest,
  GetContextRequest,
  ResizeRequest,
  CloseRequest,
  NotificationMessage
} from './message';

export { MessageSource, MessageTarget } from './message';

// ============ Message Station Types ============
export type {
  RawMessage,
  UIMessage,
  StreamChunk,
  ReplyRelation
} from './message-station';

export { MessageStatus, DeliveryStatus } from './message-station';

// ============ Content Block Types ============
export type {
  ContentBlock,
  TextBlock,
  MarkdownBlock,
  CodeBlock,
  CodeResultBlock,
  TableBlock,
  ChartBlock,
  JsonBlock,
  ImageBlock,
  FileBlock,
  ToolCallBlock,
  ToolResultBlock,
  ProgressBlock,
  CardBlock,
  FormBlock,
  FormField,
  ErrorBlock,
  SystemBlock,
  AnyContentBlock,
  CardAction
} from './content-block';

export { ContentType } from './content-block';

// ============ Component Types ============
export type {
  WorkbenchComponent,
  InitContext,
  ComponentManifest,
  ComponentLifecycle,
  Dependency,
  SecurityConfig,
  ComponentLoadStrategy,
  ComponentCacheEntry
} from './component';

// ============ Tab Types ============
export type {
  Tab,
  TabStrategy,
  TabStrategyMode,
  TabStatus,
  TabCreationOptions,
  TabFilterOptions,
  TabStatistics,
  TabEvent,
} from './tab';

export { TabEventType } from './tab';

// ============ Component List Types ============
export type {
  ComponentInfo,
  ComponentCategory,
  ComponentStatistics,
  ComponentFilterOptions,
  ComponentSortOption,
  ComponentListViewMode,
  ComponentListDisplayOptions,
  ComponentCardState,
  ComponentListStorage,
  ComponentSearchResult
} from './component-list';

// ============ Storage Types ============
export type {
  WorkbenchStorage,
  UserPreferences,
  StorageResult,
  StorageMigrationContext,
  StorageMigration,
  StorageConfig,
  StorageEvent
} from './storage';

export { StorageKey, StorageEventType } from './storage';

// ============ Host Types ============
export type {
  HostAPI,
  MessageAPI,
  SessionAPI,
  InputAPI,
  UIAPI,
  EventAPI,
  HostConfig,
  HostSecurityConfig,
  HostCapabilities
} from './host';

// ============ Host Runtime Types ============
// 这些类型和函数由 host/index.ts 导出

// ============ Tool Execution Types ============
export type {
  ToolExecutionState,
  ToolExecutionStatus,
} from '../utils/tool-execution';

export type {
  ParsedToolCall,
} from '../utils/message-parser';

// ============ Type Guards ============
export function isWorkbenchMessage(value: unknown): value is import('./message').WorkbenchMessage {
  return typeof value === 'object' && value !== null &&
    'id' in value && 'timestamp' in value && 'source' in value &&
    'target' in value && 'type' in value && 'payload' in value;
}

export function isMessage(value: unknown): value is import('./common').Message {
  return typeof value === 'object' && value !== null &&
    'id' in value && 'role' in value && 'content' in value && 'timestamp' in value;
}

export function isSession(value: unknown): value is import('./common').Session {
  return typeof value === 'object' && value !== null &&
    'id' in value && 'title' in value && 'createdAt' in value && 'updatedAt' in value;
}

export function isComponentManifest(value: unknown): value is import('./component').ComponentManifest {
  return typeof value === 'object' && value !== null &&
    'name' in value && 'version' in value && 'description' in value &&
    'author' in value && 'entry' in value && 'capabilities' in value;
}

// ============ Utility Types ============
export type ExtractMessagePayload<T> = T extends import('./message').WorkbenchMessage<infer P> ? P : never;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredProperties<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OmitProperties<T, K extends keyof T> = Omit<T, K>;

export type Permission = string;
