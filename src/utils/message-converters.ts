/**
 * Message Converters
 *
 * Utility functions for converting and parsing messages.
 */

import type { RawMessage } from '@/types/message-station';
import type { AnyContentBlock, TaskCardContentBlock } from '@/types/content-block';
import { ContentType, createMarkdownBlock, type ThinkingBlock } from '@/types/content-block';
import type { TaskCard } from '@/types/task-card';

/**
 * Determine message role based on source only
 *
 * Simple rule: if source starts with 'user', it's a user message (right side).
 * Otherwise, it's an assistant message (left side).
 */
export function determineRole(
  message: RawMessage | { source: string; target?: string }
): 'user' | 'assistant' | 'system' {
  const source = message.source;

  // User messages: source starts with 'user'
  if (source.startsWith('user')) {
    return 'user';
  }

  // System messages
  if (source === 'system') {
    return 'system';
  }

  // Everything else is assistant (agent messages)
  return 'assistant';
}

/**
 * Parse payload to plain text
 *
 * Handles the standard payload format:
 * {"type": "text", "data": [{"itemType": "text", "text": "content"}]}
 *
 * This matches the format used by Message Station and Agent Service.
 */
export function parsePayload(payload: string): string {
  try {
    const parsed = JSON.parse(payload);

    // Handle standard payload format with type and data array
    if (parsed.type === 'text' && parsed.data && Array.isArray(parsed.data)) {
      return parsed.data
        .filter((item: any) => item.itemType === 'text' && item.text)
        .map((item: any) => item.text)
        .join('');
    }

    // Handle tool type with tool items
    if (parsed.type === 'tool' && parsed.data && Array.isArray(parsed.data)) {
      return parsed.data
        .filter((item: any) => item.itemType === 'tool' && item.toolItem)
        .map((item: any) => {
          const tool = item.toolItem;
          return `[调用工具: ${tool.name}]`;
        })
        .join('\n');
    }

    // Handle image type
    if (parsed.type === 'image' && parsed.data && Array.isArray(parsed.data)) {
      return parsed.data
        .filter((item: any) => item.itemType === 'image')
        .map(() => '[图片]')
        .join(' ');
    }

    // Handle audio type
    if (parsed.type === 'audio' && parsed.data && Array.isArray(parsed.data)) {
      return parsed.data
        .filter((item: any) => item.itemType === 'audio')
        .map(() => '[音频]')
        .join(' ');
    }

    // Handle video type
    if (parsed.type === 'video' && parsed.data && Array.isArray(parsed.data)) {
      return parsed.data
        .filter((item: any) => item.itemType === 'video')
        .map(() => '[视频]')
        .join(' ');
    }

    // Legacy fallback - try to find text content
    if (parsed.content) {
      return typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content);
    }

    if (parsed.text) {
      return parsed.text;
    }

    // Return original payload if can't parse
    return payload;
  } catch {
    // Not JSON, return as-is
    return payload;
  }
}

/**
 * Parse payload to content blocks
 *
 * Converts payload string into an array of content blocks
 * for rich message display.
 *
 * Supported formats (matching payload-format.md):
 * - Plain text -> MarkdownBlock (all text treated as markdown)
 * - JSON with type="text" and data array -> Extract text items as MarkdownBlock
 * - JSON with type="tool" and data array -> ToolCallBlock
 * - JSON with type="image" and data array -> ImageBlock (future)
 * - JSON with type="audio" and data array -> AudioBlock (future)
 * - JSON with type="video" and data array -> VideoBlock (future)
 */
/** Optional context from the RawMessage for task card type inference */
export interface PayloadContext {
  source?: string;
  target?: string;
}

export function parsePayloadToBlocks(payload: string, ctx?: PayloadContext): AnyContentBlock[] {
  try {
    const parsed = JSON.parse(payload);

    // Handle TASK_CARD payload: { type: 'TASK_CARD', taskCard: {...} }
    // This is the rich task card format from Agent prompt output
    if (parsed.type === 'TASK_CARD' && parsed.taskCard) {
      const taskCard = parsed.taskCard as TaskCard;
      return [
        {
          type: ContentType.TASK_CARD,
          id: `task-card-${taskCard.id}`,
          taskCardId: taskCard.id,
          taskCardData: taskCard,
        } as TaskCardContentBlock,
      ];
    }

    // Handle backend task payload: { type: 'task', action: 'assignment'|'notification', data: [...] }
    // This is the Agent-to-Agent task delegation format from message-station
    if (parsed.type === 'task' && parsed.data && Array.isArray(parsed.data)) {
      const taskAction = parsed.action || 'assignment';
      const blocks: AnyContentBlock[] = [];

      for (const item of parsed.data) {
        if (item.itemType === 'task' && item.taskItem) {
          const ti = item.taskItem;
          const taskId = ti.task_id || `task-${Date.now()}`;

          // Map backend task status to frontend TaskCard status
          const statusMap: Record<string, string> = {
            pending: 'suggested',
            running: 'dispatched',
            completed: 'completed',
            failed: 'completed',
            cancelled: 'completed',
          };

          // Infer cardType:
          // - action="assignment" → always action_suggestion (task dispatched to someone)
          // - action="notification" → action_suggestion (task completion report)
          // - Only visit_report if title explicitly says 拜访汇报/会议纪要
          let inferredCardType: 'visit_report' | 'action_suggestion' = 'action_suggestion';
          if (taskAction === 'assignment' || taskAction === 'notification') {
            // assignment = manager dispatching task → action_suggestion
            // notification = task completion notice → action_suggestion
            // Only override to visit_report if title contains explicit visit report keywords
            const titleHints = /拜访汇报|会议纪要|沟通记录|visit report/i.test(ti.title || '');
            if (titleHints) {
              inferredCardType = 'visit_report';
            }
          }

          // Build a TaskCard from the backend task payload
          const taskCard: TaskCard = {
            id: taskId,
            title: ti.title || '任务',
            summary: ti.description || '',
            cardType: inferredCardType,
            sourceAgent: ti.creator_id || 'system',
            priority: 'medium' as const,
            status: (taskAction === 'notification'
              ? (statusMap[ti.status] || 'completed')
              : inferredCardType === 'visit_report'
                ? 'draft'
                : (statusMap[ti.status] || 'suggested')) as any,
            assigneeRole: taskAction === 'assignment' ? 'sales' : 'manager',
            assigneeName: taskAction === 'assignment' ? ti.assignee_id : ti.creator_id,
            _messageTarget: ctx?.target || '',  // internal: who received this message
            createdAt: ti.created_at || new Date().toISOString(),
            updatedAt: ti.updated_at || new Date().toISOString(),
            trustFlags: [],
            businessContext: { conversationId: ti.source_session_id },
            explainability: {
              confidence: 0.9,
              freshness: ti.created_at || new Date().toISOString(),
              dataTimeRange: '',
              coverage: 1,
              missingData: [],
              keyReasons: ti.result ? [`执行结果: ${ti.result}`] : [],
              evidenceRefs: [],
            },
            // Type-specific fields
            ...(inferredCardType === 'visit_report' ? {
              meetingNotes: [{
                label: ti.title || '拜访记录',
                content: ti.description || '',
              }],
            } : {
              suggestedAction: {
                label: taskAction === 'notification'
                  ? `任务${ti.status === 'completed' ? '已完成' : '进行中'}`
                  : ti.title || '待执行任务',
                editableDraft: ti.description || '',
                dueDate: undefined,
              },
            }),
            ...(ti.result && taskAction === 'notification' ? {
              feedback: {
                result: ti.status === 'completed' ? 'completed' as const : 'partial' as const,
                customerReaction: ti.result,
                nextStepSuggestion: '',
                submittedAt: ti.updated_at || new Date().toISOString(),
              },
            } : {}),
          } as unknown as TaskCard;

          // Register in store
          blocks.push({
            type: ContentType.TASK_CARD,
            id: `task-card-${taskId}`,
            taskCardId: taskId,
            taskCardData: taskCard,
          } as TaskCardContentBlock);
        }
      }

      if (blocks.length > 0) return blocks;
    }

    // Handle standard payload format with type and data array
    if (parsed.type && parsed.data && Array.isArray(parsed.data)) {
      const blocks: AnyContentBlock[] = [];

      // Find the index of the last tool item to determine thinking vs response
      // TextItems AFTER the last tool call are always response (final answer)
      // TextItems BEFORE tool calls are thinking (intermediate reasoning)
      let lastToolIndex = -1;
      for (let i = parsed.data.length - 1; i >= 0; i--) {
        if (parsed.data[i].itemType === 'tool') {
          lastToolIndex = i;
          break;
        }
      }

      // Process all items
      for (let idx = 0; idx < parsed.data.length; idx++) {
        const item = parsed.data[idx];
        switch (item.itemType) {
          case 'text':
            // TextItem after the last tool call = response (final answer)
            // TextItem before/between tool calls = thinking (if role says so or tools exist)
            const isAfterLastTool = lastToolIndex >= 0 && idx > lastToolIndex;
            const isThinking = !isAfterLastTool && (item.role === 'thinking' || (lastToolIndex >= 0 && idx < lastToolIndex));

            if (isThinking && item.text?.trim()) {
              blocks.push({
                type: ContentType.THINKING,
                content: item.text || '',
              } as ThinkingBlock);
            } else {
              blocks.push(createMarkdownBlock(item.text || ''));
            }
            break;

          case 'tool':
            const tool = item.toolItem;
            if (tool) {
              blocks.push({
                id: `tool-${Date.now()}-${Math.random()}`,
                type: ContentType.TOOL_CALL,
                toolName: tool.name,
                parameters: tool.arguments || {},
                result: tool.result,
                status: tool.status || 'success',
              });
            } else {
              console.warn('[parsePayloadToBlocks] Tool item missing toolItem data:', item);
            }
            break;

          case 'image':
            blocks.push({
              id: `image-${Date.now()}-${Math.random()}`,
              type: ContentType.IMAGE,
              url: item.image || '',
              alt: '图片',
            });
            break;

          case 'audio':
            blocks.push({
              id: `audio-${Date.now()}-${Math.random()}`,
              type: ContentType.AUDIO,
              url: item.audio || '',
            });
            break;

          case 'video':
            blocks.push({
              id: `video-${Date.now()}-${Math.random()}`,
              type: ContentType.VIDEO,
              url: item.video || '',
            });
            break;

          default:
            // Unknown item type, try to extract text as markdown
            if (item.text) {
              blocks.push(createMarkdownBlock(item.text));
            }
            break;
        }
      }

      return blocks.length > 0 ? blocks : [createMarkdownBlock(parsePayload(payload))];
    }

    // Legacy format: If it has a type field matching ContentType
    if (parsed.type && Object.values(ContentType).includes(parsed.type as ContentType)) {
      return [parsed];
    }

    // Legacy format: If it has a content or text field, always treat as markdown
    if (parsed.content || parsed.text) {
      return [createMarkdownBlock(parsed.content || parsed.text)];
    }

    // Fallback: parse to text and create markdown block
    return [createMarkdownBlock(parsePayload(payload))];

  } catch {
    // Not JSON, always treat as markdown
    return [createMarkdownBlock(payload)];
  }
}

/**
 * Serialize content blocks to payload string
 */
export function blocksToPayload(blocks: AnyContentBlock[]): string {
  return JSON.stringify(blocks);
}

/**
 * Extract plain text from content blocks
 *
 * Converts all content blocks to plain text representation
 */
export function blocksToPlainText(blocks: AnyContentBlock[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case ContentType.TEXT:
        return (block as any).content;
      case ContentType.MARKDOWN:
        // For markdown, strip markdown syntax to get plain text
        return stripMarkdown((block as any).content);
      case ContentType.THINKING:
        return (block as any).content;
      case ContentType.CODE:
        return (block as any).code;
      case ContentType.CODE_RESULT:
        const codeResult = block as any;
        return codeResult.success
          ? codeResult.output || '执行成功'
          : codeResult.error || '执行失败';
      case ContentType.ERROR:
        return (block as any).message;
      case ContentType.TOOL_CALL:
        return `[调用工具: ${(block as any).toolName}]`;
      case ContentType.PROGRESS:
        const progress = block as any;
        return progress.message || `进度: ${progress.progress}%`;
      case ContentType.CARD:
        return (block as any).content || (block as any).title || '';
      default:
        return '';
    }
  }).filter(Boolean).join('\n');
}

/**
 * Strip markdown syntax to get plain text
 */
function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/#{1,6}\s/g, '')                    // Remove headers
    .replace(/```[\s\S]*?```/g, (match) => {     // Replace code blocks
      const lines = match.split('\n');
      // Remove first and last line (```)
      return lines.slice(1, -1).join('\n');
    })
    .replace(/`([^`]+)`/g, '$1')                  // Inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1')            // Bold
    .replace(/\*([^*]+)\*/g, '$1')                // Italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')      // Links
    .replace(/^\s*[-*+]\s/gm, '• ')              // Lists
    .replace(/^\s*\d+\.\s/gm, '')                 // Numbered lists
    .trim();
}

/**
 * Format timestamp to relative time string
 */
export function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format timestamp to full time string
 */
export function formatFullTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
