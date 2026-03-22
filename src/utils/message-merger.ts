/**
 * Message Merger
 *
 * Merges new messages with existing messages, handling duplicates.
 * - Same (message_id, seq) = same chunk, new overwrites old
 */

import type { RawMessage } from '@/types/message-station';

/**
 * Message Merger Class
 */
export class MessageMerger {
  /**
   * Merge existing messages with incoming messages
   *
   * Rules:
   * - Same (message_id, seq) = same chunk, new overwrites old
   * - Different seq = different chunks to be aggregated
   *
   * @param existing - Current message list
   * @param incoming - New messages from poll
   * @returns Merged message list
   */
  static merge(existing: RawMessage[], incoming: RawMessage[]): RawMessage[] {
    const map = new Map<string, RawMessage>();

    // Add existing messages
    for (const msg of existing) {
      const key = `${msg.message_id}:${msg.seq}`;
      map.set(key, msg);
    }

    // Add incoming messages (overwrites duplicates)
    for (const msg of incoming) {
      const key = `${msg.message_id}:${msg.seq}`;
      map.set(key, msg);
    }

    // Convert back to array and sort
    return Array.from(map.values()).sort((a, b) => {
      // Sort by timestamp first
      const timeA = a.timestamp || a.created_at;
      const timeB = b.timestamp || b.created_at;
      return timeA - timeB;
    });
  }

  /**
   * Check if there are any new messages
   *
   * @param existing - Current message list
   * @param incoming - New messages from poll
   * @returns true if there are messages not in existing
   */
  static hasNewMessages(
    existing: RawMessage[],
    incoming: RawMessage[]
  ): boolean {
    const existingKeys = new Set(
      existing.map(m => `${m.message_id}:${m.seq}`)
    );

    return incoming.some(
      m => !existingKeys.has(`${m.message_id}:${m.seq}`)
    );
  }

  /**
   * Get only the new messages from incoming
   *
   * @param existing - Current message list
   * @param incoming - New messages from poll
   * @returns Messages that are not in existing
   */
  static getNewMessages(
    existing: RawMessage[],
    incoming: RawMessage[]
  ): RawMessage[] {
    const existingKeys = new Set(
      existing.map(m => `${m.message_id}:${m.seq}`)
    );

    return incoming.filter(
      m => !existingKeys.has(`${m.message_id}:${m.seq}`)
    );
  }

  /**
   * Get messages updated in incoming (same key but different content)
   *
   * @param existing - Current message list
   * @param incoming - New messages from poll
   * @returns Messages from incoming that update existing ones
   */
  static getUpdatedMessages(
    existing: RawMessage[],
    incoming: RawMessage[]
  ): RawMessage[] {
    const existingMap = new Map(
      existing.map(m => [`${m.message_id}:${m.seq}`, m])
    );

    return incoming.filter(m => {
      const key = `${m.message_id}:${m.seq}`;
      const existingMsg = existingMap.get(key);
      if (!existingMsg) return false;

      // Check if content differs
      return existingMsg.payload !== m.payload;
    });
  }
}

/**
 * Convenience function to merge messages
 */
export function mergeMessages(
  existing: RawMessage[],
  incoming: RawMessage[]
): RawMessage[] {
  return MessageMerger.merge(existing, incoming);
}

/**
 * Convenience function to check for new messages
 */
export function hasNewMessages(
  existing: RawMessage[],
  incoming: RawMessage[]
): boolean {
  return MessageMerger.hasNewMessages(existing, incoming);
}

/**
 * Convenience function to get only new messages
 */
export function getNewMessages(
  existing: RawMessage[],
  incoming: RawMessage[]
): RawMessage[] {
  return MessageMerger.getNewMessages(existing, incoming);
}
