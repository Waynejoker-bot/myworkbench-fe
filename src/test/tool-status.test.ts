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
  // 向后兼容：无 status 参数
  it('uses arguments.description when available', () => {
    expect(getToolDescription({ name: 'Bash', arguments: { description: '检查文件', command: 'ls' } }))
      .toBe('检查文件');
  });

  it('falls back to tool name for unknown tools (no status)', () => {
    expect(getToolDescription({ name: 'CustomTool', arguments: {} }))
      .toBe('使用了 CustomTool');
  });

  // 大小写兼容：后端工具名小写
  it('matches tool names case-insensitively (lowercase bash)', () => {
    const result = getToolDescription({ name: 'bash', arguments: { command: 'ls -la' } });
    expect(result).toBe('查看了文件目录');
  });

  it('matches tool names case-insensitively (uppercase Bash)', () => {
    const result = getToolDescription({ name: 'Bash', arguments: { command: 'ls -la' } });
    expect(result).toBe('查看了文件目录');
  });

  it('matches lowercase read tool', () => {
    expect(getToolDescription({ name: 'read', arguments: { path: '/opt/claude/report.md' } }))
      .toBe('读取了 report.md');
  });

  it('matches lowercase write tool', () => {
    expect(getToolDescription({ name: 'write', arguments: { path: '/tmp/output.txt' } }))
      .toBe('编辑了 output.txt');
  });

  // status 参数：running vs success
  it('returns running text with status=running', () => {
    expect(getToolDescription({ name: 'read', arguments: { path: '/opt/config.ts' } }, 'running'))
      .toBe('正在读取 config.ts...');
  });

  it('returns completed text with status=success', () => {
    expect(getToolDescription({ name: 'read', arguments: { path: '/opt/config.ts' } }, 'success'))
      .toBe('读取了 config.ts');
  });

  it('returns running bash description with ls command', () => {
    expect(getToolDescription({ name: 'bash', arguments: { command: 'ls -la /opt' } }, 'running'))
      .toBe('正在浏览文件目录...');
  });

  it('returns running bash description with grep command', () => {
    expect(getToolDescription({ name: 'bash', arguments: { command: 'grep -r "pattern" .' } }, 'running'))
      .toBe('正在搜索内容...');
  });

  it('returns running bash description with git command', () => {
    expect(getToolDescription({ name: 'bash', arguments: { command: 'git log --oneline' } }, 'running'))
      .toBe('正在查看代码变更...');
  });

  it('returns generic bash description for unknown commands', () => {
    expect(getToolDescription({ name: 'bash', arguments: { command: 'echo hello' } }, 'running'))
      .toBe('正在执行命令...');
  });

  // 特殊工具
  it('returns Chinese description for todowrite', () => {
    expect(getToolDescription({ name: 'TodoWrite', arguments: {} }, 'running'))
      .toBe('正在更新任务列表...');
  });

  it('returns Chinese description for glob', () => {
    expect(getToolDescription({ name: 'glob', arguments: {} }, 'success'))
      .toBe('搜索了文件');
  });

  it('returns Chinese description for send_message', () => {
    expect(getToolDescription({ name: 'send_message', arguments: {} }, 'success'))
      .toBe('发送了消息');
  });

  // description 字段 + status
  it('appends ... to description when running', () => {
    expect(getToolDescription({ name: 'bash', arguments: { description: '检查文件' } }, 'running'))
      .toBe('检查文件...');
  });

  it('does not double-append ... when description already ends with ...', () => {
    expect(getToolDescription({ name: 'bash', arguments: { description: '正在处理...' } }, 'running'))
      .toBe('正在处理...');
  });

  // 文件路径 basename 提取
  it('extracts basename from file path for read', () => {
    expect(getToolDescription({ name: 'read', arguments: { file_path: '/opt/claude/agent-service/main.py' } }))
      .toBe('读取了 main.py');
  });

  it('handles path without directory for read', () => {
    expect(getToolDescription({ name: 'read', arguments: { file_path: 'config.json' } }))
      .toBe('读取了 config.json');
  });
});
