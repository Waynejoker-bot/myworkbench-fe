import { useMemo } from "react";
import { MessageBubble } from "./message";
import type { UIMessage, ReplyRelation, MessageStatus, DeliveryStatus } from "@/workbench/types/message-station";
import { ContentType } from "@/workbench/types/content-block";
import { sortMessagesByTime } from "@/workbench/utils/message-ordering";

interface AgentConfig {
  name?: string;
  avatar?: string;
}

interface ChatMessagesProps {
  // Legacy API (for compatibility)
  messages?: Array<{
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: Date;
  }>;

  // New API
  uiMessages?: UIMessage[];
  replyRelations?: ReplyRelation[];
  agentConfigs?: Map<string, AgentConfig>;
}

/**
 * Convert legacy message to UIMessage format
 */
function legacyToUIMessage(msg: {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}): UIMessage {
  return {
    id: msg.id,
    source: msg.role === 'user' ? 'user-zc' : 'assistant',
    target: msg.role === 'user' ? 'assistant' : 'user-zc',
    role: msg.role,
    content: msg.content,
    contentBlocks: [{
      type: ContentType.MARKDOWN,
      content: msg.content
    }],
    chunks: [{
      seq: 0,
      status: 3 as MessageStatus,
      content: msg.content,
      timestamp: msg.timestamp.getTime()
    }],
    messageStatus: 3 as MessageStatus,
    deliveryStatus: 'ACKED' as DeliveryStatus,
    startTime: msg.timestamp.getTime(),
    timestamp: msg.timestamp.getTime(),
    context: {},
    hasError: false
  };
}

/**
 * Chat Messages Component
 *
 * Displays chat messages with proper aggregation, reply relationships,
 * and status indicators.
 */
export function ChatMessages({
  messages: legacyMessages,
  uiMessages,
  agentConfigs = new Map(),
}: ChatMessagesProps) {
  // Use new API if available, otherwise fall back to legacy
  const displayMessages = useMemo(() => {
    let messages: UIMessage[];

    if (uiMessages) {
      messages = uiMessages;
    } else {
      // Convert legacy messages to UIMessage format
      messages = (legacyMessages || []).map(legacyToUIMessage);
    }

    // 确保消息按时间升序排序（旧消息在前，新消息在后）
    // 这对于正确的消息显示至关重要
    const sorted = sortMessagesByTime(messages);
    return sorted;
  }, [uiMessages, legacyMessages]);

  // Create a map of messages for quick lookup
  const messagesMap = useMemo(() => {
    const map = new Map<string, UIMessage>();
    for (const msg of displayMessages) {
      map.set(msg.id, msg);
    }
    return map;
  }, [displayMessages]);

  // Group messages by reply relationships
  const messageThreads = useMemo(() => {
    const threads: Array<{
      userMessage: UIMessage | null;
      responses: UIMessage[];
    }> = [];

    const processedIds = new Set<string>();

    for (const msg of displayMessages) {
      if (processedIds.has(msg.id)) continue;

      if (msg.role === 'user') {
        // This is a user message, find all responses to it
        const responses = displayMessages.filter(
          m => m.replyToId === msg.id && !processedIds.has(m.id)
        );

        threads.push({
          userMessage: msg,
          responses
        });

        processedIds.add(msg.id);
        responses.forEach(r => processedIds.add(r.id));
      } else {
        // Agent message - treat as orphan if:
        // 1. No replyToId, OR
        // 2. Has replyToId but the user message doesn't exist
        const parentExists = msg.replyToId && messagesMap.has(msg.replyToId);

        if (!parentExists) {
          // Orphan agent message (no parent user message)
          threads.push({
            userMessage: null,
            responses: [msg]
          });
          processedIds.add(msg.id);
        }
        // If parent exists, this message will be processed when we encounter the user message
      }
    }

    return threads;
  }, [displayMessages, messagesMap]);

  return (
    <div className="space-y-6 px-3 py-4 w-full max-w-full overflow-hidden">
      {messageThreads.map((thread, threadIndex) => (
        <div key={`thread-${threadIndex}`} className="message-thread w-full max-w-full overflow-hidden">
          {/* User Message */}
          {thread.userMessage && (
            <MessageBubble
              key={thread.userMessage.id}
              message={thread.userMessage}
              agentConfig={agentConfigs.get(thread.userMessage.source)}
              targetAgentConfig={agentConfigs.get(thread.userMessage.target)}
            />
          )}

          {/* Agent Responses */}
          {thread.responses.length > 0 && (
            <div className="flex flex-col gap-4 ml-6 mt-1">
              {thread.responses.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  replyToMessage={msg.replyToId ? messagesMap.get(msg.replyToId) ?? undefined : undefined}
                  agentConfig={agentConfigs.get(msg.source)}
                  targetAgentConfig={agentConfigs.get(msg.target)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Legacy alias for backward compatibility
 */
export default ChatMessages;
