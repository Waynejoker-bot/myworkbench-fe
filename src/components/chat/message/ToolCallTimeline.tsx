import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ToolCallBlock } from '@/types/content-block';
import { getToolDescription } from '@/utils/tool-status';

interface ToolCallTimelineProps {
  blocks: ToolCallBlock[];
}

/**
 * ToolCallTimeline - 工具调用时间线
 *
 * 默认折叠，用户点击"展开工具调用"查看详情。
 * 工具调用只对开发者 debug 有价值，普通用户不需要看。
 */
export function ToolCallTimeline({ blocks }: ToolCallTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ margin: '4px 0' }}>
      {/* Collapse toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex items-center gap-1 border-none bg-transparent cursor-pointer text-muted-foreground"
        style={{ fontSize: 12, padding: '6px 0', minHeight: 32 }}
      >
        {expanded ? (
          <ChevronDown style={{ width: 14, height: 14, opacity: 0.5 }} />
        ) : (
          <ChevronRight style={{ width: 14, height: 14, opacity: 0.5 }} />
        )}
        <span>{expanded ? 'tools' : `tools (${blocks.length})`}</span>
      </button>

      {/* Tool call list - only visible when expanded */}
      {expanded && (
        <ol
          style={{
            listStyle: 'none',
            margin: '2px 0 0',
            padding: '0 0 0 4px',
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
      )}
    </div>
  );
}

function ToolCallStep({ block, isLast }: { block: ToolCallBlock; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const rawStatus = block.status || 'running';
  const status = (['running', 'success', 'error'].includes(rawStatus) ? rawStatus : 'running') as 'running' | 'success' | 'error';
  const description = getToolDescription({
    name: block.toolName,
    arguments: block.parameters,
    result: block.result,
  }, status);

  const hasResult = block.result !== undefined;

  return (
    <li role="listitem" style={{ display: 'flex', gap: 8, minHeight: 24 }}>
      {/* Timeline rail */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12, flexShrink: 0 }}>
        {/* Status dot */}
        <div
          data-status={status}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            marginTop: 7,
            flexShrink: 0,
            backgroundColor: status === 'error' ? 'var(--error, #F43F5E)' :
                           status === 'running' ? 'var(--warning, #F59E0B)' :
                           'var(--success, #10B981)',
            opacity: 0.7,
            animation: status === 'running' ? 'pulse 1.4s ease-in-out infinite' : undefined,
          }}
        />
        {/* Vertical line */}
        {!isLast && (
          <div style={{ flex: 1, width: 1, minHeight: 8, backgroundColor: 'var(--border, #E2E8F0)', opacity: 0.5 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 2 }}>
        <div
          onClick={() => hasResult && setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: hasResult ? 'pointer' : 'default',
            fontSize: 12,
            lineHeight: '18px',
          }}
        >
          {/* Natural language description */}
          <span className="text-muted-foreground" style={{ fontSize: 12 }}>
            {description}
          </span>
          {/* Subtle expand indicator */}
          {hasResult && (
            <span className="text-muted-foreground" style={{ fontSize: 10, opacity: 0.5 }}>
              {expanded ? '▾' : '▸'}
            </span>
          )}
        </div>

        {/* Expanded detail (hidden debug entry) */}
        {expanded && hasResult && (
          <pre className="text-muted-foreground" style={{
            margin: '4px 0 0',
            padding: 6,
            fontSize: 11,
            overflow: 'auto',
            maxHeight: 160,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            borderRadius: 4,
            backgroundColor: 'var(--surface-2, #F1F5F9)',
            border: '1px solid var(--border, #E2E8F0)',
            color: status === 'error' ? 'var(--error, #F43F5E)' : undefined,
          }}>
            {typeof block.result === 'string' ? block.result : JSON.stringify(block.result, null, 2)}
          </pre>
        )}
      </div>
    </li>
  );
}
