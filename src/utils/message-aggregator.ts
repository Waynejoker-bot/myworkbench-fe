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

    // IMPORTANT: poll-message returns COMPLETE content, not incremental.
    // So we only use the LAST chunk's payload, not aggregate all chunks.
    const content = parsePayload(last.payload);

    // Build chunks array (keep all chunks for status tracking, but content is from last)
    const chunks: StreamChunk[] = sorted.map(m => ({
      seq: m.seq,
      status: m.status as MessageStatus,
      content: parsePayload(m.payload),
      timestamp: m.timestamp || m.created_at,
    }));

    // Parse content blocks from the LAST payload only (complete content)
    let contentBlocks: AnyContentBlock[] = [];

    try {
      console.log('[message-aggregator] Parsing lastPayload:', last.payload);
      contentBlocks = parsePayloadToBlocks(last.payload);
      console.log('[message-aggregator] Parsed contentBlocks:', contentBlocks);
    } catch (error) {
      // Fallback to parsing from content
      console.error('[message-aggregator] Error parsing contentBlocks, using fallback:', error);
      console.log('[message-aggregator] Fallback content:', content);
      contentBlocks = parsePayloadToBlocks(content);
      console.log('[message-aggregator] Fallback contentBlocks:', contentBlocks);
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
