/**
 * Message Organizer
 *
 * Organizes messages into reply relationships based on round_id.
 * - Agent message's round_id = User message's message_id
 * - This creates a "reply to" relationship for styling
 */

import type { UIMessage, ReplyRelation } from '@/types/message-station';

/**
 * Reply Relation Organizer Class
 */
export class ReplyRelationOrganizer {
  /**
   * Organize messages into reply relations
   *
   * Creates relationships between user messages and agent responses
   * based on round_id matching.
   */
  static organize(messages: UIMessage[]): ReplyRelation[] {
    // Get all user messages
    const userMessages = messages.filter(m => m.role === 'user');

    return userMessages.map(userMsg => ({
      userMessageId: userMsg.id,
      // Find all agent messages that reply to this user message
      // (agent messages where replyToId = user message id)
      agentResponses: messages.filter(
        m => m.role !== 'user' && m.replyToId === userMsg.id
      ),
    }));
  }

  /**
   * Get the target message that a message replies to
   *
   * @param message - The message to find the reply target for
   * @param allMessages - All messages to search in
   * @returns The target message, or null if not found
   */
  static getReplyTarget(
    message: UIMessage,
    allMessages: UIMessage[]
  ): UIMessage | null {
    if (!message.replyToId) return null;
    return allMessages.find(m => m.id === message.replyToId) || null;
  }

  /**
   * Get all responses to a specific user message
   *
   * @param userMessageId - The user message ID
   * @param messages - All messages to search in
   * @returns Array of agent messages that reply to the user message
   */
  static getResponsesTo(
    userMessageId: string,
    messages: UIMessage[]
  ): UIMessage[] {
    return messages.filter(
      m => m.role !== 'user' && m.replyToId === userMessageId
    );
  }

  /**
   * Check if a message has any responses
   *
   * @param messageId - The message ID to check
   * @param messages - All messages to search in
   * @returns true if there are responses to this message
   */
  static hasResponses(messageId: string, messages: UIMessage[]): boolean {
    return messages.some(
      m => m.role !== 'user' && m.replyToId === messageId
    );
  }

  /**
   * Organize messages into a threaded structure
   *
   * Returns an array where each item contains a user message and its responses
   */
  static organizeThreads(messages: UIMessage[]): Array<{
    userMessage: UIMessage;
    responses: UIMessage[];
  }> {
    const relations = this.organize(messages);

    return relations
      .filter(r => {
        const userMsg = messages.find(m => m.id === r.userMessageId);
        return userMsg !== undefined;
      })
      .map(r => {
        const userMessage = messages.find(m => m.id === r.userMessageId)!;
        return {
          userMessage,
          responses: r.agentResponses,
        };
      });
  }
}

/**
 * Convenience function to organize reply relations
 */
export function organizeReplyRelations(messages: UIMessage[]): ReplyRelation[] {
  return ReplyRelationOrganizer.organize(messages);
}

/**
 * Convenience function to get reply target
 */
export function getReplyTarget(message: UIMessage, allMessages: UIMessage[]): UIMessage | null {
  return ReplyRelationOrganizer.getReplyTarget(message, allMessages);
}

/**
 * Convenience function to organize threads
 */
export function organizeThreads(messages: UIMessage[]): Array<{
  userMessage: UIMessage;
  responses: UIMessage[];
}> {
  return ReplyRelationOrganizer.organizeThreads(messages);
}
