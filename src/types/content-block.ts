/**
 * Content Block Types
 *
 * Extensible content block system for displaying complex message content.
 * Supports text, markdown, code, tool calls, progress, cards, files, etc.
 *
 * @see message-content-design.md for full documentation
 */

/**
 * Content block type enumeration
 */
export enum ContentType {
  // Basic types
  TEXT = 'text',
  MARKDOWN = 'markdown',
  THINKING = 'thinking',

  // Code related
  CODE = 'code',
  CODE_RESULT = 'code_result',

  // Data display
  TABLE = 'table',
  CHART = 'chart',
  JSON = 'json',

  // Media
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  FILE = 'file',

  // Tool related
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',

  // Interactive
  CARD = 'card',
  TASK_CARD = 'task_card',
  FORM = 'form',
  PROGRESS = 'progress',

  // System
  ERROR = 'error',
  SYSTEM = 'system',
}

/**
 * Base content block interface
 */
export interface ContentBlock {
  type: ContentType;
  id?: string;
}

/**
 * Text content block
 */
export interface TextBlock extends ContentBlock {
  type: ContentType.TEXT;
  content: string;
}

/**
 * Markdown content block
 */
export interface MarkdownBlock extends ContentBlock {
  type: ContentType.MARKDOWN;
  content: string;
}

/**
 * Thinking content block - Agent's intermediate reasoning
 */
export interface ThinkingBlock extends ContentBlock {
  type: ContentType.THINKING;
  content: string;
}

/**
 * Code block
 */
export interface CodeBlock extends ContentBlock {
  type: ContentType.CODE;
  language: string;
  code: string;
  lineNumbers?: boolean;
  theme?: string;
}

/**
 * Code execution result
 */
export interface CodeResultBlock extends ContentBlock {
  type: ContentType.CODE_RESULT;
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  executionTime?: number;
}

/**
 * Table block (for future use)
 */
export interface TableBlock extends ContentBlock {
  type: ContentType.TABLE;
  headers: string[];
  rows: string[][];
}

/**
 * Chart block (for future use)
 */
export interface ChartBlock extends ContentBlock {
  type: ContentType.CHART;
  chartType: 'line' | 'bar' | 'pie' | 'scatter';
  data: Record<string, unknown>;
}

/**
 * JSON data block
 */
export interface JsonBlock extends ContentBlock {
  type: ContentType.JSON;
  data: Record<string, unknown> | unknown[];
  collapsed?: boolean;
}

/**
 * Image block
 */
export interface ImageBlock extends ContentBlock {
  type: ContentType.IMAGE;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

/**
 * Audio block
 */
export interface AudioBlock extends ContentBlock {
  type: ContentType.AUDIO;
  url: string;
  duration?: number;
  caption?: string;
}

/**
 * Video block
 */
export interface VideoBlock extends ContentBlock {
  type: ContentType.VIDEO;
  url: string;
  thumbnail?: string;
  duration?: number;
  caption?: string;
}

/**
 * File block
 */
export interface FileBlock extends ContentBlock {
  type: ContentType.FILE;
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;
  downloadUrl?: string;
}

/**
 * Tool call block
 */
export interface ToolCallBlock extends ContentBlock {
  type: ContentType.TOOL_CALL;
  toolName: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
}

/**
 * Tool result block (alternative representation)
 */
export interface ToolResultBlock extends ContentBlock {
  type: ContentType.TOOL_RESULT;
  toolName: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Progress block
 */
export interface ProgressBlock extends ContentBlock {
  type: ContentType.PROGRESS;
  progress: number;
  message?: string;
  indeterminate?: boolean;
}

/**
 * Card action (for interactive cards)
 */
export interface CardAction {
  id: string;
  label: string;
  style?: 'primary' | 'secondary' | 'danger';
  action: string;
  data?: unknown;
}

/**
 * Card block (interactive)
 */
export interface CardBlock extends ContentBlock {
  type: ContentType.CARD;
  title?: string;
  content: string;
  actions?: CardAction[];
}

/**
 * Form block (for future use)
 */
export interface FormBlock extends ContentBlock {
  type: ContentType.FORM;
  fields: FormField[];
  submitLabel?: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  required?: boolean;
  options?: string[];
  defaultValue?: unknown;
}

/**
 * Error block
 */
export interface ErrorBlock extends ContentBlock {
  type: ContentType.ERROR;
  message: string;
  details?: string;
  stack?: string;
}

/**
 * System message block
 */
export interface SystemBlock extends ContentBlock {
  type: ContentType.SYSTEM;
  content: string;
  level?: 'info' | 'warning' | 'error';
}

/**
 * Task card block (references TaskCard by ID, state lives in Zustand store)
 */
export interface TaskCardContentBlock extends ContentBlock {
  type: ContentType.TASK_CARD;
  taskCardId: string;
  /** Inline card data for lazy store registration (avoids module instance mismatch) */
  taskCardData?: import('../types/task-card').TaskCard;
}

/**
 * Union type of all content blocks
 */
export type AnyContentBlock =
  | TextBlock
  | MarkdownBlock
  | ThinkingBlock
  | CodeBlock
  | CodeResultBlock
  | TableBlock
  | ChartBlock
  | JsonBlock
  | ImageBlock
  | AudioBlock
  | VideoBlock
  | FileBlock
  | ToolCallBlock
  | ToolResultBlock
  | ProgressBlock
  | CardBlock
  | TaskCardContentBlock
  | FormBlock
  | ErrorBlock
  | SystemBlock;

/**
 * Type guard to check if a block is of a specific type
 */
export function isContentType<T extends AnyContentBlock>(
  block: AnyContentBlock,
  type: ContentType
): block is T {
  return block.type === type;
}

/**
 * Helper to create a text block
 */
export function createTextBlock(content: string): TextBlock {
  return { type: ContentType.TEXT, content };
}

/**
 * Helper to create a markdown block
 */
export function createMarkdownBlock(content: string): MarkdownBlock {
  return { type: ContentType.MARKDOWN, content };
}

/**
 * Helper to create a code block
 */
export function createCodeBlock(
  code: string,
  language: string = 'text',
  options?: Partial<Omit<CodeBlock, 'type' | 'code' | 'language'>>
): CodeBlock {
  return {
    type: ContentType.CODE,
    code,
    language,
    ...options,
  };
}

/**
 * Helper to create an error block
 */
export function createErrorBlock(
  message: string,
  options?: Partial<Omit<ErrorBlock, 'type' | 'message'>>
): ErrorBlock {
  return {
    type: ContentType.ERROR,
    message,
    ...options,
  };
}

/**
 * Helper to create a progress block
 */
export function createProgressBlock(
  progress: number,
  options?: Partial<Omit<ProgressBlock, 'type' | 'progress'>>
): ProgressBlock {
  return {
    type: ContentType.PROGRESS,
    progress: Math.max(0, Math.min(100, progress)),
    ...options,
  };
}
