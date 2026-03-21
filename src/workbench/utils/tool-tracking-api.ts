/**
 * 工具执行状态跟踪 API
 *
 * 参考：docs/api/message-station-tool-tracking.md
 * 提供与后端 API 交互的函数
 */

import { ToolExecutionStatus } from './tool-execution';
import { API_ENDPOINTS, TOOL_EXECUTION_DEFAULTS, getErrorMessage } from './constants';

/**
 * API 响应基础类型
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * 工具执行状态响应
 */
interface ToolExecutionStatusResponse {
  call_id: string;
  tool_name: string;
  status: ToolExecutionStatus;
  parameters: Record<string, unknown>;
  result?: unknown;
  error?: string;
  start_time?: number;
  end_time?: number;
}

/**
 * 批量工具状态响应
 */
interface BatchToolStatusResponse {
  statuses: ToolExecutionStatusResponse[];
}

/**
 * 更新工具状态请求
 */
interface UpdateToolStatusRequest {
  call_id: string;
  status: ToolExecutionStatus;
  result?: unknown;
  error?: string;
}

/**
 * API 错误类
 */
export class ToolTrackingApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ToolTrackingApiError';
  }
}

/**
 * 获取工具执行状态
 *
 * @param callId - 工具调用 ID
 * @param baseUrl - API 基础 URL（可选）
 * @returns 工具执行状态
 */
export async function getToolExecutionStatus(
  callId: string,
  baseUrl?: string
): Promise<ToolExecutionStatusResponse> {
  const url = `${baseUrl || API_ENDPOINTS.toolTracking}${API_ENDPOINTS.getToolStatus(callId)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new ToolTrackingApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        'HTTP_ERROR',
        response.status
      );
    }

    const data: ApiResponse<ToolExecutionStatusResponse> = await response.json();

    if (!data.success || !data.data) {
      throw new ToolTrackingApiError(data.error || '获取工具状态失败', 'API_ERROR');
    }

    return data.data;
  } catch (error) {
    if (error instanceof ToolTrackingApiError) {
      throw error;
    }

    // 网络错误或其他错误
    throw new ToolTrackingApiError(
      getErrorMessage('NETWORK_ERROR'),
      'NETWORK_ERROR'
    );
  }
}

/**
 * 更新工具执行状态
 *
 * @param request - 更新请求
 * @param baseUrl - API 基础 URL（可选）
 * @returns 更新后的工具执行状态
 */
export async function updateToolExecutionStatus(
  request: UpdateToolStatusRequest,
  baseUrl?: string
): Promise<ToolExecutionStatusResponse> {
  const url = `${baseUrl || API_ENDPOINTS.toolTracking}${API_ENDPOINTS.updateToolStatus(request.call_id)}`;

  try {
    const response = await fetch(url, {
      method: 'PUT' as const,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new ToolTrackingApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        'HTTP_ERROR',
        response.status
      );
    }

    const data: ApiResponse<ToolExecutionStatusResponse> = await response.json();

    if (!data.success || !data.data) {
      throw new ToolTrackingApiError(data.error || '更新工具状态失败', 'API_ERROR');
    }

    return data.data;
  } catch (error) {
    if (error instanceof ToolTrackingApiError) {
      throw error;
    }

    throw new ToolTrackingApiError(
      getErrorMessage('NETWORK_ERROR'),
      'NETWORK_ERROR'
    );
  }
}

/**
 * 批量获取工具执行状态
 *
 * @param callIds - 工具调用 ID 列表
 * @param baseUrl - API 基础 URL（可选）
 * @returns 工具执行状态映射
 */
export async function batchGetToolExecutionStatus(
  callIds: string[],
  baseUrl?: string
): Promise<Map<string, ToolExecutionStatusResponse>> {
  const url = `${baseUrl || API_ENDPOINTS.toolTracking}${API_ENDPOINTS.batchGetToolStatus}`;

  try {
    const response = await fetch(url, {
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ call_ids: callIds }),
    });

    if (!response.ok) {
      throw new ToolTrackingApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        'HTTP_ERROR',
        response.status
      );
    }

    const data: ApiResponse<BatchToolStatusResponse> = await response.json();

    if (!data.success || !data.data) {
      throw new ToolTrackingApiError(data.error || '批量获取工具状态失败', 'API_ERROR');
    }

    // 转换为 Map
    const statusMap = new Map<string, ToolExecutionStatusResponse>();
    for (const status of data.data.statuses) {
      statusMap.set(status.call_id, status);
    }

    return statusMap;
  } catch (error) {
    if (error instanceof ToolTrackingApiError) {
      throw error;
    }

    throw new ToolTrackingApiError(
      getErrorMessage('NETWORK_ERROR'),
      'NETWORK_ERROR'
    );
  }
}

/**
 * 轮询工具执行状态（直到完成）
 *
 * @param callId - 工具调用 ID
 * @param options - 轮询选项
 * @returns 工具执行状态
 */
export async function pollToolExecutionStatus(
  callId: string,
  options?: {
    baseUrl?: string;
    interval?: number; // 轮询间隔（毫秒）
    timeout?: number; // 超时时间（毫秒）
    onProgress?: (status: ToolExecutionStatusResponse) => void; // 进度回调
  }
): Promise<ToolExecutionStatusResponse> {
  const {
    baseUrl,
    interval = 1000,
    timeout = TOOL_EXECUTION_DEFAULTS.timeout,
    onProgress,
  } = options || {};

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const status = await getToolExecutionStatus(callId, baseUrl);

      // 调用进度回调
      if (onProgress) {
        onProgress(status);
      }

      // 检查是否完成
      if (status.status === 'success' || status.status === 'error') {
        return status;
      }

      // 等待下次轮询
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      // 如果是网络错误，继续重试
      if (error instanceof ToolTrackingApiError && error.code === 'NETWORK_ERROR') {
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      // 其他错误直接抛出
      throw error;
    }
  }

  // 超时
  throw new ToolTrackingApiError(
    getErrorMessage('TOOL_EXECUTION_TIMEOUT'),
    'TIMEOUT_ERROR'
  );
}

/**
 * 批量轮询工具执行状态（直到全部完成）
 *
 * @param callIds - 工具调用 ID 列表
 * @param options - 轮询选项
 * @returns 工具执行状态映射
 */
export async function batchPollToolExecutionStatus(
  callIds: string[],
  options?: {
    baseUrl?: string;
    interval?: number; // 轮询间隔（毫秒）
    timeout?: number; // 超时时间（毫秒）
    onProgress?: (completed: number, total: number) => void; // 进度回调
  }
): Promise<Map<string, ToolExecutionStatusResponse>> {
  const {
    baseUrl,
    interval = 1000,
    timeout = TOOL_EXECUTION_DEFAULTS.timeout,
    onProgress,
  } = options || {};

  const startTime = Date.now();
  const completedIds = new Set<string>();

  while (Date.now() - startTime < timeout) {
    try {
      const statusMap = await batchGetToolExecutionStatus(callIds, baseUrl);

      // 检查已完成的工具
      let allCompleted = true;
      const entries = Array.from(statusMap.entries());
      for (const [callId, status] of entries) {
        if (status.status === 'success' || status.status === 'error') {
          completedIds.add(callId);
        } else {
          allCompleted = false;
        }
      }

      // 调用进度回调
      if (onProgress) {
        onProgress(completedIds.size, callIds.length);
      }

      // 检查是否全部完成
      if (allCompleted) {
        return statusMap;
      }

      // 等待下次轮询
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      // 如果是网络错误，继续重试
      if (error instanceof ToolTrackingApiError && error.code === 'NETWORK_ERROR') {
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      // 其他错误直接抛出
      throw error;
    }
  }

  // 超时
  throw new ToolTrackingApiError(
    getErrorMessage('TOOL_EXECUTION_TIMEOUT'),
    'TIMEOUT_ERROR'
  );
}

/**
 * 将 API 响应转换为本地工具执行状态
 */
export function apiStatusToLocalState(apiResponse: ToolExecutionStatusResponse) {
  return {
    callId: apiResponse.call_id,
    toolName: apiResponse.tool_name,
    status: apiResponse.status,
    parameters: apiResponse.parameters,
    result: apiResponse.result,
    error: apiResponse.error,
    startTime: apiResponse.start_time,
    endTime: apiResponse.end_time,
  };
}
