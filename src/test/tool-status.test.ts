import { describe, it, expect } from 'vitest';
import { inferToolStatus, getToolDescription } from '@/utils/tool-status';

describe('inferToolStatus', () => {
  it('returns running when result is undefined', () => {
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: undefined })).toBe('running');
  });

  it('returns running when result is null', () => {
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: null })).toBe('running');
  });

  it('returns success for normal result', () => {
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: 'file.txt' })).toBe('success');
  });

  it('returns error for "Error:" prefix', () => {
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: 'Error: file not found' })).toBe('error');
  });

  it('returns error for exit code patterns', () => {
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: 'Exit code 1\ncommand failed' })).toBe('error');
  });

  it('returns error for Exception pattern', () => {
    expect(inferToolStatus({ name: 'Read', arguments: {}, result: 'Exception: permission denied' })).toBe('error');
  });

  it('returns error for Traceback pattern', () => {
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: 'Traceback (most recent call):\n...' })).toBe('error');
  });

  it('returns success when result contains "Error" in non-prefix position', () => {
    expect(inferToolStatus({ name: 'Bash', arguments: {}, result: 'Fixed the Error handling code' })).toBe('success');
  });
});

describe('getToolDescription', () => {
  it('uses arguments.description when available', () => {
    expect(getToolDescription({ name: 'Bash', arguments: { description: '检查文件', command: 'ls' } }))
      .toBe('检查文件');
  });

  it('falls back to command preview for Bash (truncated at 60 chars)', () => {
    const longCmd = 'ls -lh /opt/claude/business/yangwenxing-sales-bp-review-2026-03-22.tar.gz';
    const result = getToolDescription({ name: 'Bash', arguments: { command: longCmd } });
    expect(result.length).toBeLessThanOrEqual(63); // 60 + "..."
    expect(result).toContain('ls -lh');
  });

  it('falls back to file_path for Read', () => {
    expect(getToolDescription({ name: 'Read', arguments: { file_path: '/opt/claude/report.md' } }))
      .toBe('/opt/claude/report.md');
  });

  it('falls back to file_path for Write', () => {
    expect(getToolDescription({ name: 'Write', arguments: { file_path: '/tmp/output.txt' } }))
      .toBe('/tmp/output.txt');
  });

  it('returns "更新任务列表" for TodoWrite', () => {
    expect(getToolDescription({ name: 'TodoWrite', arguments: {} })).toBe('更新任务列表');
  });

  it('falls back to tool name for unknown tools', () => {
    expect(getToolDescription({ name: 'CustomTool', arguments: {} })).toBe('CustomTool');
  });
});
