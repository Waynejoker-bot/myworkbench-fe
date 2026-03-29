/**
 * White-box tests for thinking chain display
 *
 * Tests real data patterns from liu-jianming-secretary agent.
 * Verifies: no duplicate thinking, correct grouping, proper dedup across rounds.
 */
import { describe, it, expect } from 'vitest';
import { MessageAggregator } from '@/utils/message-aggregator';
import { parsePayloadToBlocks } from '@/utils/message-converters';
import { ContentType } from '@/types/content-block';
import type { RawMessage } from '@/types/message-station';

// Helper to create raw messages simulating streaming chunks
function makeRawMsg(overrides: Partial<RawMessage>): RawMessage {
  return {
    id: 1,
    session_id: 's-test',
    round_id: 'r-test',
    message_id: 'm-test',
    source: 'liu-jianming-secretary',
    target: 'user-zc',
    seq: 1,
    status: 3,
    context: null,
    payload: '',
    timestamp: Date.now(),
    delivery_status: 'DELIVERED',
    ack_status: null,
    error_code: null,
    error_message: null,
    created_at: Date.now(),
    update_time: Date.now(),
    ...overrides,
  } as RawMessage;
}

// Helper to create a payload string like the backend sends
function makePayload(items: Array<{ itemType: string; text?: string; role?: string; toolItem?: any }>): string {
  return JSON.stringify({ type: 'agent_response', data: items });
}

describe('Thinking chain - real data patterns', () => {
  describe('parsePayloadToBlocks', () => {
    it('single thinking + tools + response produces correct block types', () => {
      const payload = makePayload([
        { itemType: 'text', text: '好的，我来查看。', role: 'thinking' },
        { itemType: 'tool', toolItem: { name: 'Read', arguments: { file_path: '/test.md' }, result: 'content' } },
        { itemType: 'tool', toolItem: { name: 'Bash', arguments: { command: 'ls' }, result: 'files' } },
        { itemType: 'text', text: '以下是结果：\n\n## 报告', role: 'response' },
      ]);
      const blocks = parsePayloadToBlocks(payload);

      const types = blocks.map(b => b.type);
      expect(types).toContain(ContentType.THINKING);
      expect(types).toContain(ContentType.TOOL_CALL);
      // Last text should be markdown (response), not thinking
      const lastBlock = blocks[blocks.length - 1];
      expect(lastBlock!.type).toBe(ContentType.MARKDOWN);
    });

    it('multiple thinking texts between tools are all preserved', () => {
      const payload = makePayload([
        { itemType: 'text', text: '先查看用户资料。' },
        { itemType: 'tool', toolItem: { name: 'Read', arguments: { file_path: '/user.md' }, result: 'ok' } },
        { itemType: 'text', text: '再查看日报。' },
        { itemType: 'tool', toolItem: { name: 'Read', arguments: { file_path: '/briefing.md' }, result: 'ok' } },
        { itemType: 'text', text: '最终结论如下。' },
      ]);
      const blocks = parsePayloadToBlocks(payload);
      const thinkingBlocks = blocks.filter(b => b.type === ContentType.THINKING);
      // First two text items are before last tool, so should be thinking
      expect(thinkingBlocks.length).toBe(2);
    });
  });

  describe('MessageAggregator.mergeAllPayloads - streaming dedup', () => {
    it('does NOT duplicate thinking when later payload resends same text', () => {
      // Simulates: payload1 has [thinking, tool1], payload2 has [thinking, tool1, tool2]
      const msg1 = makeRawMsg({
        seq: 1, status: 2,
        payload: makePayload([
          { itemType: 'text', text: '好的，我来查看杨文星最近的工作状态。', role: 'thinking' },
          { itemType: 'tool', toolItem: { name: 'Bash', arguments: { command: 'ls workspace/' }, result: null } },
        ]),
      });
      const msg2 = makeRawMsg({
        seq: 2, status: 2,
        payload: makePayload([
          { itemType: 'text', text: '好的，我来查看杨文星最近的工作状态。', role: 'thinking' },
          { itemType: 'tool', toolItem: { name: 'Bash', arguments: { command: 'ls workspace/' }, result: 'file1\nfile2' } },
          { itemType: 'tool', toolItem: { name: 'Read', arguments: { file_path: '/data.md' }, result: null } },
        ]),
      });

      const merged = MessageAggregator.mergeAllPayloads([msg1, msg2]);
      const thinkingBlocks = merged.filter(b => b.type === ContentType.THINKING);

      // Should have exactly 1 thinking block, NOT 2
      expect(thinkingBlocks.length).toBe(1);
      expect((thinkingBlocks[0] as any).content).toBe('好的，我来查看杨文星最近的工作状态。');
    });

    it('does NOT duplicate thinking when expanded version arrives', () => {
      // payload1: thinking short version
      // payload2: thinking expanded (includes short + more text)
      const msg1 = makeRawMsg({
        seq: 1, status: 2,
        payload: makePayload([
          { itemType: 'text', text: '好的，我来查看。', role: 'thinking' },
          { itemType: 'tool', toolItem: { name: 'Bash', arguments: { command: 'ls' }, result: 'ok' } },
        ]),
      });
      const msg2 = makeRawMsg({
        seq: 2, status: 3,
        payload: makePayload([
          { itemType: 'text', text: '好的，我来查看。首先读取最新会话报告。', role: 'thinking' },
          { itemType: 'tool', toolItem: { name: 'Bash', arguments: { command: 'ls' }, result: 'ok' } },
          { itemType: 'tool', toolItem: { name: 'Read', arguments: { file_path: '/report.md' }, result: 'report' } },
          { itemType: 'text', text: '以下是结果。' },
        ]),
      });

      const merged = MessageAggregator.mergeAllPayloads([msg1, msg2]);
      const thinkingBlocks = merged.filter(b => b.type === ContentType.THINKING);

      // Should have exactly 1 thinking block with the EXPANDED version
      expect(thinkingBlocks.length).toBe(1);
      expect((thinkingBlocks[0] as any).content).toContain('首先读取最新会话报告');
    });

    it('preserves DIFFERENT thinking texts across rounds', () => {
      // Round 1: thinking A + tools
      // Round 2: thinking B + tools + response
      const msg = makeRawMsg({
        seq: 1, status: 3,
        payload: makePayload([
          { itemType: 'text', text: '先看用户资料。', role: 'thinking' },
          { itemType: 'tool', toolItem: { name: 'Read', arguments: { file_path: '/user.md' }, result: 'ok' } },
          { itemType: 'text', text: '再看日报数据。', role: 'thinking' },
          { itemType: 'tool', toolItem: { name: 'Read', arguments: { file_path: '/briefing.md' }, result: 'ok' } },
          { itemType: 'text', text: '最终报告如下。' },
        ]),
      });

      const merged = MessageAggregator.mergeAllPayloads([msg]);
      const thinkingBlocks = merged.filter(b => b.type === ContentType.THINKING);

      // Two DIFFERENT thinking texts should both be preserved
      expect(thinkingBlocks.length).toBe(2);
    });

    it('real pattern: 3 streaming chunks with accumulating tools', () => {
      // Simulates the exact pattern from liu-jianming-secretary
      // Chunk 1: thinking + 5 tools
      // Chunk 2: same thinking + 5 tools + 5 more tools
      // Chunk 3: same thinking + 10 tools + new thinking + final answer
      const thinking1 = '好的，我来查看杨文星最近的工作状态。首先读取他的最新会话报告。';
      const thinking2 = '已看到杨文星最近 6 次客户拜访的完整记录，以下是他的工作状态总结：';

      // Use unique tool_use_id so mergeAllPayloads can dedup by id
      const tools5 = Array.from({ length: 5 }, (_, i) => ({
        itemType: 'tool' as const,
        toolItem: { name: 'Read', arguments: { file_path: `/file${i}.md` }, result: `content${i}`, tool_use_id: `tool-${i}` },
      }));
      const tools10 = Array.from({ length: 10 }, (_, i) => ({
        itemType: 'tool' as const,
        toolItem: { name: 'Read', arguments: { file_path: `/file${i}.md` }, result: `content${i}`, tool_use_id: `tool-${i}` },
      }));

      const chunk1 = makeRawMsg({
        seq: 1, status: 2,
        payload: makePayload([
          { itemType: 'text', text: thinking1, role: 'thinking' },
          ...tools5,
        ]),
      });
      const chunk2 = makeRawMsg({
        seq: 2, status: 2,
        payload: makePayload([
          { itemType: 'text', text: thinking1, role: 'thinking' },
          ...tools10,
        ]),
      });
      const chunk3 = makeRawMsg({
        seq: 3, status: 3,
        payload: makePayload([
          ...tools10,
          { itemType: 'text', text: thinking2 },
        ]),
      });

      const merged = MessageAggregator.mergeAllPayloads([chunk1, chunk2, chunk3]);

      const thinkingBlocks = merged.filter(b => b.type === ContentType.THINKING);
      const toolBlocks = merged.filter(b => b.type === ContentType.TOOL_CALL);

      // thinking1 should appear only ONCE (not 2x from chunk1+chunk2)
      const thinking1Blocks = thinkingBlocks.filter(b => (b as any).content === thinking1);
      expect(thinking1Blocks.length).toBe(1);

      // Tools should be deduplicated to 10 (not 5+10+10=25)
      expect(toolBlocks.length).toBe(10);
    });
  });

  describe('Cross-type dedup (THINKING vs MARKDOWN)', () => {
    it('deduplicates when same text appears as both thinking and markdown', () => {
      // Chunk 1: text classified as thinking (before tools)
      // Chunk 2: same text now classified as markdown (after tools in final payload)
      const text = '看到多个会话目录，让我查看最新、最相关的会话数据。';
      const msg1 = makeRawMsg({
        seq: 1, status: 2,
        payload: makePayload([
          { itemType: 'text', text, role: 'thinking' },
          { itemType: 'tool', toolItem: { name: 'Bash', arguments: { command: 'ls sessions/' }, result: null } },
        ]),
      });
      const msg2 = makeRawMsg({
        seq: 2, status: 3,
        payload: makePayload([
          { itemType: 'tool', toolItem: { name: 'Bash', arguments: { command: 'ls sessions/' }, result: 'session1\nsession2' } },
          { itemType: 'text', text },  // now classified as markdown (after last tool)
        ]),
      });

      const merged = MessageAggregator.mergeAllPayloads([msg1, msg2]);
      // Should only have 1 text block, not 2
      const textBlocks = merged.filter(b =>
        b.type === ContentType.THINKING || b.type === ContentType.MARKDOWN || b.type === ContentType.TEXT
      );
      const matchingBlocks = textBlocks.filter(b => ((b as any).content || '').includes('看到多个会话目录'));
      expect(matchingBlocks.length).toBe(1);
    });

    it('deduplicates when markdown has backtick formatting but thinking does not', () => {
      const thinkingText = '让我读取 analysis.json 和 report.md，获取综合信息。';
      const markdownText = '让我读取 `analysis.json` 和 `report.md`，获取综合信息。';

      const msg1 = makeRawMsg({
        seq: 1, status: 2,
        payload: makePayload([
          { itemType: 'text', text: thinkingText, role: 'thinking' },
          { itemType: 'tool', toolItem: { name: 'Read', arguments: { file_path: '/a.json' }, result: null } },
        ]),
      });
      const msg2 = makeRawMsg({
        seq: 2, status: 3,
        payload: makePayload([
          { itemType: 'tool', toolItem: { name: 'Read', arguments: { file_path: '/a.json' }, result: '{}' } },
          { itemType: 'text', text: markdownText },
        ]),
      });

      const merged = MessageAggregator.mergeAllPayloads([msg1, msg2]);
      const textBlocks = merged.filter(b =>
        b.type === ContentType.THINKING || b.type === ContentType.MARKDOWN || b.type === ContentType.TEXT
      );
      const matchingBlocks = textBlocks.filter(b => ((b as any).content || '').includes('获取综合信息'));
      expect(matchingBlocks.length).toBe(1);
    });
  });

  describe('MessageAggregator.aggregateGroup - full pipeline', () => {
    it('produces clean UIMessage with no duplicate thinking', () => {
      const thinking = '好的，我来查看。';
      const msgs = [
        makeRawMsg({
          seq: 1, status: 2,
          payload: makePayload([
            { itemType: 'text', text: thinking, role: 'thinking' },
            { itemType: 'tool', toolItem: { name: 'Bash', arguments: { command: 'ls' }, result: null } },
          ]),
        }),
        makeRawMsg({
          seq: 2, status: 3,
          payload: makePayload([
            { itemType: 'text', text: thinking, role: 'thinking' },
            { itemType: 'tool', toolItem: { name: 'Bash', arguments: { command: 'ls' }, result: 'ok' } },
            { itemType: 'text', text: '最终结果。' },
          ]),
        }),
      ];

      const uiMsg = MessageAggregator.aggregateGroup(msgs);
      const thinkingBlocks = uiMsg.contentBlocks.filter(b => b.type === ContentType.THINKING);

      expect(thinkingBlocks.length).toBe(1);
    });
  });
});
