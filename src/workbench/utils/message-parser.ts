/**
 * 消息解析工具
 *
 * 参考：docs/api/message-station-tool-tracking.md
 * 解析 Message Station 的消息内容，提取工具调用信息
 */

import { ToolCallBlock, ContentType, AnyContentBlock } from '../types/content-block';

/**
 * 工具调用信息（从 Message Station 消息中解析）
 */
export interface ParsedToolCall {
  /** 工具调用 ID */
  callId: string;

  /** 工具名称 */
  toolName: string;

  /** 工具参数 */
  parameters: Record<string, unknown>;

  /** 原始文本（用于调试） */
  rawText?: string;
}

/**
 * 解析消息内容中的工具调用
 *
 * Message Station 的工具调用格式：
 * ```xml
 * <tool_call>
 * <invoke name="tool_name">
 * <parameter name="param1">value1</parameter>
 * ...
 * </invoke>
 * </tool_call>
 * ```
 *
 * @param content - 消息内容（纯文本）
 * @returns 解析出的工具调用列表
 */
export function parseToolCalls(content: string): ParsedToolCall[] {
  const toolCalls: ParsedToolCall[] = [];

  // 正则表达式匹配工具调用
  const toolCallRegex = /<tool_call>\s*<invoke\s+name="([^"]+)">([\s\S]*?)<\/invoke>\s*<\/tool_call>/g;

  let match: RegExpExecArray | null;
  while ((match = toolCallRegex.exec(content)) !== null) {
    const toolName = match[1];
    const parametersBlock = match[2];

    // 解析参数
    const parameters: Record<string, unknown> = {};
    const paramRegex = /<parameter\s+name="([^"]+)">([\s\S]*?)<\/parameter>/g;

    let paramMatch: RegExpExecArray | null;
    while ((paramMatch = paramRegex.exec(parametersBlock ?? '')) !== null) {
      const paramName = paramMatch[1];
      if (!paramName) continue;

      const paramValue = paramMatch[2]?.trim();
      if (paramValue === undefined) continue;

      // 尝试解析为 JSON
      try {
        parameters[paramName] = JSON.parse(paramValue);
      } catch {
        // 如果不是 JSON，使用原始字符串
        parameters[paramName] = paramValue;
      }
    }

    // 生成调用 ID（基于位置和内容）
    const callId = `tool_${toolName}_${match.index ?? 0}_${Date.now()}`;

    toolCalls.push({
      callId,
      toolName: toolName ?? '',
      parameters,
      rawText: match[0] ?? '',
    });
  }

  return toolCalls;
}

/**
 * 解析消息内容中的工具输出
 *
 * Message Station 的工具输出格式：
 * ```xml
 * <tool_output>
 * <result call_id="xxx">
 * <output>...</output>
 * </result>
 * </tool_output>
 * ```
 *
 * @param content - 消息内容（纯文本）
 * @returns 解析出的工具输出映射
 */
export function parseToolOutputs(content: string): Map<string, { output: string; status: 'success' | 'error'; error?: string }> {
  const outputs = new Map();

  // 正则表达式匹配工具输出
  const outputRegex = /<tool_output>\s*<result\s+call_id="([^"]+)">([\s\S]*?)<\/result>\s*<\/tool_output>/g;

  let match: RegExpExecArray | null;
  while ((match = outputRegex.exec(content)) !== null) {
    const callId = match[1];
    const resultBlock = match[2];

    if (!resultBlock) continue;

    // 提取输出内容
    const outputMatch = resultBlock.match(/<output>([\s\S]*?)<\/output>/);
    const output = outputMatch?.[1]?.trim() ?? '';

    // 检查是否有错误
    const errorMatch = resultBlock.match(/<error>([\s\S]*?)<\/error>/);
    const hasError = !!errorMatch;
    const error = errorMatch?.[1]?.trim();

    outputs.set(callId, {
      output,
      status: hasError ? 'error' : 'success',
      error,
    });
  }

  return outputs;
}

/**
 * 将工具调用转换为 ToolCallBlock
 *
 * @param parsed - 解析出的工具调用
 * @param status - 工具执行状态
 * @returns ToolCallBlock 内容块
 */
export function parsedToToolCallBlock(
  parsed: ParsedToolCall,
  status: 'pending' | 'running' | 'success' | 'error' = 'pending'
): ToolCallBlock {
  return {
    type: ContentType.TOOL_CALL,
    id: parsed.callId,
    toolName: parsed.toolName,
    parameters: parsed.parameters,
    status,
  };
}

/**
 * 从消息内容中提取工具调用并转换为内容块列表
 *
 * @param content - 消息内容（纯文本）
 * @param existingBlocks - 现有的内容块列表（用于保留非工具调用内容）
 * @returns 更新后的内容块列表
 */
export function extractToolCallsToBlocks(
  content: string,
  existingBlocks: AnyContentBlock[] = []
): AnyContentBlock[] {
  const toolCalls = parseToolCalls(content);

  // 如果没有工具调用，返回原内容块
  if (toolCalls.length === 0) {
    return existingBlocks;
  }

  // 创建工具调用内容块
  const toolCallBlocks: ToolCallBlock[] = toolCalls.map(parsed =>
    parsedToToolCallBlock(parsed, 'pending')
  );

  // 合并内容块
  return [...existingBlocks, ...toolCallBlocks];
}

/**
 * 从消息内容中提取工具输出并更新对应工具调用块的状态
 *
 * @param content - 消息内容（纯文本）
 * @param existingBlocks - 现有的内容块列表
 * @returns 更新后的内容块列表
 */
export function updateToolCallStatusesFromOutput(
  content: string,
  existingBlocks: AnyContentBlock[]
): AnyContentBlock[] {
  const outputs = parseToolOutputs(content);

  if (outputs.size === 0) {
    return existingBlocks;
  }

  // 更新工具调用块的状态
  return existingBlocks.map(block => {
    if (block.type === ContentType.TOOL_CALL && block.id) {
      const output = outputs.get(block.id);
      if (output) {
        return {
          ...block,
          status: output.status,
          result: output.output,
          error: output.error,
        };
      }
    }
    return block;
  });
}

/**
 * 清理消息内容中的工具调用和输出标记（可选）
 *
 * @param content - 原始消息内容
 * @returns 清理后的内容
 */
export function cleanToolTags(content: string): string {
  return content
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
    .replace(/<tool_output>[\s\S]*?<\/tool_output>/g, '')
    .trim();
}

/**
 * 检查消息内容是否包含工具调用
 *
 * @param content - 消息内容
 * @returns 是否包含工具调用
 */
export function hasToolCalls(content: string): boolean {
  return /<tool_call>/i.test(content);
}

/**
 * 检查消息内容是否包含工具输出
 *
 * @param content - 消息内容
 * @returns 是否包含工具输出
 */
export function hasToolOutputs(content: string): boolean {
  return /<tool_output>/i.test(content);
}

/**
 * 从内容块数组中提取所有工具调用块
 *
 * @param blocks - 内容块数组
 * @returns 工具调用块数组
 */
export function extractToolCallBlocks(blocks: AnyContentBlock[]): ToolCallBlock[] {
  return blocks.filter((block): block is ToolCallBlock => block.type === ContentType.TOOL_CALL);
}

/**
 * 统计工具调用数量
 *
 * @param blocks - 内容块数组
 * @returns 工具调用数量
 */
export function countToolCalls(blocks: AnyContentBlock[]): number {
  return extractToolCallBlocks(blocks).length;
}

/**
 * 统计各状态的工具调用数量
 *
 * @param blocks - 内容块数组
 * @returns 各状态的工具调用数量
 */
export function countToolCallsByStatus(blocks: AnyContentBlock[]): {
  pending: number;
  running: number;
  success: number;
  error: number;
} {
  const toolCallBlocks = extractToolCallBlocks(blocks);

  return {
    pending: toolCallBlocks.filter(b => b.status === 'pending').length,
    running: toolCallBlocks.filter(b => b.status === 'running').length,
    success: toolCallBlocks.filter(b => b.status === 'success').length,
    error: toolCallBlocks.filter(b => b.status === 'error').length,
  };
}
