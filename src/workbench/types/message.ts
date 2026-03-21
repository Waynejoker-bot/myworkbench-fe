/**
 * Workbench Message Types
 *
 * Defines the message structure used for communication between
 * ChatBox, Workbench Container, and Components.
 */

import type { Message } from './common';

/**
 * Base message structure for all Workbench communications
 */
export interface WorkbenchMessage<T = unknown> {
  /** Unique message identifier */
  id: string;

  /** Message timestamp in milliseconds */
  timestamp: number;

  /** Source of the message */
  source: MessageSource;

  /** Target destination for the message */
  target: MessageTarget;

  /** Message type identifier */
  type: string;

  /** Message payload data */
  payload: T;

  /** Optional correlation ID for request-response pattern */
  correlationId?: string;

  /** Optional timeout in milliseconds for requests */
  timeout?: number;
}

/**
 * Message source enumeration
 */
export enum MessageSource {
  /** Message originates from ChatBox */
  ChatBox = 'chatbox',

  /** Message originates from Workbench Container */
  Workbench = 'workbench',

  /** Message originates from a Component */
  Component = 'component'
}

/**
 * Message target enumeration
 */
export enum MessageTarget {
  /** Broadcast to all parties */
  Broadcast = 'broadcast',

  /** Send to ChatBox */
  ChatBox = 'chatbox',

  /** Send to Workbench Container */
  Workbench = 'workbench',

  /** Send to Component */
  Component = 'component'
}

// ==================== Host → Component Messages ====================

/**
 * Component initialization message
 */
export interface ComponentInitMessage extends WorkbenchMessage<{
  /** Current session ID */
  sessionId: string;

  /** Chat context */
  context: import('./common').ChatContext;

  /** Component configuration */
  config: Record<string, unknown>;
}> {
  type: 'component:init';
}

/**
 * Component parameters update message
 */
export interface ComponentUpdateMessage extends WorkbenchMessage<{
  /** Updated parameters */
  params: Record<string, unknown>;
}> {
  type: 'component:update';
}

/**
 * Component visibility change message
 */
export interface ComponentVisibilityMessage extends WorkbenchMessage<{
  /** Whether component is visible */
  visible: boolean;
}> {
  type: 'component:visibility';
}

/**
 * Component data request message
 */
export interface ComponentDataRequest extends WorkbenchMessage<{
  /** Type of data requested */
  dataType: string;

  /** Optional query parameters */
  query?: Record<string, unknown>;
}> {
  type: 'component:dataRequest';
}

// ==================== Event Messages ====================

/**
 * Message stream event - supports streaming messages
 */
export interface MessageStreamEventMessage extends WorkbenchMessage<{
  /** The message data */
  message: Message;

  /** Whether this is a streaming message */
  isStreaming: boolean;

  /** Delta content for streaming messages */
  delta?: string;

  /** Whether streaming is complete */
  isComplete: boolean;
}> {
  type: 'event:message:stream';
}

/**
 * Message state change event
 */
export interface MessageStateEvent extends WorkbenchMessage<{
  /** Message ID */
  messageId: string;

  /** New message status */
  status: 'pending' | 'streaming' | 'completed' | 'failed';
}> {
  type: 'event:message:state';
}

/**
 * Session change event
 */
export interface SessionChangeEvent extends WorkbenchMessage<{
  /** New session ID */
  sessionId: string;

  /** Previous session ID if applicable */
  previousSessionId?: string;
}> {
  type: 'event:session:change';
}

/**
 * Input change event
 */
export interface InputChangeEvent extends WorkbenchMessage<{
  /** Current input value */
  value: string;

  /** Optional cursor position */
  cursor?: number;
}> {
  type: 'event:input:change';
}

// ==================== Component → Host Messages ====================

/**
 * Append text to input message
 */
export interface AppendInputMessage extends WorkbenchMessage<{
  /** Text to append */
  text: string;

  /** Append mode */
  mode?: 'append' | 'replace' | 'insert';
}> {
  type: 'host:appendInput';
}

/**
 * Send message request
 */
export interface SendMessageRequest extends WorkbenchMessage<{
  /** Message content */
  content: string;

  /** Optional agent ID */
  agentId?: string;
}> {
  type: 'host:sendMessage';
}

/**
 * Switch session request
 */
export interface SwitchSessionRequest extends WorkbenchMessage<{
  /** Target session ID */
  sessionId: string;
}> {
  type: 'host:switchSession';
}

/**
 * Get context request
 */
export interface GetContextRequest extends WorkbenchMessage<Record<string, never>> {
  type: 'host:getContext';
}

// ==================== Component → Container Messages ====================

/**
 * Resize container request
 */
export interface ResizeRequest extends WorkbenchMessage<{
  /** New width */
  width: number;

  /** Optional new height */
  height?: number;
}> {
  type: 'container:resize';
}

/**
 * Close component request
 */
export interface CloseRequest extends WorkbenchMessage<Record<string, never>> {
  type: 'container:close';
}

/**
 * Notification message
 */
export interface NotificationMessage extends WorkbenchMessage<{
  /** Notification level */
  level: 'info' | 'success' | 'warning' | 'error';

  /** Notification title */
  title: string;

  /** Notification message */
  message: string;

  /** Optional duration in milliseconds */
  duration?: number;
}> {
  type: 'host:notify';
}

// ==================== Utility Types ====================

/**
 * Union type of all Workbench message types
 */
export type AllWorkbenchMessages =
  | ComponentInitMessage
  | ComponentUpdateMessage
  | ComponentVisibilityMessage
  | ComponentDataRequest
  | MessageStreamEventMessage
  | MessageStateEvent
  | SessionChangeEvent
  | InputChangeEvent
  | AppendInputMessage
  | SendMessageRequest
  | SwitchSessionRequest
  | GetContextRequest
  | ResizeRequest
  | CloseRequest
  | NotificationMessage;

/**
 * Extract message payload type
 */
export type MessagePayload<T extends WorkbenchMessage> = T extends WorkbenchMessage<infer P> ? P : never;

/**
 * Stream event type for subscriptions
 */
export interface MessageStreamEvent {
  /** The message data */
  message: Message;

  /** Whether this is a streaming message */
  isStreaming: boolean;

  /** Delta content for streaming messages */
  delta?: string;

  /** Whether streaming is complete */
  isComplete: boolean;

  /** Event timestamp */
  timestamp: number;
}
