import { useMemo, useState, useCallback } from 'react';
import { MessageSquare, Bot, User, Copy, Check } from 'lucide-react';
import type { UIMessage } from '@/workbench/types/message-station';
import type { AnyContentBlock, ToolCallBlock, TextBlock, MarkdownBlock } from '@/workbench/types/content-block';
import { ContentType } from '@/workbench/types/content-block';
import { MessageStatusIndicator } from './MessageStatus';
import { formatTimestamp } from '@/workbench/utils/message-converters';
import { renderMarkdown } from '@/workbench/utils/markdown';
import { SafeToolCallBlock } from './ToolCallBlock';
import { AgentAvatar } from '../AgentAvatar';

interface MessageBubbleProps {
  message: UIMessage;
  replyToMessage?: UIMessage | null;
  agentConfig?: {
    name?: string;
    avatar?: string;
  };
  targetAgentConfig?: {
    name?: string;
    avatar?: string;
  };
  showStatus?: boolean;
}

/**
 * 提取消息的可复制内容
 * - text/markdown 类型：返回文本内容
 * - tool 类型：返回完整的 JSON
 */
function extractCopyContent(blocks: AnyContentBlock[]): string {
  const results: string[] = [];

  for (const block of blocks) {
    if (block.type === ContentType.TEXT) {
      results.push((block as TextBlock).content);
    } else if (block.type === ContentType.MARKDOWN) {
      results.push((block as MarkdownBlock).content);
    } else if (block.type === ContentType.TOOL_CALL) {
      const tool = block as ToolCallBlock;
      // 工具调用复制完整的 JSON 格式
      results.push(JSON.stringify({
        toolName: tool.toolName,
        parameters: tool.parameters,
        result: tool.result,
        status: tool.status,
        error: tool.error
      }, null, 2));
    }
  }

  return results.join('\n\n');
}

/**
 * Message Bubble Component
 *
 * Displays a single message with avatar, content, status, and metadata
 */
export function MessageBubble({
  message,
  replyToMessage,
  agentConfig,
  targetAgentConfig,
  showStatus = true
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isStreaming = message.messageStatus === 1 || message.messageStatus === 2;
  const [copied, setCopied] = useState(false);

  // Check if this is Agent-to-Agent communication
  const isAgentToAgent = useMemo(() => {
    return !message.source.startsWith('user') && !message.target.startsWith('user');
  }, [message.source, message.target]);

  // Get target display name (prioritize name over agentId)
  const targetDisplayName = useMemo(() => {
    return targetAgentConfig?.name || message.target;
  }, [targetAgentConfig, message.target]);

  // Get display name
  const displayName = useMemo(() => {
    if (isUser) return '你';
    if (isSystem) return '系统';
    return agentConfig?.name || message.source;
  }, [isUser, isSystem, agentConfig, message.source]);

  // 复制消息内容
  const handleCopy = useCallback(async () => {
    const content = extractCopyContent(message.contentBlocks);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [message.contentBlocks]);

  return (
    <div
      className={`flex gap-3 group w-full max-w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          {agentConfig ? (
            <AgentAvatar
              avatar={agentConfig.avatar}
              name={agentConfig.name || displayName}
              size="md"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isSystem
                ? 'bg-slate-500'
                : 'bg-gradient-to-br from-blue-500 to-purple-600'
            }`}>
              {isSystem ? (
                <Bot className="h-4 w-4 text-white" />
              ) : (
                <MessageSquare className="h-4 w-4 text-white" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Content Container */}
      <div className={`flex flex-col min-w-0 flex-shrink-0 ${isUser ? 'items-end' : 'items-start'}`} style={{ maxWidth: 'min(85%, 520px)' }}>
        {/* Agent Name (for assistant messages) */}
        {!isUser && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-1">
            {displayName}
          </div>
        )}

        {/* Reply Reference */}
        {replyToMessage && (
          <div className="text-xs text-slate-400 dark:text-slate-500 mb-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1">
            <span>回复:</span>
            <span className="truncate max-w-[200px]">{replyToMessage.content.slice(0, 50)}...</span>
          </div>
        )}

        {/* Message Content */}
        <div
          className={`relative rounded-2xl px-4 py-3 shadow-sm border overflow-hidden min-w-0 w-full max-w-full ${
            isUser
              ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-blue-200 dark:border-blue-800'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          {/* Copy Button - shows on hover */}
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title={copied ? '已复制' : '复制'}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            )}
          </button>

          {/* Agent-to-Agent communication indicator */}
          {isAgentToAgent && (
            <div className="mb-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <span>@{targetDisplayName}</span>
            </div>
          )}

          {/* Content Blocks */}
          <div className="message-content-blocks pr-8 min-w-0 w-full overflow-hidden">
            {message.contentBlocks.map((block, index) => {
              console.log('[MessageBubble] Rendering block:', index, block.type, block);
              return (
                <ContentBlockRenderer
                  key={block.id || index}
                  block={block}
                  isUserMessage={isUser}
                />
              );
            })}
          </div>
        </div>

        {/* Meta Information */}
        <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          {/* Timestamp */}
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {formatTimestamp(message.timestamp)}
          </span>

          {/* Status Indicator - show for both user and assistant messages */}
          {showStatus && (
            <MessageStatusIndicator
              status={message.messageStatus}
              deliveryStatus={message.deliveryStatus}
              errorMessage={message.errorMessage}
              isStreaming={isStreaming}
              isUser={isUser}
            />
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
            <User className="h-4 w-4 text-slate-400 m-2" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Content Block Renderer
 *
 * Renders different content block types
 */
interface ContentBlockRendererProps {
  block: AnyContentBlock;
  isUserMessage: boolean;
}

function ContentBlockRenderer({ block, isUserMessage }: ContentBlockRendererProps) {
  // Text block
  if (block.type === ContentType.TEXT) {
    const textContent = (block as any).content;
    // Check if content looks like JSON or command output (long lines without spaces)
    const hasLongLines = textContent.split('\n').some((line: string) => line.length > 100);
    const looksLikeJson = textContent.trim().startsWith('{') || textContent.trim().startsWith('[');
    const looksLikeCommandOutput = textContent.includes("'command':") || textContent.includes('"command":');

    if (hasLongLines || looksLikeJson || looksLikeCommandOutput) {
      // Use a scrollable container for long/JSON-like content
      return (
        <pre
          className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-x-auto max-w-full"
          style={{
            wordBreak: 'break-all',
            overflowWrap: 'anywhere',
            maxWidth: '100%',
          }}
        >
          {textContent}
        </pre>
      );
    }

    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>
        {textContent}
      </p>
    );
  }

  // Markdown block - use marked.js for full markdown support
  if (block.type === ContentType.MARKDOWN) {
    const renderedHtml = renderMarkdown((block as any).content);
    return (
      <div
        className="text-sm leading-relaxed prose prose-sm dark:prose-invert prose-headings:my-2 prose-p:my-1 w-full max-w-full overflow-hidden"
        style={{ wordBreak: 'break-word' }}
        dangerouslySetInnerHTML={{
          __html: renderedHtml
        }}
      />
    );
  }

  // Code block
  if (block.type === ContentType.CODE) {
    const codeBlock = block as any;
    return (
      <div className="my-2 max-w-full overflow-hidden">
        <pre
          className={`rounded-lg p-3 overflow-x-auto text-sm ${
            isUserMessage
              ? 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200'
          }`}
          style={{ maxWidth: '100%', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
        >
          <code>{codeBlock.code}</code>
        </pre>
      </div>
    );
  }

  // Code result block
  if (block.type === ContentType.CODE_RESULT) {
    const result = block as any;
    return (
      <div className={`my-2 rounded-lg p-3 text-sm max-w-full overflow-hidden ${
        result.success
          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
          : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
      }`}>
        <div className="font-medium mb-1">
          {result.success ? '✓ 执行成功' : '✗ 执行失败'}
        </div>
        {result.output && (
          <pre
            className="mt-1 whitespace-pre-wrap overflow-x-auto"
            style={{ maxWidth: '100%', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
          >
            {result.output}
          </pre>
        )}
        {result.error && (
          <pre
            className="mt-1 whitespace-pre-wrap text-red-600 dark:text-red-300 overflow-x-auto"
            style={{ maxWidth: '100%', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
          >
            {result.error}
          </pre>
        )}
      </div>
    );
  }

  // Error block
  if (block.type === ContentType.ERROR) {
    const error = block as any;
    return (
      <div className="my-2 rounded-lg p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <span className="font-medium">错误:</span>
          <span>{error.message}</span>
        </div>
        {error.details && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-500">{error.details}</p>
        )}
      </div>
    );
  }

  // Progress block
  if (block.type === ContentType.PROGRESS) {
    const progress = block as any;
    return (
      <div className="my-2">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <span className="text-xs">{progress.progress}%</span>
        </div>
        {progress.message && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{progress.message}</p>
        )}
      </div>
    );
  }

  // Tool call block - use enhanced component
  if (block.type === ContentType.TOOL_CALL) {
    try {
      return <SafeToolCallBlock block={block as any} isUserMessage={isUserMessage} />;
    } catch (error) {
      console.error('[MessageBubble] Error rendering tool call block:', error);
      // Fallback to simple display
      const tool = block as any;
      return (
        <div className="my-2 rounded-lg p-3 text-sm bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <span className="font-medium">⚠️ 工具调用显示异常</span>
            <span className="text-xs text-slate-500">{tool.toolName}</span>
          </div>
        </div>
      );
    }
  }

  // Default: render as text
  return (
    <p
      className="text-sm leading-relaxed whitespace-pre-wrap break-words"
      style={{ overflowWrap: 'anywhere', maxWidth: '100%' }}
    >
      {(block as any).content || JSON.stringify(block)}
    </p>
  );
}
