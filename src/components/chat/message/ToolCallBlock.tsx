/**
 * Tool Call Block Component — Simplified
 *
 * Shows a single natural language description line.
 * Detail (JSON params/result) is hidden behind a click.
 */

import { useState } from 'react';
import type { ToolCallBlock } from '@/types/content-block';
import { ContentType } from '@/types/content-block';
import { getToolDescription } from '@/utils/tool-status';

interface ToolCallBlockProps {
  block: ToolCallBlock;
  isUserMessage?: boolean;
}

export function ToolCallBlockComponent({ block }: ToolCallBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const rawStatus = block.status || 'running';
  const status = (['running', 'success', 'error'].includes(rawStatus) ? rawStatus : 'running') as 'running' | 'success' | 'error';
  const description = getToolDescription({
    name: block.toolName,
    arguments: block.parameters || {},
    result: block.result,
  }, status);

  const hasDetail = block.result !== undefined || (block.parameters && Object.keys(block.parameters).length > 0);

  return (
    <div className="my-1" style={{ fontSize: 12 }}>
      {/* One-line description */}
      <div
        onClick={() => hasDetail && setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: hasDetail ? 'pointer' : 'default',
          padding: '2px 0',
        }}
      >
        {/* Status dot */}
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            flexShrink: 0,
            backgroundColor: status === 'error' ? 'var(--error, #F43F5E)' :
                           status === 'running' ? 'var(--warning, #F59E0B)' :
                           'var(--success, #10B981)',
            opacity: 0.7,
            animation: status === 'running' ? 'pulse 1.4s ease-in-out infinite' : undefined,
          }}
        />
        <span className="text-muted-foreground">{description}</span>
        {hasDetail && (
          <span className="text-muted-foreground" style={{ fontSize: 10, opacity: 0.5 }}>
            {isExpanded ? '▾' : '▸'}
          </span>
        )}
      </div>

      {/* Hidden detail */}
      {isExpanded && hasDetail && (
        <div style={{ marginTop: 4, marginLeft: 12 }}>
          {block.parameters && Object.keys(block.parameters).length > 0 && (
            <pre className="text-muted-foreground" style={{
              margin: '0 0 4px',
              padding: 6,
              fontSize: 11,
              overflow: 'auto',
              maxHeight: 160,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              borderRadius: 4,
              backgroundColor: 'var(--surface-2, #F1F5F9)',
              border: '1px solid var(--border, #E2E8F0)',
            }}>
              {JSON.stringify(block.parameters, null, 2)}
            </pre>
          )}
          {block.result !== undefined && (
            <pre className="text-muted-foreground" style={{
              margin: 0,
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
      )}
    </div>
  );
}

/**
 * Safe wrapper component with error boundary
 */
export function SafeToolCallBlock({ block }: ToolCallBlockProps) {
  try {
    if (!block || typeof block !== 'object') {
      throw new Error('Invalid block: not an object');
    }
    if (block.type !== ContentType.TOOL_CALL) {
      throw new Error(`Invalid block type: ${block.type}`);
    }
    return <ToolCallBlockComponent block={block} />;
  } catch (error) {
    console.error('[SafeToolCallBlock] Error rendering tool call block:', error);
    return (
      <div className="my-1 text-xs text-muted-foreground" style={{ padding: '2px 0' }}>
        工具调用显示异常
      </div>
    );
  }
}

export default SafeToolCallBlock;
