import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolCallTimeline } from '@/components/chat/message/ToolCallTimeline';
import { ContentType } from '@/types/content-block';
import type { ToolCallBlock } from '@/types/content-block';

function makeToolBlock(overrides: Partial<ToolCallBlock> = {}): ToolCallBlock {
  return {
    type: ContentType.TOOL_CALL,
    id: `tool-${Math.random()}`,
    toolName: 'bash',
    parameters: { command: 'ls -la', description: '列出文件' },
    status: 'success',
    result: 'file1.txt\nfile2.txt',
    ...overrides,
  };
}

/** Helper: expand the tool call section by clicking the toggle button */
function expandToolCalls() {
  const btn = screen.getByText(/展开工具调用/);
  fireEvent.click(btn);
}

describe('ToolCallTimeline', () => {
  it('is collapsed by default with toggle button', () => {
    render(<ToolCallTimeline blocks={[makeToolBlock()]} />);
    expect(screen.getByText(/展开工具调用/)).toBeTruthy();
    // Tool items should NOT be visible
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('shows tool count in toggle button', () => {
    const blocks = [makeToolBlock(), makeToolBlock(), makeToolBlock()];
    render(<ToolCallTimeline blocks={blocks} />);
    expect(screen.getByText('展开工具调用 (3)')).toBeTruthy();
  });

  it('renders correct number of list items after expanding', () => {
    const blocks = [makeToolBlock(), makeToolBlock(), makeToolBlock()];
    render(<ToolCallTimeline blocks={blocks} />);
    expandToolCalls();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('toggle button changes to "收起工具调用" when expanded', () => {
    render(<ToolCallTimeline blocks={[makeToolBlock()]} />);
    expandToolCalls();
    expect(screen.getByText('收起工具调用')).toBeTruthy();
  });

  it('collapses back when clicking "收起工具调用"', () => {
    render(<ToolCallTimeline blocks={[makeToolBlock()]} />);
    expandToolCalls();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(screen.getByText('收起工具调用'));
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('shows natural language description after expanding', () => {
    render(
      <ToolCallTimeline
        blocks={[makeToolBlock({ parameters: { description: '检查文件' } })]}
      />,
    );
    expandToolCalls();
    expect(screen.getByText('检查文件')).toBeTruthy();
  });

  it('shows Chinese description for bash ls command after expanding', () => {
    render(
      <ToolCallTimeline
        blocks={[makeToolBlock({ parameters: { command: 'ls -la' }, status: 'success' })]}
      />,
    );
    expandToolCalls();
    expect(screen.getByText('查看了文件目录')).toBeTruthy();
  });

  it('expands individual tool result on click after expanding timeline', () => {
    render(
      <ToolCallTimeline
        blocks={[makeToolBlock({ result: 'detailed output here', parameters: { description: '列出文件' } })]}
      />,
    );
    expandToolCalls();
    // Result should not be visible initially
    expect(screen.queryByText('detailed output here')).toBeFalsy();
    // Click the description to expand individual result
    fireEvent.click(screen.getByText('列出文件'));
    expect(screen.getByText('detailed output here')).toBeTruthy();
  });

  it('running steps without result cannot expand individual detail', () => {
    render(
      <ToolCallTimeline
        blocks={[
          makeToolBlock({
            status: 'running',
            result: undefined,
            parameters: { description: 'Running task' },
          }),
        ]}
      />,
    );
    expandToolCalls();
    fireEvent.click(screen.getByText(/Running task/));
    // No detail expand indicators
    expect(screen.queryByText('▸')).toBeFalsy();
    expect(screen.queryByText('▾')).toBeFalsy();
  });

  it('has aria-expanded attribute on toggle button', () => {
    render(<ToolCallTimeline blocks={[makeToolBlock()]} />);
    const btn = screen.getByText(/展开工具调用/).closest('button');
    expect(btn?.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn!);
    expect(btn?.getAttribute('aria-expanded')).toBe('true');
  });
});
