/**
 * 工具执行状态管理
 *
 * 参考：docs/api/message-station-tool-tracking.md
 * 实现工具执行状态的跟踪和管理
 */

import { ToolCallBlock, ContentType } from '../types/content-block';

/**
 * 工具执行状态
 */
export type ToolExecutionStatus = 'pending' | 'running' | 'success' | 'error';

/**
 * 工具执行状态记录
 */
export interface ToolExecutionState {
  /** 工具调用 ID */
  callId: string;

  /** 工具名称 */
  toolName: string;

  /** 当前状态 */
  status: ToolExecutionStatus;

  /** 工具参数 */
  parameters: Record<string, unknown>;

  /** 执行结果 */
  result?: unknown;

  /** 错误信息 */
  error?: string;

  /** 开始时间 */
  startTime?: number;

  /** 结束时间 */
  endTime?: number;

  /** 是否已完成 */
  get isCompleted(): boolean;

  /** 是否正在运行 */
  get isRunning(): boolean;

  /** 是否失败 */
  get isFailed(): boolean;

  /** 执行时长（毫秒） */
  get duration(): number | undefined;
}

/**
 * 创建工具执行状态记录
 */
export function createToolExecutionState(
  callId: string,
  toolName: string,
  parameters: Record<string, unknown>,
  status: ToolExecutionStatus = 'pending'
): ToolExecutionState {
  const state = {
    callId,
    toolName,
    parameters,
    status,
    startTime: status === 'running' ? Date.now() : undefined,
    get isCompleted(): boolean {
      return this.status === 'success' || this.status === 'error';
    },
    get isRunning(): boolean {
      return this.status === 'running';
    },
    get isFailed(): boolean {
      return this.status === 'error';
    },
    get duration(): number | undefined {
      if (this.startTime && this.endTime) {
        return this.endTime - this.startTime;
      }
      return undefined;
    },
  } as ToolExecutionState;

  return state;
}

/**
 * 更新工具执行状态
 */
export function updateToolExecutionState(
  state: ToolExecutionState,
  updates: Partial<Omit<ToolExecutionState, 'isCompleted' | 'isRunning' | 'isFailed' | 'duration'>>
): ToolExecutionState {
  const newState = { ...state, ...updates };

  // 自动管理开始和结束时间
  if (updates.status === 'running' && !state.startTime) {
    newState.startTime = Date.now();
  }
  if (updates.status === 'success' || updates.status === 'error') {
    if (!state.endTime) {
      newState.endTime = Date.now();
    }
  }

  return newState;
}

/**
 * 工具执行状态管理器
 */
export class ToolExecutionManager {
  private states: Map<string, ToolExecutionState> = new Map();

  /**
   * 注册工具调用
   */
  registerToolCall(
    callId: string,
    toolName: string,
    parameters: Record<string, unknown>
  ): ToolExecutionState {
    const state = createToolExecutionState(callId, toolName, parameters, 'pending');
    this.states.set(callId, state);
    return state;
  }

  /**
   * 更新工具状态
   */
  updateToolState(
    callId: string,
    updates: Partial<Omit<ToolExecutionState, 'isCompleted' | 'isRunning' | 'isFailed' | 'duration'>>
  ): ToolExecutionState | undefined {
    const state = this.states.get(callId);
    if (!state) {
      console.warn(`Tool call ${callId} not found`);
      return undefined;
    }

    const newState = updateToolExecutionState(state, updates);
    this.states.set(callId, newState);
    return newState;
  }

  /**
   * 开始执行工具
   */
  startToolExecution(callId: string): ToolExecutionState | undefined {
    return this.updateToolState(callId, { status: 'running' });
  }

  /**
   * 标记工具执行成功
   */
  completeToolExecution(callId: string, result: unknown): ToolExecutionState | undefined {
    return this.updateToolState(callId, { status: 'success', result });
  }

  /**
   * 标记工具执行失败
   */
  failToolExecution(callId: string, error: string): ToolExecutionState | undefined {
    return this.updateToolState(callId, { status: 'error', error });
  }

  /**
   * 获取工具状态
   */
  getToolState(callId: string): ToolExecutionState | undefined {
    return this.states.get(callId);
  }

  /**
   * 获取所有工具状态
   */
  getAllToolStates(): ToolExecutionState[] {
    return Array.from(this.states.values());
  }

  /**
   * 获取进行中的工具调用
   */
  getRunningTools(): ToolExecutionState[] {
    return this.getAllToolStates().filter(state => state.isRunning);
  }

  /**
   * 清理已完成的工具状态（可选）
   */
  clearCompleted(): void {
    const entries = Array.from(this.states.entries());
    for (const [callId, state] of entries) {
      if (state.isCompleted) {
        this.states.delete(callId);
      }
    }
  }

  /**
   * 清空所有状态
   */
  clearAll(): void {
    this.states.clear();
  }
}

/**
 * 默认的工具执行管理器实例
 */
export const defaultToolExecutionManager = new ToolExecutionManager();

/**
 * 创建 ToolCallBlock 内容块
 */
export function createToolCallBlock(
  callId: string,
  toolName: string,
  parameters: Record<string, unknown>,
  status: ToolExecutionStatus = 'pending'
): ToolCallBlock {
  return {
    type: ContentType.TOOL_CALL,
    id: callId,
    toolName,
    parameters,
    status,
  };
}

/**
 * 更新 ToolCallBlock 状态
 */
export function updateToolCallBlockStatus(
  block: ToolCallBlock,
  status: ToolExecutionStatus,
  result?: unknown,
  error?: string
): ToolCallBlock {
  return {
    ...block,
    status,
    result,
    error,
  };
}
