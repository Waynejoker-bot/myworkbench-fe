export interface ToolItem {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  tool_use_id?: string;
}

const ERROR_PATTERNS = /^Error:|^error:|Exit code [1-9]|Exception|Traceback/;

export function inferToolStatus(tool: ToolItem): 'running' | 'success' | 'error' {
  if (tool.result === undefined || tool.result === null) return 'running';
  const result = String(tool.result);
  if (ERROR_PATTERNS.test(result)) return 'error';
  return 'success';
}

export function getToolDescription(tool: ToolItem): string {
  const args = tool.arguments;
  if (!args || typeof args !== 'object') return tool.name || '';

  const desc = args.description;
  if (typeof desc === 'string' && desc.trim()) return desc.trim();

  switch (tool.name) {
    case 'Bash': {
      const cmd = String(args.command || '');
      return cmd.length > 60 ? cmd.slice(0, 60) + '...' : cmd || 'Bash';
    }
    case 'Read':
    case 'Write':
      return String(args.file_path || tool.name);
    case 'TodoWrite':
      return '更新任务列表';
    default:
      return tool.name;
  }
}
