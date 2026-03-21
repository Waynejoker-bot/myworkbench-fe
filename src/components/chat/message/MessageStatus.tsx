import { MessageStatus, DeliveryStatus } from '@/workbench/types/message-station';
import { Loader2, Check, AlertCircle, Clock, ListOrdered } from 'lucide-react';

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  deliveryStatus?: DeliveryStatus;
  errorMessage?: string;
  isStreaming?: boolean;
  isUser?: boolean;
  className?: string;
}

/**
 * Message Status Indicator Component
 *
 * Displays the current status of a message
 */
export function MessageStatusIndicator({
  status,
  deliveryStatus,
  errorMessage,
  isStreaming = false,
  isUser = false,
  className = ''
}: MessageStatusIndicatorProps) {
  // Delivery queued (agent is busy)
  if (deliveryStatus === 'QUEUED') {
    return (
      <div
        className={`flex items-center gap-1.5 text-amber-500 ${className}`}
        title="Agent 正忙，消息正在排队等待处理"
      >
        <ListOrdered className="h-3.5 w-3.5" />
        {isUser && <span className="text-xs">排队中</span>}
      </div>
    );
  }

  // Delivery failed (for user messages)
  if (deliveryStatus === 'FAILED') {
    const tooltip = errorMessage || '发送失败';
    return (
      <div
        className={`flex items-center gap-1.5 text-red-500 cursor-help ${className}`}
        title={tooltip}
      >
        <AlertCircle className="h-3.5 w-3.5" />
        {isUser && <span className="text-xs">发送失败</span>}
      </div>
    );
  }

  // Streaming in progress (START or CHUNK)
  if (isStreaming || status === MessageStatus.START || status === MessageStatus.CHUNK) {
    return (
      <div className={`flex items-center gap-1.5 text-blue-500 ${className}`} title="正在输入...">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs">输入中</span>
      </div>
    );
  }

  // Complete
  if (status === MessageStatus.END) {
    return (
      <div className={`flex items-center gap-1.5 text-green-500 ${className}`} title="已发送">
        <Check className="h-3.5 w-3.5" />
      </div>
    );
  }

  // Error
  if (status === MessageStatus.ERROR) {
    return (
      <div className={`flex items-center gap-1.5 text-red-500 ${className}`} title="发生错误">
        <AlertCircle className="h-3.5 w-3.5" />
        <span className="text-xs">失败</span>
      </div>
    );
  }

  // Unknown/Pending
  return (
    <div className={`flex items-center gap-1.5 text-slate-400 ${className}`} title="等待中">
      <Clock className="h-3.5 w-3.5" />
    </div>
  );
}

/**
 * Compact status indicator (icon only, no text)
 */
interface CompactStatusIndicatorProps {
  status: MessageStatus;
  deliveryStatus?: DeliveryStatus;
  errorMessage?: string;
  isStreaming?: boolean;
  className?: string;
}

export function CompactStatusIndicator({
  status,
  deliveryStatus,
  errorMessage,
  isStreaming = false,
  className = ''
}: CompactStatusIndicatorProps) {
  // Delivery queued (agent is busy)
  if (deliveryStatus === 'QUEUED') {
    return (
      <span title="Agent 正忙，消息正在排队等待处理">
        <ListOrdered className={`h-4 w-4 text-amber-500 ${className}`} />
      </span>
    );
  }

  // Delivery failed
  if (deliveryStatus === 'FAILED') {
    return (
      <span title={errorMessage || '发送失败'}>
        <AlertCircle className={`h-4 w-4 text-red-500 cursor-help ${className}`} />
      </span>
    );
  }

  if (isStreaming || status === MessageStatus.START || status === MessageStatus.CHUNK) {
    return <Loader2 className={`h-4 w-4 text-blue-500 animate-spin ${className}`} />;
  }

  if (status === MessageStatus.END) {
    return <Check className={`h-4 w-4 text-green-500 ${className}`} />;
  }

  if (status === MessageStatus.ERROR) {
    return <AlertCircle className={`h-4 w-4 text-red-500 ${className}`} />;
  }

  return <Clock className={`h-4 w-4 text-slate-400 ${className}`} />;
}
