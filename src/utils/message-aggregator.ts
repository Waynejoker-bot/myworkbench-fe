/**
 * Message Aggregator
 *
 * Aggregates streaming messages from Message Station.
 * - Groups by message_id (same message_id = same streaming message with different seq)
 * - Each message_id represents one complete message after aggregation
 *
 * IMPORTANT: round_id is NOT used for aggregation, only for reply relationships.
 */

import type { RawMessage, UIMessage, StreamChunk } from '@/types/message-station';
import { MessageStatus, DeliveryStatus } from '@/types/message-station';
import type { AnyContentBlock } from '@/types/content-block';
import { ContentType } from '@/types/content-block';
import { parsePayload, parsePayloadToBlocks, determineRole } from './message-converters';

/**
 * Message Aggregator Class
 */
export class MessageAggregator {
  /**
   * Group messages by message_id (for streaming aggregation)
   *
   * Each group contains all chunks of the same streaming message (different seq)
   */
  static groupMessages(messages: RawMessage[]): Map<string, RawMessage[]> {
    const groups = new Map<string, RawMessage[]>();

    for (const msg of messages) {
      const key = msg.message_id; // Only group by message_id, NOT round_id
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(msg);
    }

    return groups;
  }

  /**
   * Aggregate a single group of messages (same message_id, different seq)
   */
  static aggregateGroup(messages: RawMessage[]): UIMessage {
    if (messages.length === 0) {
      throw new Error('Cannot aggregate empty message group');
    }

    // Sort by seq to ensure correct order
    const sorted = [...messages].sort((a, b) => a.seq - b.seq);

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (!first || !last) {
      throw new Error('Failed to extract first/last message from group');
    }

    // Content from last payload (for compatibility field)
    const content = parsePayload(last.payload);

    // Build chunks array (keep all chunks for status tracking)
    const chunks: StreamChunk[] = sorted.map(m => ({
      seq: m.seq,
      status: m.status as MessageStatus,
      content: parsePayload(m.payload),
      timestamp: m.timestamp || m.created_at,
    }));

    // Merge content blocks from ALL payloads (not just the last one).
    // Each payload is a complete snapshot of that send's pending_items.
    // We need to deduplicate: later payloads may contain updated versions of
    // items from earlier payloads (same tool_use_id, or accumulated text).
    // Strategy: collect all unique blocks across all payloads, using the latest
    // version of each. Tool blocks are identified by toolName+parameters combo,
    // text/thinking blocks accumulate across payloads.
    let contentBlocks: AnyContentBlock[] = [];

    try {
      contentBlocks = this.mergeAllPayloads(sorted);
    } catch (error) {
      console.error('[message-aggregator] Error merging payloads, falling back to last:', error);
      contentBlocks = parsePayloadToBlocks(last.payload, { source: last.source, target: last.target });
    }

    const isComplete = last.status === MessageStatus.END;
    const hasError = last.status === MessageStatus.ERROR || last.delivery_status === 'FAILED';

    const isUserMessage = determineRole(last) === 'user';

    // Extract error message from context if delivery failed
    const errorMessage = last.delivery_status === 'FAILED'
      ? (last.context?.error || '发送失败，请重试')
      : undefined;

    const uiMessage = {
      id: last.message_id,
      // For user messages, replyToId should be undefined (not self-referencing)
      // For agent messages, replyToId is the round_id (which equals the user message's message_id)
      replyToId: isUserMessage ? undefined : last.round_id,
      dbId: last.id,
      source: last.source,
      target: last.target,
      role: determineRole(last),
      content, // Compatibility field
      contentBlocks,
      chunks,
      messageStatus: last.status as MessageStatus,
      deliveryStatus: last.delivery_status as DeliveryStatus,
      startTime: first.timestamp || first.created_at,
      endTime: isComplete ? (last.timestamp || last.created_at) : undefined,
      timestamp: last.timestamp || last.created_at,
      context: last.context || {},
      hasError,
      errorMessage,
    };

    console.log('[message-aggregator] Returning UIMessage:', uiMessage.id, 'contentBlocks:', uiMessage.contentBlocks);
    return uiMessage;
  }

  /**
   * Merge content blocks from all payloads of a message group.
   * Each payload is a snapshot of pending_items at send time.
   * Later payloads may contain updated versions of the same items.
   * We deduplicate tools by tool_use_id and keep the latest text per "slot".
   */
  static mergeAllPayloads(sorted: RawMessage[]): AnyContentBlock[] {
    // Parse all payloads into block arrays
    const allBlockSets: AnyContentBlock[][] = [];
    for (const msg of sorted) {
      try {
        const blocks = parsePayloadToBlocks(msg.payload, {
          source: msg.source,
          target: msg.target,
        });
        if (blocks.length > 0) {
          allBlockSets.push(blocks);
        }
      } catch {
        // skip unparseable payloads
      }
    }

    if (allBlockSets.length === 0) return [];
    if (allBlockSets.length === 1) return allBlockSets[0]!;

    // Each payload is a snapshot. Later snapshots supersede earlier ones
    // for the SAME items, but new items (from new rounds) should be appended.
    //
    // Strategy: track seen tool blocks by a fingerprint (toolName + first 50 chars of params).
    // For text/thinking/markdown blocks, each payload's text block replaces the previous
    // text from the same "position" but new positions are appended.

    const result: AnyContentBlock[] = [];
    const seenToolKeys = new Set<string>();

    for (const blocks of allBlockSets) {
      for (const block of blocks) {
        if (block.type === ContentType.TOOL_CALL) {
          const tool = block as any;
          // Use tool_use_id or fallback to name+params fingerprint
          // Use toolName+params as fingerprint for dedup (tool.id is random per parse)
          const key = `${tool.toolName}:${JSON.stringify(tool.parameters).slice(0, 80)}`;
          if (seenToolKeys.has(key)) {
            // Update existing tool block in result
            const idx = result.findIndex(b => {
              if (b.type !== ContentType.TOOL_CALL) return false;
              const t = b as any;
              const k = `${t.toolName}:${JSON.stringify(t.parameters).slice(0, 80)}`;
              return k === key;
            });
            if (idx >= 0) result[idx] = block;
          } else {
            seenToolKeys.add(key);
            result.push(block);
          }
        } else {
          // For text/thinking/markdown: each payload is a snapshot.
          // Later payloads may resend the same text as different block types
          // (e.g. THINKING in one chunk, MARKDOWN in another).
          // Deduplicate ACROSS all text-like types using normalized content.
          const content = ((block as any).content || '').trim();
          if (!content) continue;

          const isTextLike = (type: ContentType) =>
            type === ContentType.THINKING || type === ContentType.TEXT || type === ContentType.MARKDOWN;

          // Normalize: strip markdown formatting for comparison
          const normalize = (s: string) => s.replace(/[`*_#\[\]()]/g, '').replace(/\s+/g, ' ').trim();
          const normalizedContent = normalize(content);

          // Find existing text-like block with same or subset content
          const existingIdx = result.findIndex(b => {
            if (!isTextLike(b.type)) return false;
            const existing = normalize(((b as any).content || '').trim());
            return existing === normalizedContent || normalizedContent.includes(existing);
          });

          if (existingIdx >= 0) {
            // Keep the THINKING version (preferred style), update content if expanded
            const existing = result[existingIdx]!;
            if (block.type === ContentType.THINKING) {
              result[existingIdx] = block; // prefer thinking style
            } else if (existing.type !== ContentType.THINKING) {
              result[existingIdx] = block; // update non-thinking with newer version
            }
            // If existing is THINKING and new is MARKDOWN, keep existing (thinking style)
          } else {
            // Check if new content is a subset of an existing block
            const supersetIdx = result.findIndex(b => {
              if (!isTextLike(b.type)) return false;
              const existing = normalize(((b as any).content || '').trim());
              return existing.includes(normalizedContent);
            });
            if (supersetIdx >= 0) {
              // Already have a longer version, skip
              continue;
            }
            result.push(block);
          }
        }
      }
    }

    return result;
  }

  /**
   * Aggregate all messages
   */
  static aggregate(messages: RawMessage[]): UIMessage[] {
    const groups = this.groupMessages(messages);
    const result: UIMessage[] = [];

    // Convert Map to array and iterate
    const groupArray = Array.from(groups.values());
    for (const group of groupArray) {
      result.push(this.aggregateGroup(group));
    }

    // Sort by start time
    return result.sort((a, b) => a.startTime - b.startTime);
  }
}

/**
 * Convenience function to aggregate messages
 */
export function aggregateMessages(messages: RawMessage[]): UIMessage[] {
  return MessageAggregator.aggregate(messages);
}
