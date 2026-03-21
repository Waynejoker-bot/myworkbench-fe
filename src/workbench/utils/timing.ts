/**
 * Timing Utilities
 * 防抖、节流、延迟等时间相关工具
 */

/**
 * 防抖抖动
 * 在指定时间内多次调用只执行最后一次
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流
 * 在指定时间内最多执行一次
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      fn(...args);
      lastCall = now;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        fn(...args);
        lastCall = Date.now();
        timeoutId = null;
      }, delay - timeSinceLastCall);
    }
  };
}

/**
 * 延迟
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 超时执行
 * 如果 promise 在指定时间内未完成，则抛出错误
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage || `Operation timed out after ${ms}ms`)),
        ms
      )
    )
  ]);
}

/**
 * 重试执行
 * 在失败时重试指定次数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay: retryDelay = 1000,
    backoff = 2,
    shouldRetry = () => true
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }

      const waitTime = retryDelay * Math.pow(backoff, attempt - 1);
      await delay(waitTime);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * 创建定时器
 * 每隔指定时间执行一次
 */
export function interval(
  fn: () => void,
  ms: number
): { stop: () => void; start: () => void } {
  let timeoutId: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timeoutId) {
      clearInterval(timeoutId);
      timeoutId = null;
    }
  };

  const start = () => {
    stop();
    timeoutId = setInterval(fn, ms);
  };

  return { stop, start };
}

/**
 * 测量函数执行时间
 */
export async function measureTime<T>(
  fn: () => Promise<T> | T
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  return { result, duration };
}

/**
 * 性能标记（用于浏览器性能分析）
 */
export const perfMark = {
  /**
   * 开始性能标记
   */
  start(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
    }
  },

  /**
   * 结束性能标记
   */
  end(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }
  },

  /**
   * 获取性能测量结果
   */
  getMeasure(name: string): PerformanceEntry | null {
    if (typeof performance !== 'undefined' && performance.getEntriesByName) {
      const entries = performance.getEntriesByName(name, 'measure');
      return entries[entries.length - 1] || null;
    }
    return null;
  }
};
