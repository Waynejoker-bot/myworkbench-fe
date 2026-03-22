import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolCallTimeline } from '@/components/chat/message/ToolCallTimeline';
import { ContentType } from '@/types/content-block';
import type { ToolCallBlock } from '@/types/content-block';

function makeToolBlock(overrides: Partial<ToolCallBlock> = {}): ToolCallBlock {
  return {
    type: ContentType.TOOL_CALL,
    id: `tool-${Math.random()}`,
    toolName: 'Bash',
    parameters: { command: 'ls -la', description: '列出文件' },
    status: 'success',
    result: 'file1.txt\nfile2.txt',
    ...overrides,
  };
}

describe('ToolCallTimeline', () => {
  it('renders correct number of list items', () => {
    const blocks = [makeToolBlock(), makeToolBlock(), makeToolBlock()];
    render(<ToolCallTimeline blocks={blocks} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows green dot for success status', () => {
    const { container } = render(
      <ToolCallTimeline blocks={[makeToolBlock({ status: 'success' })]} />,
    );
    const dot = container.querySelector('[data-status="success"]');
    expect(dot).toBeTruthy();
    // jsdom converts hex to rgb in computed styles
    expect(dot?.getAttribute('style')).toContain('rgb(34, 197, 94)');
  });

  it('shows yellow dot for running status', () => {
    const { container } = render(
      <ToolCallTimeline
        blocks={[makeToolBlock({ status: 'running', result: undefined })]}
      />,
    );
    const dot = container.querySelector('[data-status="running"]');
    expect(dot).toBeTruthy();
    expect(dot?.getAttribute('style')).toContain('rgb(245, 158, 11)');
  });

  it('shows red dot for error status', () => {
    const { container } = render(
      <ToolCallTimeline
        blocks={[
          makeToolBlock({ status: 'error', result: 'Error: not found' }),
        ]}
      />,
    );
    const dot = container.querySelector('[data-status="error"]');
    expect(dot).toBeTruthy();
    expect(dot?.getAttribute('style')).toContain('rgb(239, 68, 68)');
  });

  it('displays tool description text', () => {
    render(
      <ToolCallTimeline
        blocks={[makeToolBlock({ parameters: { description: '检查文件' } })]}
      />,
    );
    expect(screen.getByText('检查文件')).toBeTruthy();
  });

  it('displays tool name as label', () => {
    render(<ToolCallTimeline blocks={[makeToolBlock({ toolName: 'Read' })]} />);
    expect(screen.getByText('Read')).toBeTruthy();
  });

  it('expands result on click', () => {
    render(
      <ToolCallTimeline
        blocks={[makeToolBlock({ result: 'detailed output here' })]}
      />,
    );
    // Result should not be visible initially
    expect(screen.queryByText('detailed output here')).toBeFalsy();
    // Click the description to expand
    fireEvent.click(screen.getByText('列出文件'));
    expect(screen.getByText('detailed output here')).toBeTruthy();
  });

  it('collapses result on second click', () => {
    render(
      <ToolCallTimeline
        blocks={[makeToolBlock({ result: 'detailed output here' })]}
      />,
    );
    fireEvent.click(screen.getByText('列出文件'));
    expect(screen.getByText('detailed output here')).toBeTruthy();
    fireEvent.click(screen.getByText('列出文件'));
    expect(screen.queryByText('detailed output here')).toBeFalsy();
  });

  it('running steps without result cannot expand', () => {
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
    fireEvent.click(screen.getByText('Running task'));
    // No expand indicator should be shown since result is undefined
    expect(screen.queryByText('▶')).toBeFalsy();
    expect(screen.queryByText('▼')).toBeFalsy();
  });

  it('renders multiple blocks with connecting lines between non-last items', () => {
    const blocks = [makeToolBlock(), makeToolBlock()];
    const { container } = render(<ToolCallTimeline blocks={blocks} />);
    // Non-last items should have a connecting line (div with width: 1)
    const lines = container.querySelectorAll('div[style*="width: 1"]');
    // First item has a line, second (last) does not
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });
});
