import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  sendMessage as apiSendMessage,
  generateMessageId,
  textToPayload,
  startPolling as apiStartPolling,
  type SSEConnectedData,
  SendMessageError,
} from '@/api/chat';

// Import our new types
import type { RawMessage, UIMessage, ReplyRelation } from '@/workbench/types/message-station';
import { aggregateMessages } from '@/workbench/utils/message-aggregator';
import { organizeReplyRelations } from '@/workbench/utils/message-organizer';
import { mergeMessages } from '@/workbench/utils/message-merger';
import { parsePayload } from '@/workbench/utils/message-converters';
import { getMessages, extractLatestUpdateTime } from '@/api/message-station';
import { workbenchStorage } from '@/workbench/storage';

// Re-export types that were previously in this file
export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

/**
 * Extended PollMessage to match RawMessage format
 */
export interface ExtendedPollMessage {
  message_id: string;
  session_id: string;
  round_id: string;
  payload: string;
  source: string;
  target: string;
  status: number;
  seq: number;
  timestamp: number;
  context?: Record<string, string>;
  // Additional fields from RawMessage
  id?: number;
  delivery_status?: string;
  created_at?: number;
}

/**
 * Hook return type
 */
export interface UseChatMessagesReturn {
  // Original fields (for compatibility)
  messages: Message[];
  isSending: boolean;
  send: (content: string, agentId: string) => Promise<boolean>;
  clear: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;

  // New fields
  rawMessages: RawMessage[];
  uiMessages: UIMessage[];
  replyRelations: ReplyRelation[];
  isLoading: boolean;

  // Last message source (for auto-selecting agent)
  lastMessageSource: string | null;

  // Pagination
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => Promise<void>;
}

/**
 * Convert ExtendedPollMessage to RawMessage
 */
function pollMessageToRawMessage(msg: ExtendedPollMessage): RawMessage {
  return {
    id: msg.id || 0,
    session_id: msg.session_id,
    round_id: msg.round_id,
    message_id: msg.message_id,
    source: msg.source,
    target: msg.target,
    seq: msg.seq,
    status: msg.status,
    delivery_status: msg.delivery_status || 'P',
    context: msg.context || {},
    payload: msg.payload,
    timestamp: msg.timestamp,
    created_at: msg.created_at || msg.timestamp,
  };
}

/**
 * Convert UIMessage to legacy Message format (for compatibility)
 */
function uiMessageToLegacyMessage(msg: UIMessage): Message {
  return {
    id: msg.id,
    content: msg.content,
    role: msg.role === 'system' ? 'assistant' : msg.role,
    timestamp: new Date(msg.timestamp),
  };
}

/**
 * Enhanced useChatMessages Hook
 *
 * Uses new data structures with proper aggregation and reply relationship handling
 */
export function useChatMessages(activeConversationId: string | null): UseChatMessagesReturn {
  // Raw messages from API (before aggregation)
  const [rawMessages, setRawMessages] = useState<RawMessage[]>([]);

  // Aggregated UI messages
  const [uiMessages, setUiMessages] = useState<UIMessage[]>([]);

  // Reply relations
  const [replyRelations, setReplyRelations] = useState<ReplyRelation[]>([]);

  // Legacy messages (for compatibility)
  const [messages, setMessages] = useState<Message[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 当前会话的 last_update_time（用于 SSE 轮询）
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  const userIdRef = useRef<string>("user-zc");
  const pollingCleanupRef = useRef<(() => void) | null>(null);
  // 跟踪是否已初始化 last_update_time
  const initializedRef = useRef<Record<string, boolean>>({});

  /**
   * Handle new messages from polling
   * @param incoming - New messages to add
   * @param replace - If true, replace all messages instead of merging (used when loading new session)
   */
  const handleNewMessages = useCallback((incoming: ExtendedPollMessage[] | RawMessage[], replace = false) => {
    if (!incoming) return;

    // When in replace mode with empty array, clear all messages
    if (replace && incoming.length === 0) {
      setRawMessages([]);
      setUiMessages([]);
      setReplyRelations([]);
      setMessages([]);
      return;
    }

    // For non-replace mode, empty array means nothing to add
    if (incoming.length === 0) return;

    setRawMessages(prev => {
      // Convert poll messages to RawMessage if needed
      const first = incoming[0];
      if (!first) return prev;

      const incomingRaw = 'round_id' in first
        ? incoming as RawMessage[]
        : (incoming as ExtendedPollMessage[]).map(pollMessageToRawMessage);

      // If replace mode, don't merge - just use incoming
      const messagesToProcess = replace ? incomingRaw : mergeMessages(prev, incomingRaw);

      // Aggregate to UI messages
      const aggregated = aggregateMessages(messagesToProcess);
      console.log('[useChatMessages] Aggregated messages:', aggregated.map(m => ({ id: m.id, contentBlocks: m.contentBlocks })));
      setUiMessages(aggregated);

      // Organize reply relations
      const relations = organizeReplyRelations(aggregated);
      setReplyRelations(relations);

      // Update legacy messages for compatibility
      setMessages(aggregated.map(uiMessageToLegacyMessage));

      return messagesToProcess;
    });
  }, []);

  /**
   * Handle single message from polling (for SSE)
   */
  const handlePollMessage = useCallback((data: any) => {
    const isUserMessage = data.source === 'user-zc' || data.source.startsWith('user-');

    // Skip user messages from polling (we add them locally)
    if (isUserMessage) {
      return;
    }

    // Check for empty content
    const textContent = parsePayload(data.payload);
    if (!textContent || textContent.trim() === "") {
      return;
    }

    // Update last_update_time if this message has a newer timestamp
    if (data.update_time && data.update_time > lastUpdateTime) {
      const newTimestamp = data.update_time;
      setLastUpdateTime(newTimestamp);
      if (activeConversationId) {
        workbenchStorage.saveSessionTimestamp(activeConversationId, newTimestamp);
      }
    }

    // Process as new message
    handleNewMessages([data]);
  }, [handleNewMessages, lastUpdateTime, activeConversationId]);

  /**
   * Handle SSE Connected 事件
   */
  const handleConnected = useCallback((data: SSEConnectedData) => {
    console.log('[SSE] Connected with last_update_time:', data.last_update_time);

    // 更新内存状态
    setLastUpdateTime(data.last_update_time);

    // 持久化到 localStorage
    if (activeConversationId) {
      workbenchStorage.saveSessionTimestamp(activeConversationId, data.last_update_time);
    }
  }, [activeConversationId]);

  // Load session messages on mount or session change
  useEffect(() => {
    if (!activeConversationId) {
      // Clear all when no session
      setRawMessages([]);
      setUiMessages([]);
      setReplyRelations([]);
      setMessages([]);
      setLastUpdateTime(0);
      setCurrentPage(1);
      setTotalPages(1);
      return;
    }

    // 重置初始化状态
    initializedRef.current[activeConversationId] = false;

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        // 1. 尝试从 localStorage 恢复 last_update_time
        const savedTimestamp = workbenchStorage.getSessionTimestamp(activeConversationId);

        // 2. 从新的 MSAPI 接口获取历史消息（第一页）
        const data = await getMessages(activeConversationId, 1, 10);
        const rawMsgs: RawMessage[] = data.messages || [];

        // 设置分页信息
        setCurrentPage(data.page || 1);
        setTotalPages(data.total_pages || 1);

        // 3. 从历史消息中提取最晚的 update_time
        const latestTime = extractLatestUpdateTime(rawMsgs);
        const finalTimestamp = latestTime > 0 ? Math.max(savedTimestamp, latestTime) : savedTimestamp;

        // 更新状态
        setLastUpdateTime(finalTimestamp);
        workbenchStorage.saveSessionTimestamp(activeConversationId, finalTimestamp);

        // 4. 处理消息
        handleNewMessages(rawMsgs, true);

        // 5. 在加载完消息后再启动轮询，确保 lastUpdateTime 已正确设置
        const cleanup = apiStartPolling(
          activeConversationId,
          finalTimestamp,  // 使用计算好的时间戳
          handlePollMessage,
          handleConnected,
          (error) => {
            console.error('Polling error:', error);
          }
        );

        pollingCleanupRef.current = cleanup;
      } catch (error) {
        console.error('Failed to load messages:', error);
        setRawMessages([]);
        setUiMessages([]);
        setReplyRelations([]);
        setMessages([]);
      } finally {
        setIsLoading(false);
        initializedRef.current[activeConversationId] = true;
      }
    };

    loadMessages();

    return () => {
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
        pollingCleanupRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  /**
   * Load more messages (previous page)
   */
  const loadMore = useCallback(async () => {
    if (!activeConversationId || isLoadingMore || currentPage >= totalPages) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await getMessages(activeConversationId, nextPage, 10);
      const rawMsgs: RawMessage[] = data.messages || [];

      if (rawMsgs.length > 0) {
        // Prepend messages to existing ones
        setRawMessages(prev => {
          const combined = [...rawMsgs, ...prev];
          const aggregated = aggregateMessages(combined);
          setUiMessages(aggregated);
          const relations = organizeReplyRelations(aggregated);
          setReplyRelations(relations);
          setMessages(aggregated.map(uiMessageToLegacyMessage));
          return combined;
        });
      }

      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeConversationId, isLoadingMore, currentPage, totalPages]);

  // 处理首次连接（无历史消息）的情况
  useEffect(() => {
    if (activeConversationId && !isLoading && lastUpdateTime === 0 && initializedRef.current[activeConversationId]) {
      const now = Date.now();
      setLastUpdateTime(now);
      workbenchStorage.saveSessionTimestamp(activeConversationId, now);
    }
  }, [activeConversationId, isLoading, lastUpdateTime]);

  /**
   * Send message
   */
  const send = useCallback(async (content: string, agentId: string) => {
    if (!activeConversationId || isSending || !content.trim()) {
      return false;
    }

    setIsLoading(true);
    setIsSending(true);

    const messageId = generateMessageId(activeConversationId);

    // Create user message (round_id = message_id for user messages)
    const userMessage: RawMessage = {
      id: 0, // No DB ID yet
      session_id: activeConversationId,
      round_id: messageId, // User messages have round_id = message_id
      message_id: messageId,
      source: userIdRef.current,
      target: agentId,
      seq: 0,
      status: 3, // END (user messages are complete immediately)
      delivery_status: 'P',
      context: {},
      payload: textToPayload(content.trim()),
      timestamp: Date.now(),
      created_at: Date.now(),
    };

    // Add user message immediately
    handleNewMessages([userMessage]);

    try {
      await apiSendMessage({
        session_id: activeConversationId,
        round_id: messageId,
        message_id: messageId,
        source: userIdRef.current,
        target: agentId,
        payload: textToPayload(content.trim()),
        seq: 0,
        status: 3,
        context: {}
      });

      return true;
    } catch (error) {
      console.error('Failed to send message:', error);

      // Check if it's a SendMessageError
      const isSendMessageError = error instanceof SendMessageError;
      const isAgentBusy = isSendMessageError && (error as SendMessageError).isAgentBusy();

      // Extract error message
      const errorMsg = error instanceof Error ? error.message : '发送失败，请重试';

      // Determine delivery status: QUEUED if agent is busy, FAILED otherwise
      const deliveryStatus = isAgentBusy ? 'QUEUED' : 'FAILED';

      // Update the user message to mark with appropriate status
      setRawMessages(prev => {
        const updated = prev.map(msg =>
          msg.message_id === messageId
            ? {
                ...msg,
                delivery_status: deliveryStatus,
                context: isAgentBusy ? msg.context : { ...msg.context, error: errorMsg }
              }
            : msg
        );

        // Re-aggregate to update UI messages
        const aggregated = aggregateMessages(updated);
        setUiMessages(aggregated);

        const relations = organizeReplyRelations(aggregated);
        setReplyRelations(relations);

        setMessages(aggregated.map(uiMessageToLegacyMessage));

        return updated;
      });

      // Return true for queued messages (they are accepted, just delayed)
      // Return false for actual failures
      return isAgentBusy;
    } finally {
      setIsSending(false);
      setIsLoading(false);
    }
  }, [activeConversationId, isSending, handleNewMessages]);

  /**
   * Clear all messages
   */
  const clear = useCallback(() => {
    setRawMessages([]);
    setUiMessages([]);
    setReplyRelations([]);
    setMessages([]);
  }, []);

  // Get the source of the last message (for auto-selecting agent)
  const lastMessageSource = useMemo(() => {
    if (uiMessages.length === 0) return null;
    const lastMessage = uiMessages[uiMessages.length - 1];
    return lastMessage?.source ?? null;
  }, [uiMessages]);

  return {
    // New API
    rawMessages,
    uiMessages,
    replyRelations,
    isLoading,
    lastMessageSource,

    // Pagination
    hasMore: currentPage < totalPages,
    isLoadingMore,
    loadMore,

    // Legacy API (for compatibility)
    messages,
    isSending,
    send,
    clear,
    setMessages,
  };
}

// Export the new hook as default
export default useChatMessages;
