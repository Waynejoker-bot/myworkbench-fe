import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { MessageSquare, Copy, Check, Loader2, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import type { UIMessage } from '@/types/message-station';
import { MessageStatus, DeliveryStatus } from '@/types/message-station';
import type { AnyContentBlock, ToolCallBlock, ThinkingBlock, TextBlock, MarkdownBlock, TaskCardContentBlock } from '@/types/content-block';
import { ContentType } from '@/types/content-block';
import { TaskCardBlock } from './TaskCardBlock';
import { MessageStatusIndicator } from './MessageStatus';
import { formatTimestamp } from '@/utils/message-converters';
import { renderMarkdown } from '@/utils/markdown';
import { SafeToolCallBlock } from './ToolCallBlock';
import { ToolCallTimeline } from './ToolCallTimeline';
import { ThinkingBlockRenderer } from './ThinkingBlock';
import { MessageMeta } from './MessageMeta';
import { getToolDescription } from '@/utils/tool-status';

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
  onRetry?: (messageId: string) => void;
}

/**
 * 提取消息的可复制内容
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
      results.push(getToolDescription({
        name: tool.toolName,
        arguments: tool.parameters,
        result: tool.result,
      }, (tool.status as 'running' | 'success' | 'error') || 'success'));
    }
  }

  return results.join('\n\n');
}

/**
 * Group content blocks into render groups.
 *
 * A "react_round" group merges consecutive thinking + tool_call blocks
 * into a single round — thinking content is shown directly, tool calls
 * are collapsed together under one "展开工具调用" toggle.
 *
 * Any non-thinking, non-tool block (e.g. markdown final answer) breaks
 * the round and becomes a "single" group.
 */
interface BlockGroup {
  type: 'react_round' | 'single';
  thinkingBlocks: ThinkingBlock[];
  toolBlocks: ToolCallBlock[];
  blocks: AnyContentBlock[];  // for 'single' groups
}

function groupContentBlocks(blocks: AnyContentBlock[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  let thinkingAcc: ThinkingBlock[] = [];
  let toolAcc: ToolCallBlock[] = [];

  // Global dedup: track all thinking content across ALL rounds
  // Handles exact duplicates AND substring expansions
  const globalSeenThinking: string[] = [];

  // Normalize: strip markdown formatting for cross-type comparison
  const normalize = (s: string) => s.replace(/[`*_#\[\]()]/g, '').replace(/\s+/g, ' ').trim();

  const isThinkingDuplicate = (text: string): boolean => {
    const norm = normalize(text);
    // Exact match (normalized)
    if (globalSeenThinking.some(s => normalize(s) === norm)) return true;
    // New text is substring of already seen
    if (globalSeenThinking.some(s => normalize(s).includes(norm))) return true;
    // Already seen text is substring of new (new is expanded version — replace)
    const subIdx = globalSeenThinking.findIndex(s => norm.includes(normalize(s)));
    if (subIdx >= 0) {
      globalSeenThinking[subIdx] = text; // upgrade to longer version
      return false; // show the expanded version
    }
    return false;
  };

  const flushRound = () => {
    if (thinkingAcc.length > 0 || toolAcc.length > 0) {
      // Deduplicate thinking blocks globally across all rounds
      const uniqueThinking = thinkingAcc.filter(tb => {
        const key = (tb.content || '').trim();
        if (!key || isThinkingDuplicate(key)) return false;
        globalSeenThinking.push(key);
        return true;
      });
      // Only create round if there's something to show
      if (uniqueThinking.length > 0 || toolAcc.length > 0) {
        groups.push({
          type: 'react_round',
          thinkingBlocks: uniqueThinking,
          toolBlocks: toolAcc,
          blocks: [],
        });
      }
      thinkingAcc = [];
      toolAcc = [];
    }
  };

  for (const block of blocks) {
    if (block.type === ContentType.THINKING) {
      // New thinking after tools = new ReAct round, flush previous
      if (toolAcc.length > 0) {
        flushRound();
      }
      thinkingAcc.push(block as ThinkingBlock);
    } else if (block.type === ContentType.TOOL_CALL) {
      toolAcc.push(block as ToolCallBlock);
    } else {
      // Non-thinking, non-tool block breaks the round
      flushRound();
      // Also check if this "single" block's content duplicates a thinking block
      // (backend sometimes leaks thinking text into the final markdown)
      if (block.type === ContentType.MARKDOWN || block.type === ContentType.TEXT) {
        const content = ((block as any).content || '').trim();
        if (content && isThinkingDuplicate(content)) {
          continue; // skip duplicate
        }
      }
      groups.push({
        type: 'single',
        thinkingBlocks: [],
        toolBlocks: [],
        blocks: [block],
      });
    }
  }

  flushRound();

  // Post-process: merge consecutive react_rounds where the later one
  // has no unique thinking (all deduplicated away). This combines tool
  // calls from multiple backend rounds into a single collapsed group.
  const merged: BlockGroup[] = [];
  for (const group of groups) {
    const prev = merged[merged.length - 1];
    if (
      group.type === 'react_round' &&
      group.thinkingBlocks.length === 0 &&
      prev?.type === 'react_round'
    ) {
      // Merge tools into previous round
      prev.toolBlocks = [...prev.toolBlocks, ...group.toolBlocks];
    } else {
      merged.push(group);
    }
  }

  return merged;
}

/**
 * Message Bubble Component
 */
export function MessageBubble({
  message,
  replyToMessage,
  agentConfig,
  targetAgentConfig,
  showStatus = true,
  onRetry,
}: MessageBubbleProps) {
  // Inject thinking dots keyframes once
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('thinking-dots-style')) {
      const style = document.createElement('style');
      style.id = 'thinking-dots-style';
      style.textContent = `
        @keyframes thinkingDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isStreaming = message.messageStatus === MessageStatus.START || message.messageStatus === MessageStatus.CHUNK;
  const isFailed = message.deliveryStatus === DeliveryStatus.FAILED;
  const isQueued = message.deliveryStatus === DeliveryStatus.QUEUED;
  const isSending = message.deliveryStatus === DeliveryStatus.PENDING;
  const [copied, setCopied] = useState(false);

  // Thinking indicator - show when START status with no meaningful content
  const isThinking = message.messageStatus === MessageStatus.START &&
    (message.contentBlocks.length === 0 ||
     message.contentBlocks.every(b => !('content' in b) || !(b as any).content));

  const isAgentToAgent = useMemo(() => {
    return !message.source.startsWith('user') && !message.target.startsWith('user');
  }, [message.source, message.target]);

  const targetDisplayName = useMemo(() => {
    return targetAgentConfig?.name || message.target;
  }, [targetAgentConfig, message.target]);

  const displayName = useMemo(() => {
    if (isUser) return '你';
    if (isSystem) return '系统';
    return agentConfig?.name || message.source;
  }, [isUser, isSystem, agentConfig, message.source]);

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
      {/* Agent Avatar - LEFT side */}
      {!isUser && (
        <div className="flex-shrink-0">
          {isSystem ? (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted border border-border"
            >
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
          ) : (
            <AgentAvatar agentId={message.source} avatar={agentConfig?.avatar} size={32} />
          )}
        </div>
      )}

      {/* Content Container */}
      <div className={`flex flex-col min-w-0 flex-shrink-0 ${isUser ? 'items-end' : 'items-start'}`} style={{ maxWidth: 'min(85%, 520px)' }}>
        {/* Agent Name (for assistant messages) */}
        {!isUser && (
          <div className="text-xs mb-1 px-1 text-muted-foreground" style={{ fontSize: '12px' }}>
            {displayName}
          </div>
        )}

        {/* Reply Reference */}
        {replyToMessage && (
          <div
            className="text-xs mb-1 px-2 py-1 rounded-lg flex items-center gap-1 bg-muted text-muted-foreground"
          >
            <span>回复:</span>
            <span className="truncate max-w-[200px]">{replyToMessage.content.slice(0, 50)}...</span>
          </div>
        )}

        {/* Message Content */}
        <div
          className={`relative px-4 py-3 shadow-sm overflow-hidden min-w-0 w-full max-w-full text-foreground ${isUser ? 'bg-muted' : 'bg-surface-2 border border-border'}`}
          style={{
            borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
            opacity: isSending ? 0.7 : isQueued ? 0.6 : 1,
          }}
        >
          {/* Failed badge */}
          {isFailed && (
            <div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-destructive"
            >
              <AlertCircle className="h-3 w-3 text-white" />
            </div>
          )}

          {/* Sending spinner */}
          {isSending && (
            <div className="absolute top-2 right-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Queued clock icon */}
          {isQueued && (
            <div className="absolute top-2 right-2">
              <Clock className="h-3.5 w-3.5 text-warning" />
            </div>
          )}

          {/* Copy Button - shows on hover */}
          {!isSending && !isFailed && !isQueued && (
            <button
              onClick={handleCopy}
              className="absolute bottom-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-muted"
              title={copied ? '已复制' : '复制'}
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}

          {/* Agent-to-Agent communication indicator */}
          {isAgentToAgent && (
            <div
              className="mb-2 px-2 py-1 rounded text-xs flex items-center gap-1 bg-primary/10 text-primary"
            >
              <span>@{targetDisplayName}</span>
            </div>
          )}

          {/* Content Blocks */}
          <div className="message-content-blocks pr-8 min-w-0 w-full overflow-hidden">
            {isThinking ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} className="bg-primary" style={{
                      width: 6, height: 6, borderRadius: '50%',
                      animation: `thinkingDot 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
                <span className="text-muted-foreground" style={{ fontSize: 12 }}>思考中...</span>
              </div>
            ) : (
              groupContentBlocks(message.contentBlocks).map((group, gIdx) => {
                if (group.type === 'react_round') {
                  return (
                    <div key={`rr-${gIdx}`}>
                      {/* Thinking blocks - always visible */}
                      {group.thinkingBlocks.map((tb, tIdx) => (
                        <ThinkingBlockRenderer
                          key={`think-${gIdx}-${tIdx}`}
                          content={tb.content || ''}
                        />
                      ))}
                      {/* Tool calls - collapsed */}
                      {group.toolBlocks.length > 0 && (
                        <div style={{ opacity: 0.85 }}>
                          <ToolCallTimeline blocks={group.toolBlocks} />
                        </div>
                      )}
                    </div>
                  );
                }
                const block = group.blocks[0];
                if (!block) return null;
                return (
                  <ContentBlockRenderer
                    key={block.id || gIdx}
                    block={block}
                    isUserMessage={isUser}
                    isCompleted={!isStreaming}
                  />
                );
              })
            )}
          </div>

          {/* Streaming cursor */}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse bg-primary" />
          )}
        </div>

        {/* Status line below bubble */}
        <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          {/* Timestamp */}
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.timestamp)}
          </span>

          {/* Streaming indicator text */}
          {isStreaming && (
            <span className="text-xs text-primary">正在输出...</span>
          )}

          {/* Failed text + retry */}
          {isFailed && (
            <span className="text-xs flex items-center gap-1.5">
              <span className="text-destructive">发送失败</span>
              {onRetry && (
                <button
                  onClick={() => onRetry(String(message.id))}
                  className="hover:underline text-primary"
                >
                  重试
                </button>
              )}
            </span>
          )}

          {/* Queued text */}
          {isQueued && (
            <span className="text-xs text-warning">排队中</span>
          )}

          {/* Status Indicator */}
          {showStatus && !isFailed && !isQueued && (
            <MessageStatusIndicator
              status={message.messageStatus}
              deliveryStatus={message.deliveryStatus}
              errorMessage={message.errorMessage}
              isStreaming={isStreaming}
              isUser={isUser}
            />
          )}

          {/* Agent execution metadata */}
          {!isUser && !isStreaming && message.context && (
            <MessageMeta context={message.context} />
          )}
        </div>
      </div>

      {/* User Avatar - RIGHT side */}
      {isUser && (
        <div className="flex-shrink-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center bg-muted border border-border"
          >
            <span className="text-sm font-medium text-primary">W</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Content Block Renderer
 */
interface ContentBlockRendererProps {
  block: AnyContentBlock;
  isUserMessage: boolean;
  isCompleted?: boolean;
}

function CollapsibleText({ children, className, style, tag = 'p' }: {
  children: string;
  className: string;
  style?: React.CSSProperties;
  tag?: 'p' | 'pre';
}) {
  const [expanded, setExpanded] = useState(false);
  const safeChildren = children || '';
  const lineCount = safeChildren.split('\n').length;
  const isLong = lineCount > 3 || safeChildren.length > 200;
  const Tag = tag;

  if (!isLong) {
    return <Tag className={className} style={style}>{safeChildren}</Tag>;
  }

  return (
    <div>
      <Tag
        className={className}
        style={{
          ...style,
          ...(expanded ? {} : {
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }),
        }}
      >
        {children}
      </Tag>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs mt-1 transition-colors text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent"
        style={{ padding: '2px 0' }}
      >
        {expanded ? (
          <><ChevronUp style={{ width: 14, height: 14 }} /> 收起</>
        ) : (
          <><ChevronDown style={{ width: 14, height: 14 }} /> 展开全部</>
        )}
      </button>
    </div>
  );
}

/**
 * Markdown content with event delegation for copy/collapse buttons
 */
function MarkdownContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Copy button
      if (target.classList.contains('code-copy-btn')) {
        const wrapper = target.closest('.code-block-wrapper');
        const code = wrapper?.querySelector('code');
        if (code) {
          navigator.clipboard.writeText(code.textContent || '').then(() => {
            target.textContent = '已复制';
            target.classList.add('copied');
            setTimeout(() => {
              target.textContent = '复制';
              target.classList.remove('copied');
            }, 2000);
          });
        }
      }

      // Expand/collapse button
      if (target.classList.contains('code-expand-btn')) {
        const wrapper = target.closest('.code-collapsible');
        if (wrapper) {
          const collapsed = wrapper.getAttribute('data-collapsed') === 'true';
          wrapper.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
          target.textContent = collapsed ? '收起' : target.textContent;
        }
      }
    };

    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, []);

  return (
    <div
      ref={ref}
      className="text-sm leading-relaxed prose prose-sm prose-headings:my-2 prose-p:my-1 w-full max-w-full overflow-hidden"
      style={{ wordBreak: 'break-word', color: 'inherit' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Collapsible wrapper for long markdown/text content
 */
function CollapsibleMarkdown({ html, isLong }: { html: string; isLong: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const LINE_HEIGHT = 20;
  const COLLAPSED_LINES = 3;
  const maxHeight = LINE_HEIGHT * COLLAPSED_LINES;

  if (!isLong) {
    return <MarkdownContent html={html} />;
  }

  return (
    <div>
      <div
        style={{
          ...(expanded ? {} : {
            maxHeight: `${maxHeight}px`,
            overflow: 'hidden',
            position: 'relative' as const,
          }),
        }}
      >
        <MarkdownContent html={html} />
        {!expanded && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 32,
              background: 'linear-gradient(transparent, rgba(249, 250, 251, 0.95))',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs mt-1 transition-colors text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent"
        style={{ padding: '2px 0' }}
      >
        {expanded ? (
          <><ChevronUp style={{ width: 14, height: 14 }} /> 收起</>
        ) : (
          <><ChevronDown style={{ width: 14, height: 14 }} /> 展开全部</>
        )}
      </button>
    </div>
  );
}

function ContentBlockRenderer({ block, isUserMessage, isCompleted }: ContentBlockRendererProps) {
  // Thinking block - Agent's intermediate reasoning
  if (block.type === ContentType.THINKING) {
    return <ThinkingBlockRenderer content={(block as any).content || ''} />;
  }

  // Text block
  if (block.type === ContentType.TEXT) {
    const textContent = (block as any).content || '';
    const hasLongLines = textContent.split('\n').some((line: string) => line.length > 100);
    const looksLikeJson = textContent.trim().startsWith('{') || textContent.trim().startsWith('[');
    const looksLikeCommandOutput = textContent.includes("'command':") || textContent.includes('"command":');

    if (hasLongLines || looksLikeJson || looksLikeCommandOutput) {
      return (
        <CollapsibleText
          tag="pre"
          className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-x-auto max-w-full"
          style={{
            wordBreak: 'break-all',
            overflowWrap: 'anywhere',
            maxWidth: '100%',
          }}
        >
          {textContent}
        </CollapsibleText>
      );
    }

    return (
      <CollapsibleText
        className="text-sm leading-relaxed whitespace-pre-wrap break-words"
        style={{ overflowWrap: 'anywhere' }}
      >
        {textContent}
      </CollapsibleText>
    );
  }

  // Markdown block
  if (block.type === ContentType.MARKDOWN) {
    const markdownContent = (block as any).content || '';
    const renderedHtml = renderMarkdown(markdownContent);
    // Agent 消息的最终回答不折叠，始终完整展示
    if (!isUserMessage) {
      return (
        <div style={{ marginTop: 4 }}>
          <MarkdownContent html={renderedHtml} />
        </div>
      );
    }
    const isLongMarkdown = markdownContent.length > 300 || markdownContent.split('\n').length > 6;
    return (
      <CollapsibleMarkdown html={renderedHtml} isLong={isLongMarkdown} />
    );
  }

  // Code block
  if (block.type === ContentType.CODE) {
    const codeBlock = block as any;
    return (
      <div className="my-2 max-w-full overflow-hidden">
        <pre
          className="rounded-lg p-3 overflow-x-auto text-sm bg-card text-foreground"
          style={{
            maxWidth: '100%',
            wordBreak: 'break-all',
            overflowWrap: 'anywhere',
          }}
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
      <div
        className={`my-2 rounded-lg p-3 text-sm max-w-full overflow-hidden ${result.success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
      >
        <div className="font-medium mb-1">
          {result.success ? '✓ 执行成功' : '✗ 执行失败'}
        </div>
        {result.output && (
          <pre
            className="mt-1 whitespace-pre-wrap overflow-x-auto text-foreground"
            style={{ maxWidth: '100%', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
          >
            {result.output}
          </pre>
        )}
        {result.error && (
          <pre
            className="mt-1 whitespace-pre-wrap overflow-x-auto text-destructive"
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
      <div
        className="my-2 rounded-lg p-3 bg-destructive/10 border border-destructive/30"
      >
        <div className="flex items-center gap-2 text-destructive">
          <span className="font-medium">错误:</span>
          <span>{error.message}</span>
        </div>
        {error.details && (
          <p className="mt-2 text-sm text-destructive">{error.details}</p>
        )}
      </div>
    );
  }

  // Progress block
  if (block.type === ContentType.PROGRESS) {
    const progress = block as any;
    return (
      <div className="my-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex-1 rounded-full h-2 overflow-hidden bg-border">
            <div
              className="h-full transition-all duration-300 bg-primary"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <span className="text-xs">{progress.progress}%</span>
        </div>
        {progress.message && (
          <p className="mt-1 text-xs text-muted-foreground">{progress.message}</p>
        )}
      </div>
    );
  }

  // Tool call block
  if (block.type === ContentType.TOOL_CALL) {
    try {
      return <SafeToolCallBlock block={block as any} isUserMessage={isUserMessage} />;
    } catch (error) {
      console.error('[MessageBubble] Error rendering tool call block:', error);
      const tool = block as any;
      return (
        <div
          className="my-2 rounded-lg p-3 text-sm bg-warning/10 border border-warning/30"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-warning">工具调用显示异常</span>
            <span className="text-xs text-muted-foreground">{tool.toolName}</span>
          </div>
        </div>
      );
    }
  }

  // Task card block
  if (block.type === ContentType.TASK_CARD) {
    const taskCardBlock = block as TaskCardContentBlock;
    return <TaskCardBlock taskCardId={taskCardBlock.taskCardId} taskCardData={taskCardBlock.taskCardData} />;
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

