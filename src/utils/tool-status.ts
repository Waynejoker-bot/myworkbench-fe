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

/**
 * 提取文件路径的basename
 */
function extractBasename(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
}

/**
 * 根据 Bash command 内容推断自然语言描述
 */
function describeBashCommand(cmd: string, status: 'running' | 'success' | 'error'): string {
  const c = cmd.toLowerCase();
  if (c.startsWith('ls') || c.startsWith('find') || c.includes('ls '))
    return status === 'running' ? '正在浏览文件目录...' : '查看了文件目录';
  if (c.startsWith('grep') || c.startsWith('rg') || c.includes('grep ') || c.includes('search'))
    return status === 'running' ? '正在搜索内容...' : '搜索了相关内容';
  if (c.startsWith('cat') || c.startsWith('head') || c.startsWith('tail'))
    return status === 'running' ? '正在读取文件...' : '读取了文件';
  if (c.startsWith('git'))
    return status === 'running' ? '正在查看代码变更...' : '查看了代码变更';
  if (c.startsWith('npm') || c.startsWith('yarn') || c.startsWith('pnpm') || c.startsWith('bun'))
    return status === 'running' ? '正在管理项目依赖...' : '管理了项目依赖';
  if (c.startsWith('curl') || c.startsWith('wget'))
    return status === 'running' ? '正在请求网络资源...' : '请求了网络资源';
  if (c.startsWith('python') || c.startsWith('node') || c.startsWith('tsx'))
    return status === 'running' ? '正在执行脚本...' : '执行了脚本';
  if (c.startsWith('ssh') || c.startsWith('scp') || c.startsWith('rsync'))
    return status === 'running' ? '正在连接远程服务器...' : '连接了远程服务器';
  return status === 'running' ? '正在执行命令...' : '执行了命令';
}

/**
 * 生成工具的自然语言描述
 *
 * @param tool - 工具调用信息
 * @param status - 可选，工具执行状态。传入后生成进行时/完成时文案
 */
export function getToolDescription(tool: ToolItem, status?: 'running' | 'success' | 'error'): string {
  const args = tool.arguments;
  if (!args || typeof args !== 'object') return tool.name || '';

  // 优先使用 arguments.description 字段（后端或 LLM 提供的自然语言描述）
  const desc = args.description;
  if (typeof desc === 'string' && desc.trim()) {
    const text = desc.trim();
    if (!status || status === 'success') return text;
    if (status === 'running') return text + (text.endsWith('...') ? '' : '...');
    return text; // error
  }

  // 无 status 时保持原有行为（向后兼容）
  const s = status || 'success';
  const name = (tool.name || '').toLowerCase();

  switch (name) {
    case 'bash': {
      const cmd = String(args.command || '');
      if (!cmd) return s === 'running' ? '正在执行命令...' : '执行了命令';
      return describeBashCommand(cmd, s);
    }
    case 'read': {
      const path = String(args.file_path || args.path || '');
      const basename = path ? extractBasename(path) : '';
      if (!basename) return s === 'running' ? '正在读取文件...' : '读取了文件';
      return s === 'running' ? `正在读取 ${basename}...` : `读取了 ${basename}`;
    }
    case 'write':
    case 'str_replace': {
      const path = String(args.file_path || args.path || '');
      const basename = path ? extractBasename(path) : '';
      if (!basename) return s === 'running' ? '正在编辑文件...' : '编辑了文件';
      return s === 'running' ? `正在编辑 ${basename}...` : `编辑了 ${basename}`;
    }
    case 'glob': return s === 'running' ? '正在搜索文件...' : '搜索了文件';
    case 'grep': return s === 'running' ? '正在搜索内容...' : '搜索了内容';
    case 'todowrite': return s === 'running' ? '正在更新任务列表...' : '更新了任务列表';
    case 'websearch': return s === 'running' ? '正在搜索网络...' : '搜索了网络';
    case 'webfetch': return s === 'running' ? '正在获取网页内容...' : '获取了网页内容';
    case 'calculator': return s === 'running' ? '正在计算...' : '完成了计算';
    case 'datetime': return s === 'running' ? '正在获取时间...' : '获取了时间';
    case 'read_word': return s === 'running' ? '正在读取文档...' : '读取了文档';
    case 'sendmessage':
    case 'send_message': return s === 'running' ? '正在发送消息...' : '发送了消息';
    case 'generate_image': return s === 'running' ? '正在生成图片...' : '生成了图片';
    case 'list_agents': return s === 'running' ? '正在查看 Agent 列表...' : '查看了 Agent 列表';
    case 'view_agent': return s === 'running' ? '正在查看 Agent 详情...' : '查看了 Agent 详情';
    case 'create_agent': return s === 'running' ? '正在创建 Agent...' : '创建了 Agent';
    case 'publish_agent': return s === 'running' ? '正在发布 Agent...' : '发布了 Agent';
    case 'equip_tools': return s === 'running' ? '正在配置工具...' : '配置了工具';
    case 'list_tools': return s === 'running' ? '正在查看工具列表...' : '查看了工具列表';
    case 'listcontacts':
    case 'list_contacts': return s === 'running' ? '正在查看联系人...' : '查看了联系人';
    default: {
      const displayName = (tool.name || '').trim();
      if (!displayName) return s === 'running' ? '正在处理...' : '处理完成';
      return s === 'running' ? `正在使用 ${displayName}...` : `使用了 ${displayName}`;
    }
  }
}
