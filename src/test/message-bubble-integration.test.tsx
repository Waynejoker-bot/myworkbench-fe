import { describe, it, expect } from 'vitest';
import { ContentType } from '@/types/content-block';
import type { AnyContentBlock, ToolCallBlock, MarkdownBlock } from '@/types/content-block';

// Test the groupContentBlocks logic used to group consecutive tool calls
interface BlockGroup {
  type: 'tool_group' | 'single';
  blocks: AnyContentBlock[];
}

function groupContentBlocks(blocks: AnyContentBlock[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  let currentToolGroup: ToolCallBlock[] = [];

  for (const block of blocks) {
    if (block.type === ContentType.TOOL_CALL) {
      currentToolGroup.push(block as ToolCallBlock);
    } else {
      if (currentToolGroup.length > 0) {
        groups.push({ type: 'tool_group', blocks: [...currentToolGroup] });
        currentToolGroup = [];
      }
      groups.push({ type: 'single', blocks: [block] });
    }
  }

  if (currentToolGroup.length > 0) {
    groups.push({ type: 'tool_group', blocks: currentToolGroup });
  }

  return groups;
}

describe('groupContentBlocks', () => {
  it('groups consecutive tool calls into a single tool_group', () => {
    const blocks: AnyContentBlock[] = [
      { type: ContentType.TOOL_CALL, toolName: 'Bash', parameters: {}, status: 'success' } as ToolCallBlock,
      { type: ContentType.TOOL_CALL, toolName: 'Read', parameters: {}, status: 'success' } as ToolCallBlock,
      { type: ContentType.TOOL_CALL, toolName: 'Write', parameters: {}, status: 'success' } as ToolCallBlock,
    ];
    const groups = groupContentBlocks(blocks);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe('tool_group');
    expect(groups[0].blocks).toHaveLength(3);
  });

  it('separates markdown blocks from tool groups', () => {
    const blocks: AnyContentBlock[] = [
      { type: ContentType.MARKDOWN, content: 'Hello' } as MarkdownBlock,
      { type: ContentType.TOOL_CALL, toolName: 'Bash', parameters: {}, status: 'success' } as ToolCallBlock,
      { type: ContentType.TOOL_CALL, toolName: 'Read', parameters: {}, status: 'success' } as ToolCallBlock,
      { type: ContentType.MARKDOWN, content: 'Done' } as MarkdownBlock,
    ];
    const groups = groupContentBlocks(blocks);
    expect(groups).toHaveLength(3);
    expect(groups[0].type).toBe('single');
    expect(groups[1].type).toBe('tool_group');
    expect(groups[1].blocks).toHaveLength(2);
    expect(groups[2].type).toBe('single');
  });

  it('handles empty blocks array', () => {
    expect(groupContentBlocks([])).toHaveLength(0);
  });

  it('handles all markdown blocks (no grouping needed)', () => {
    const blocks: AnyContentBlock[] = [
      { type: ContentType.MARKDOWN, content: 'A' } as MarkdownBlock,
      { type: ContentType.MARKDOWN, content: 'B' } as MarkdownBlock,
    ];
    const groups = groupContentBlocks(blocks);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.type === 'single')).toBe(true);
  });

  it('handles alternating tool and text blocks', () => {
    const blocks: AnyContentBlock[] = [
      { type: ContentType.TOOL_CALL, toolName: 'Bash', parameters: {}, status: 'success' } as ToolCallBlock,
      { type: ContentType.MARKDOWN, content: 'Result' } as MarkdownBlock,
      { type: ContentType.TOOL_CALL, toolName: 'Read', parameters: {}, status: 'success' } as ToolCallBlock,
    ];
    const groups = groupContentBlocks(blocks);
    expect(groups).toHaveLength(3);
    expect(groups[0].type).toBe('tool_group');
    expect(groups[0].blocks).toHaveLength(1);
    expect(groups[1].type).toBe('single');
    expect(groups[2].type).toBe('tool_group');
    expect(groups[2].blocks).toHaveLength(1);
  });

  it('trailing tool calls form a group', () => {
    const blocks: AnyContentBlock[] = [
      { type: ContentType.MARKDOWN, content: 'Start' } as MarkdownBlock,
      { type: ContentType.TOOL_CALL, toolName: 'A', parameters: {}, status: 'running' } as ToolCallBlock,
      { type: ContentType.TOOL_CALL, toolName: 'B', parameters: {}, status: 'running' } as ToolCallBlock,
    ];
    const groups = groupContentBlocks(blocks);
    expect(groups).toHaveLength(2);
    expect(groups[1].type).toBe('tool_group');
    expect(groups[1].blocks).toHaveLength(2);
  });
});
