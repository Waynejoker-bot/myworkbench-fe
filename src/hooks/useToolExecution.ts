/**
 * 工具执行状态管理 Hook
 *
 * 参考：docs/api/message-station-tool-tracking.md
 * 提供 React 组件中管理工具执行状态的能力
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ToolExecutionState,
  ToolExecutionStatus,
  ToolExecutionManager,
} from '@/workbench/utils/tool-execution';
import { ToolCallBlock } from '@/workbench/types/content-block';

/**
 * Hook 返回值
 */
export interface UseToolExecutionReturn {
  /** 所有工具执行状态 */
  toolStates: Map<string, ToolExecutionState>;

  /** 注册工具调用 */
  registerToolCall: (callId: string, toolName: string, parameters: Record<string, unknown>) => ToolExecutionState;

  /** 更新工具状态 */
  updateToolState: (
    callId: string,
    updates: Partial<Omit<ToolExecutionState, 'isCompleted' | 'isRunning' | 'isFailed' | 'duration'>>
  ) => ToolExecutionState | undefined;

  /** 开始执行工具 */
  startToolExecution: (callId: string) => ToolExecutionState | undefined;

  /** 完成工具执行 */
  completeToolExecution: (callId: string, result: unknown) => ToolExecutionState | undefined;

  /** 失败工具执行 */
  failToolExecution: (callId: string, error: string) => ToolExecutionState | undefined;

  /** 获取工具状态 */
  getToolState: (callId: string) => ToolExecutionState | undefined;

  /** 获取进行中的工具 */
  getRunningTools: () => ToolExecutionState[];

  /** 清空所有状态 */
  clearAll: () => void;

  /** 从消息内容中解析并注册工具调用 */
  parseAndRegisterToolCalls: (content: string) => ToolCallBlock[];
}

/**
 * 工具执行状态管理 Hook
 *
 * @param initialStates - 初始状态（可选）
 * @returns 工具执行状态管理对象
 */
export function useToolExecution(initialStates?: Map<string, ToolExecutionState>): UseToolExecutionReturn {
  const managerRef = useRef(new ToolExecutionManager());

  // 初始化状态
  if (initialStates) {
    const entries = Array.from(initialStates.entries());
    for (const [callId, state] of entries) {
      managerRef.current.registerToolCall(callId, state.toolName, state.parameters);
      if (state.status !== 'pending') {
        managerRef.current.updateToolState(callId, {
          status: state.status,
          result: state.result,
          error: state.error,
        });
      }
    }
  }

  const [, forceUpdate] = useState({});

  // 触发重新渲染
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // 注册工具调用
  const registerToolCall = useCallback((callId: string, toolName: string, parameters: Record<string, unknown>) => {
    const state = managerRef.current.registerToolCall(callId, toolName, parameters);
    triggerUpdate();
    return state;
  }, [triggerUpdate]);

  // 更新工具状态
  const updateToolState = useCallback(
    (
      callId: string,
      updates: Partial<Omit<ToolExecutionState, 'isCompleted' | 'isRunning' | 'isFailed' | 'duration'>>
    ) => {
      const state = managerRef.current.updateToolState(callId, updates);
      if (state) {
        triggerUpdate();
      }
      return state;
    },
    [triggerUpdate]
  );

  // 开始执行工具
  const startToolExecution = useCallback(
    (callId: string) => {
      const state = managerRef.current.startToolExecution(callId);
      if (state) {
        triggerUpdate();
      }
      return state;
    },
    [triggerUpdate]
  );

  // 完成工具执行
  const completeToolExecution = useCallback(
    (callId: string, result: unknown) => {
      const state = managerRef.current.completeToolExecution(callId, result);
      if (state) {
        triggerUpdate();
      }
      return state;
    },
    [triggerUpdate]
  );

  // 失败工具执行
  const failToolExecution = useCallback(
    (callId: string, error: string) => {
      const state = managerRef.current.failToolExecution(callId, error);
      if (state) {
        triggerUpdate();
      }
      return state;
    },
    [triggerUpdate]
  );

  // 获取工具状态
  const getToolState = useCallback((callId: string) => {
    return managerRef.current.getToolState(callId);
  }, []);

  // 获取进行中的工具
  const getRunningTools = useCallback(() => {
    return managerRef.current.getRunningTools();
  }, [triggerUpdate]); // 依赖 triggerUpdate 以确保状态变化时重新获取

  // 清空所有状态
  const clearAll = useCallback(() => {
    managerRef.current.clearAll();
    triggerUpdate();
  }, [triggerUpdate]);

  // 从消息内容中解析并注册工具调用
  const parseAndRegisterToolCalls = useCallback(
    (content: string): ToolCallBlock[] => {
      // 动态导入 message-parser 以避免循环依赖
      import('@/workbench/utils/message-parser').then(({ parseToolCalls }) => {
        const parsedCalls = parseToolCalls(content);

        for (const parsed of parsedCalls) {
          // 注册到管理器
          registerToolCall(parsed.callId, parsed.toolName, parsed.parameters);
        }
      });

      // 返回空的 ToolCallBlock 数组（实际解析是异步的）
      return [];
    },
    [registerToolCall]
  );

  return {
    toolStates: (() => {
      const map = new Map<string, ToolExecutionState>();
      const states = managerRef.current.getAllToolStates();
      for (const state of states) {
        map.set(state.callId, state);
      }
      return map;
    })(),

    registerToolCall,
    updateToolState,
    startToolExecution,
    completeToolExecution,
    failToolExecution,
    getToolState,
    getRunningTools,
    clearAll,
    parseAndRegisterToolCalls,
  };
}

/**
 * 简化版 Hook - 仅跟踪单个工具调用
 *
 * @param _callId - 工具调用 ID（保留用于未来扩展）
 * @param _toolName - 工具名称（保留用于未来扩展）
 * @param _parameters - 工具参数（保留用于未来扩展）
 * @returns 工具执行状态和控制函数
 */
export function useSingleToolExecution(
  _callId: string,
  _toolName: string,
  _parameters: Record<string, unknown>
) {
  const [status, setStatus] = useState<ToolExecutionStatus>('pending');
  const [result, setResult] = useState<unknown>();
  const [error, setError] = useState<string>();
  const [startTime, setStartTime] = useState<number>();
  const [endTime, setEndTime] = useState<number>();

  const start = useCallback(() => {
    setStatus('running');
    setStartTime(Date.now());
  }, []);

  const complete = useCallback((resultValue: unknown) => {
    setStatus('success');
    setResult(resultValue);
    setEndTime(Date.now());
  }, []);

  const fail = useCallback((errorMessage: string) => {
    setStatus('error');
    setError(errorMessage);
    setEndTime(Date.now());
  }, []);

  const reset = useCallback(() => {
    setStatus('pending');
    setResult(undefined);
    setError(undefined);
    setStartTime(undefined);
    setEndTime(undefined);
  }, []);

  const duration = startTime && endTime ? endTime - startTime : undefined;

  return {
    status,
    result,
    error,
    startTime,
    endTime,
    duration,
    isPending: status === 'pending',
    isRunning: status === 'running',
    isCompleted: status === 'success' || status === 'error',
    isFailed: status === 'error',
    start,
    complete,
    fail,
    reset,
  };
}

/**
 * Hook - 监听消息中的工具调用并自动注册
 *
 * @param content - 消息内容
 * @returns 工具调用内容块列表
 */
export function useToolCallsFromContent(content: string): ToolCallBlock[] {
  const [toolCallBlocks, setToolCallBlocks] = useState<ToolCallBlock[]>([]);

  const { registerToolCall } = useToolExecution();

  useEffect(() => {
    if (!content) {
      setToolCallBlocks([]);
      return;
    }

    // 动态导入 message-parser
    import('@/workbench/utils/message-parser').then(({ parseToolCalls, parsedToToolCallBlock }) => {
      const parsedCalls = parseToolCalls(content);
      const blocks: ToolCallBlock[] = [];

      for (const parsed of parsedCalls) {
        // 注册到管理器
        registerToolCall(parsed.callId, parsed.toolName, parsed.parameters);

        // 创建内容块
        const block = parsedToToolCallBlock(parsed, 'pending');
        blocks.push(block);
      }

      setToolCallBlocks(blocks);
    });
  }, [content, registerToolCall]);

  return toolCallBlocks;
}
