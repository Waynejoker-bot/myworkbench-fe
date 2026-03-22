import { useState } from 'react';
import type { ToolCallBlock } from '@/types/content-block';
import { getToolDescription } from '@/utils/tool-status';

interface ToolCallTimelineProps {
  blocks: ToolCallBlock[];
}

const STATUS_COLORS: Record<string, string> = {
  running: '#f59e0b',
  success: '#22c55e',
  error: '#ef4444',
  pending: '#64748b',
};

export function ToolCallTimeline({ blocks }: ToolCallTimelineProps) {
  return (
    <ol
      style={{
        listStyle: 'none',
        margin: '4px 0',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {blocks.map((block, index) => (
        <ToolCallStep
          key={block.id || index}
          block={block}
          isLast={index === blocks.length - 1}
        />
      ))}
    </ol>
  );
}

function ToolCallStep({ block, isLast }: { block: ToolCallBlock; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const status = block.status || 'pending';
  const color = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const description = getToolDescription({
    name: block.toolName,
    arguments: block.parameters,
    result: block.result,
  });

  return (
    <li role="listitem" style={{ display: 'flex', gap: 10, minHeight: 28 }}>
      {/* Timeline rail */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
        {/* Status dot */}
        <div
          data-status={status}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            marginTop: 6,
            flexShrink: 0,
            animation: status === 'running' ? 'pulse 1.4s ease-in-out infinite' : undefined,
          }}
        />
        {/* Vertical line */}
        {!isLast && (
          <div style={{ flex: 1, width: 1, background: '#d1d5db', minHeight: 12 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 4 }}>
        <div
          onClick={() => block.result !== undefined && setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: block.result !== undefined ? 'pointer' : 'default',
            fontSize: 12,
            lineHeight: '20px',
          }}
        >
          {/* Description */}
          <span style={{
            color: '#111827',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {description}
          </span>
          {/* Tool name badge */}
          <span style={{
            color: '#475569',
            fontSize: 11,
            flexShrink: 0,
          }}>
            {block.toolName}
          </span>
          {/* Expand indicator */}
          {block.result !== undefined && (
            <span style={{ color: '#475569', fontSize: 10, flexShrink: 0 }}>
              {expanded ? '▼' : '▶'}
            </span>
          )}
        </div>

        {/* Expanded result */}
        {expanded && block.result !== undefined && (
          <pre style={{
            margin: '4px 0 0',
            padding: 8,
            background: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            fontSize: 11,
            color: status === 'error' ? '#ef4444' : '#94a3b8',
            overflow: 'auto',
            maxHeight: 200,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {typeof block.result === 'string' ? block.result : JSON.stringify(block.result, null, 2)}
          </pre>
        )}
      </div>
    </li>
  );
}
