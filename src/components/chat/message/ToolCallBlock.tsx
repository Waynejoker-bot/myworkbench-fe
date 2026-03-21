/**
 * Tool Call Block Component
 *
 * Displays tool execution with collapsible details, status indicators, and formatted JSON.
 * Provides comprehensive error handling and fallback rendering.
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import type { ToolCallBlock } from '@/workbench/types/content-block';
import { ContentType } from '@/workbench/types/content-block';
import { ToolExecutionStatus } from '@/types/toolConfig';
import {
  getStatusColorClasses,
  getStatusIcon,
  getStatusLabel,
  getToolMetadata,
} from '@/constants/defaultToolConfig';

interface ToolCallBlockProps {
  block: ToolCallBlock;
  isUserMessage?: boolean;  // Optional, reserved for future use
}

interface CopyState {
  copied: boolean;
  timeoutId: NodeJS.Timeout | null;
}

/**
 * Safely format JSON with error handling
 */
function safeFormatJson(data: unknown, _maxDepth = 5, maxLength = 1000): string {
  try {
    const jsonString = JSON.stringify(data, null, 2);

    // Truncate if too long
    if (jsonString.length > maxLength) {
      return jsonString.slice(0, maxLength) + '\n... (truncated)';
    }

    return jsonString;
  } catch (error) {
    console.error('[ToolCallBlock] Error formatting JSON:', error);
    return String(data);
  }
}

/**
 * Copy to clipboard with feedback
 */
function useCopyToClipboard() {
  const [copyState, setCopyState] = useState<CopyState>({
    copied: false,
    timeoutId: null,
  });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      // Clear existing timeout
      if (copyState.timeoutId) {
        clearTimeout(copyState.timeoutId);
      }

      // Set copied state
      setCopyState({ copied: true, timeoutId: null });

      // Reset after 2 seconds
      const timeoutId = setTimeout(() => {
        setCopyState({ copied: false, timeoutId: null });
      }, 2000);

      setCopyState({ copied: true, timeoutId });
    } catch (error) {
      console.error('[ToolCallBlock] Error copying to clipboard:', error);
    }
  };

  return { copy, isCopied: copyState.copied };
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: ToolExecutionStatus }) {
  const colors = getStatusColorClasses(status);
  const icon = getStatusIcon(status);
  const label = getStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.border} ${colors.text} border`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

/**
 * JSON Viewer Component
 */
function JsonViewer({
  data,
  title,
  maxDepth = 5,
  maxLength = 1000,
}: {
  data: unknown;
  title: string;
  maxDepth?: number;
  maxLength?: number;
}) {
  const { copy, isCopied } = useCopyToClipboard();

  const formattedJson = useMemo(() => {
    return safeFormatJson(data, maxDepth, maxLength);
  }, [data, maxDepth, maxLength]);

  return (
    <div className="relative group max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {title}
        </span>
        <button
          onClick={() => copy(formattedJson)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
          title="复制 JSON"
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="h-3 w-3 text-slate-600 dark:text-slate-400" />
          )}
        </button>
      </div>
      <pre
        className="bg-slate-100 dark:bg-slate-900 rounded p-2 text-xs font-mono"
        style={{
          maxHeight: '300px',
          overflowY: 'auto',
          overflowX: 'hidden',
          width: '100%',
          wordBreak: 'break-all',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-wrap',
        }}
      >
        <code className="text-slate-700 dark:text-slate-300">{formattedJson}</code>
      </pre>
    </div>
  );
}

/**
 * Main Tool Call Block Component
 */
export function ToolCallBlockComponent({ block }: ToolCallBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Safely extract tool call data with fallbacks
  const toolName = useMemo(() => {
    return block.toolName || '未知工具';
  }, [block.toolName]);

  const status = useMemo(() => {
    if (block.status && Object.values(ToolExecutionStatus).includes(block.status as ToolExecutionStatus)) {
      return block.status as ToolExecutionStatus;
    }
    return ToolExecutionStatus.PENDING;
  }, [block.status]);

  const parameters = useMemo(() => {
    return block.parameters || {};
  }, [block.parameters]);

  const result = useMemo(() => {
    return block.result;
  }, [block.result]);

  const error = useMemo(() => {
    return block.error;
  }, [block.error]);

  // Get tool metadata
  const metadata = useMemo(() => {
    try {
      return getToolMetadata(toolName);
    } catch (err) {
      console.error('[ToolCallBlock] Error getting tool metadata:', err);
      return {
        displayName: toolName,
        description: `执行工具: ${toolName}`,
        iconName: 'Wrench',
        category: 'unknown',
        dangerous: false,
      };
    }
  }, [toolName]);

  const colors = getStatusColorClasses(status);

  return (
    <div
      className={`my-2 rounded-lg border transition-all duration-200 max-w-full overflow-hidden ${colors.bg} ${colors.border}`}
    >
      {/* Header - Always Visible */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:opacity-80"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {/* Expand/Collapse Icon */}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          )}

          {/* Tool Name */}
          <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
            {metadata.displayName || toolName}
          </span>

          {/* Status Badge */}
          <StatusBadge status={status} />
        </div>

        {/* Additional Info */}
        {metadata.description && !isExpanded && (
          <span className="text-xs text-slate-500 dark:text-slate-500 hidden sm:block">
            {metadata.description}
          </span>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 overflow-hidden">
          {/* Description */}
          {metadata.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
              {metadata.description}
            </p>
          )}

          {/* Parameters */}
          {Object.keys(parameters).length > 0 ? (
            <JsonViewer
              data={parameters}
              title="参数"
              maxDepth={5}
              maxLength={1000}
            />
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-500 italic">
              无参数
            </div>
          )}

          {/* Result (if available) */}
          {status === ToolExecutionStatus.SUCCESS && result !== undefined && (
            <JsonViewer
              data={result}
              title="结果"
              maxDepth={5}
              maxLength={2000}
            />
          )}

          {/* Error (if any) */}
          {status === ToolExecutionStatus.ERROR && error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
              <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                错误信息
              </div>
              <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap">
                {error}
              </pre>
            </div>
          )}

          {/* Running Indicator */}
          {status === ToolExecutionStatus.RUNNING && (
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <div className="animate-spin h-3 w-3 border-2 border-blue-300 border-t-blue-500 rounded-full" />
              <span>正在执行...</span>
            </div>
          )}

          {/* Pending Indicator */}
          {status === ToolExecutionStatus.PENDING && (
            <div className="text-xs text-slate-500 dark:text-slate-500 italic">
              等待执行...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Fallback component when tool call block is invalid
 */
function ToolCallBlockFallback({ block, error }: { block: unknown; error?: string }) {
  return (
    <div className="my-2 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-3 max-w-full overflow-hidden">
      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm">
        <span>⚠️</span>
        <span className="font-medium">工具调用显示异常</span>
      </div>
      {error && (
        <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-500">{error}</p>
      )}
      <details className="mt-2">
        <summary className="text-xs text-yellow-600 dark:text-yellow-500 cursor-pointer">
          查看原始数据
        </summary>
        <pre
          className="mt-1 text-xs"
          style={{
            width: '100%',
            overflow: 'hidden',
            wordBreak: 'break-all',
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
          }}
        >
          {JSON.stringify(block, null, 2)}
        </pre>
      </details>
    </div>
  );
}

/**
 * Safe wrapper component with error boundary
 */
export function SafeToolCallBlock({ block }: ToolCallBlockProps) {
  try {
    // Validate block structure
    if (!block || typeof block !== 'object') {
      throw new Error('Invalid block: not an object');
    }

    if (block.type !== ContentType.TOOL_CALL) {
      throw new Error(`Invalid block type: ${block.type}`);
    }

    return <ToolCallBlockComponent block={block} />;
  } catch (error) {
    console.error('[SafeToolCallBlock] Error rendering tool call block:', error);
    return (
      <ToolCallBlockFallback
        block={block}
        error={error instanceof Error ? error.message : String(error)}
      />
    );
  }
}

export default SafeToolCallBlock;
