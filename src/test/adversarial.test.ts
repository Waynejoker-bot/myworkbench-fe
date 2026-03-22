import { describe, it, expect } from 'vitest';
import { inferToolStatus, getToolDescription } from '@/utils/tool-status';
import { renderMarkdown } from '@/utils/markdown';
import { parsePayloadToBlocks, parsePayload } from '@/utils/message-converters';
import { aggregateChannelStatus, identifyActiveTasks } from '@/hooks/useDashboard';
import { channelToAgent } from '@/api/agent';

describe('Adversarial: Malformed tool data from backend', () => {
  it('inferToolStatus handles result as a number', () => {
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: 42 })).toBe('success');
  });

  it('inferToolStatus handles result as an object', () => {
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: { error: true } })).toBe('success');
  });

  it('inferToolStatus handles result as boolean false', () => {
    // false is falsy but not null/undefined — should NOT be treated as "running"
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: false })).toBe('success');
  });

  it('inferToolStatus handles result as empty string', () => {
    // Empty string is falsy — but it IS a result, not "still running"
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: '' })).toBe('success');
  });

  it('inferToolStatus handles result as 0', () => {
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: 0 })).toBe('success');
  });

  it('getToolDescription handles arguments as undefined', () => {
    // Backend sends tool with no arguments at all
    const result = getToolDescription({ name: 'Bash', arguments: undefined as any });
    expect(result).toBe('Bash'); // Should fallback, not crash
  });

  it('getToolDescription handles arguments as null', () => {
    const result = getToolDescription({ name: 'Bash', arguments: null as any });
    expect(result).toBe('Bash');
  });

  it('getToolDescription handles empty name', () => {
    const result = getToolDescription({ name: '', arguments: {} });
    expect(result).toBe(''); // Or some fallback
  });

  it('getToolDescription handles description as number', () => {
    // Type confusion from backend
    const result = getToolDescription({ name: 'Bash', arguments: { description: 123 as any } });
    expect(typeof result).toBe('string');
  });

  it('getToolDescription handles Bash with undefined command', () => {
    const result = getToolDescription({ name: 'Bash', arguments: { command: undefined } });
    expect(typeof result).toBe('string');
    expect(result).not.toContain('undefined');
  });
});

describe('Adversarial: Malformed Channel data', () => {
  it('channelToAgent handles missing agent_name', () => {
    const channel = { channel_id: 'test', status: 'SESSION_IDLE', batch_size: 1, created_at: 0, updated_at: 0 };
    const agent = channelToAgent(channel as any);
    expect(agent.name).toBe('test'); // Should fallback to channel_id
  });

  it('channelToAgent handles empty string agent_name', () => {
    const channel = { channel_id: 'test', status: 'SESSION_IDLE', agent_name: '', batch_size: 1, created_at: 0, updated_at: 0 };
    const agent = channelToAgent(channel as any);
    expect(agent.name).toBe('test'); // Empty string should fallback to channel_id
  });

  it('channelToAgent handles null status', () => {
    const channel = { channel_id: 'test', status: null, agent_name: 'Test', batch_size: 1, created_at: 0, updated_at: 0 };
    const agent = channelToAgent(channel as any);
    expect(agent.enabled).toBe(true); // null !== "OFFLINE"
  });

  it('aggregateChannelStatus handles channels with null status', () => {
    const channels = [{ channel_id: 'a', status: null }];
    const result = aggregateChannelStatus(channels as any);
    expect(result.idle + result.working + result.offline).toBe(1); // Should count, not crash
  });

  it('identifyActiveTasks handles undefined current_session_id', () => {
    const channels = [{ channel_id: 'a', status: 'SESSION_BUSY', current_session_id: undefined }];
    const result = identifyActiveTasks(channels as any);
    expect(result).toHaveLength(0); // undefined is falsy, should be filtered out
  });

  it('identifyActiveTasks handles empty string current_session_id', () => {
    const channels = [{ channel_id: 'a', status: 'SESSION_BUSY', current_session_id: '' }];
    const result = identifyActiveTasks(channels as any);
    expect(result).toHaveLength(0); // Empty string is falsy
  });
});

describe('Adversarial: Markdown XSS attacks', () => {
  it('blocks script in code block language field', () => {
    const md = '```<script>alert(1)</script>\nconsole.log("hi")\n```';
    const html = renderMarkdown(md);
    expect(html).not.toContain('<script>');
  });

  it('blocks img onerror XSS', () => {
    // Markdown with space in URL won't parse as img tag, so onerror appears as plain text.
    // The real danger is if it becomes an HTML attribute. Verify no <img with onerror.
    const md = '![x](x onerror=alert(1))';
    const html = renderMarkdown(md);
    expect(html).not.toMatch(/<img[^>]+onerror/);
  });

  it('blocks data URI in links', () => {
    const md = '[click](data:text/html,<script>alert(1)</script>)';
    const html = renderMarkdown(md);
    expect(html).not.toContain('data:text/html');
  });

  it('blocks iframe injection', () => {
    const md = '<iframe src="https://evil.com"></iframe>';
    const html = renderMarkdown(md);
    expect(html).not.toContain('<iframe');
  });

  it('blocks event handlers in HTML', () => {
    const md = '<div onmouseover="alert(1)">hover me</div>';
    const html = renderMarkdown(md);
    expect(html).not.toContain('onmouseover');
  });

  it('handles markdown with null bytes', () => {
    const md = 'Hello\x00World';
    expect(() => renderMarkdown(md)).not.toThrow();
  });

  it('handles extremely long single line (10KB)', () => {
    const md = 'A'.repeat(10000);
    expect(() => renderMarkdown(md)).not.toThrow();
  });

  it('handles deeply nested lists (10 levels)', () => {
    let md = '';
    for (let i = 0; i < 10; i++) {
      md += '  '.repeat(i) + '- Level ' + i + '\n';
    }
    expect(() => renderMarkdown(md)).not.toThrow();
  });

  it('handles code block with no closing fence', () => {
    const md = '```js\nconst x = 1;\n// no closing fence';
    expect(() => renderMarkdown(md)).not.toThrow();
  });
});

describe('Adversarial: Payload parsing edge cases', () => {
  it('parsePayload handles double-encoded JSON', () => {
    // Backend accidentally double-encodes
    const payload = JSON.stringify(JSON.stringify({ type: 'text', data: [{ itemType: 'text', text: 'hello' }] }));
    const result = parsePayload(payload);
    expect(typeof result).toBe('string');
    // Should not crash, may return raw string
  });

  it('parsePayload handles empty data array', () => {
    const payload = JSON.stringify({ type: 'text', data: [] });
    expect(parsePayload(payload)).toBe('');
  });

  it('parsePayload handles null data', () => {
    const payload = JSON.stringify({ type: 'text', data: null });
    expect(() => parsePayload(payload)).not.toThrow();
  });

  it('parsePayload handles missing type field', () => {
    const payload = JSON.stringify({ data: [{ itemType: 'text', text: 'hello' }] });
    const result = parsePayload(payload);
    expect(typeof result).toBe('string');
  });

  it('parsePayloadToBlocks handles tool with null toolItem', () => {
    const payload = JSON.stringify({ type: 'tool', data: [{ itemType: 'tool', toolItem: null }] });
    const blocks = parsePayloadToBlocks(payload);
    // Should not crash, should produce some fallback
    expect(blocks.length).toBeGreaterThanOrEqual(0);
  });

  it('parsePayloadToBlocks handles tool with missing name', () => {
    const payload = JSON.stringify({ type: 'tool', data: [{ itemType: 'tool', toolItem: { arguments: {}, result: 'ok' } }] });
    const blocks = parsePayloadToBlocks(payload);
    expect(() => JSON.stringify(blocks)).not.toThrow();
  });

  it('parsePayloadToBlocks handles extremely large payload (50KB text)', () => {
    const bigText = 'x'.repeat(50000);
    const payload = JSON.stringify({ type: 'text', data: [{ itemType: 'text', text: bigText }] });
    expect(() => parsePayloadToBlocks(payload)).not.toThrow();
    const blocks = parsePayloadToBlocks(payload);
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('parsePayload handles binary-looking content', () => {
    const payload = '\x89PNG\r\n\x1a\n';
    expect(() => parsePayload(payload)).not.toThrow();
  });

  it('parsePayloadToBlocks handles unknown itemType gracefully', () => {
    const payload = JSON.stringify({ type: 'text', data: [{ itemType: 'alien', foo: 'bar' }] });
    expect(() => parsePayloadToBlocks(payload)).not.toThrow();
  });
});

describe('Adversarial: Dashboard with extreme data', () => {
  it('aggregateChannelStatus with 1000 channels', () => {
    const channels = Array.from({ length: 1000 }, (_, i) => ({
      channel_id: `agent-${i}`,
      status: i % 3 === 0 ? 'SESSION_IDLE' : i % 3 === 1 ? 'SESSION_BUSY' : 'OFFLINE',
    }));
    const result = aggregateChannelStatus(channels as any);
    expect(result.idle + result.working + result.offline).toBe(1000);
  });

  it('identifyActiveTasks with all channels having sessions', () => {
    const channels = Array.from({ length: 100 }, (_, i) => ({
      channel_id: `agent-${i}`,
      status: 'SESSION_BUSY',
      current_session_id: `sess-${i}`,
    }));
    const result = identifyActiveTasks(channels as any);
    expect(result).toHaveLength(5); // Must cap at 5
  });

  it('aggregateChannelStatus with empty status string', () => {
    const channels = [{ channel_id: 'a', status: '' }];
    const result = aggregateChannelStatus(channels as any);
    expect(result.offline).toBe(1); // Empty string is not IDLE or BUSY
  });
});

describe('Adversarial: ToolCallTimeline edge cases', () => {
  // These test the data layer, not React rendering
  it('getToolDescription with 500-char file path', () => {
    const longPath = '/opt/' + 'a'.repeat(500) + '/file.ts';
    const result = getToolDescription({ name: 'Read', arguments: { file_path: longPath } });
    expect(result).toBe(longPath); // Should not truncate file paths
  });

  it('getToolDescription with Bash command containing newlines', () => {
    const cmd = 'echo "line1"\necho "line2"\necho "line3"';
    const result = getToolDescription({ name: 'Bash', arguments: { command: cmd } });
    expect(result.length).toBeLessThanOrEqual(63);
  });

  it('inferToolStatus with result containing only whitespace', () => {
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: '   \n\t  ' })).toBe('success');
  });

  it('inferToolStatus with result "ErrorHandler initialized"', () => {
    // "Error" appears but not at the start — should be success
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: 'ErrorHandler initialized successfully' })).toBe('success');
  });

  it('inferToolStatus with multiline result where Error is on line 2', () => {
    const result = 'Output line 1\nError: something failed\nLine 3';
    // Error is not at position 0 of the full string
    const status = inferToolStatus({ name: 'Bash', arguments: {}, result });
    // The regex uses .test() which scans the whole string, and the regex has ^Error:
    // But ^ with no /m flag only matches start of string, so this should be 'success'
    // WAIT: the regex is /^Error:|^error:|Exit code [1-9]|Exception|Traceback/
    // Without /m flag, ^Error: only matches at position 0 of the string
    // But "Exception" and "Traceback" have no ^ so they match anywhere
    // "Error:" on line 2 won't match ^Error: without /m
    // However, there's no "Exception" or "Traceback" in this string
    // So this should be 'success'
    expect(status).toBe('success');
  });
});
