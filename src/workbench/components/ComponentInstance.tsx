/**
 * ComponentInstance - 组件实例渲染组件
 *
 * 负责渲染单个组件实例，处理加载状态和错误状态
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Tab } from '../types/tab';
import { createWorkbenchHost } from '../host';
import { cn } from '../../lib/utils';
import { AlertCircle, RotateCw } from 'lucide-react';

/**
 * ComponentInstance 组件属性
 */
export interface ComponentInstanceProps {
  /** Tab 数据 */
  tab: Tab;

  /** WorkbenchHost 实例 */
  host: ReturnType<typeof createWorkbenchHost> | null;

  /** 组件挂载完成回调 */
  onMounted?: () => void;

  /** 额外的 CSS 类名 */
  className?: string;
}

/**
 * 组件加载状态
 */
type ComponentLoadingState = 'loading' | 'ready' | 'error';

/**
 * ComponentInstance 组件
 */
export function ComponentInstance({
  tab,
  host,
  onMounted,
}: ComponentInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostElementRef = useRef<HTMLElement | null>(null);
  const [loadingState, setLoadingState] = useState<ComponentLoadingState>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [componentId, setComponentId] = useState<string | null>(null);

  // 清理之前的 hostElement
  const cleanupHostElement = useCallback(() => {
    if (hostElementRef.current && containerRef.current) {
      try {
        // 检查 hostElement 是否仍在 container 中
        if (containerRef.current.contains(hostElementRef.current)) {
          containerRef.current.removeChild(hostElementRef.current);
        }
      } catch (err) {
        console.warn('[ComponentInstance] Failed to remove hostElement:', err);
      }
      hostElementRef.current = null;
    }
  }, []);

  // 加载组件
  const loadComponent = useCallback(async () => {
    console.log('[ComponentInstance] loadComponent called', {
      hasHost: !!host,
      componentName: tab.componentName,
      tabId: tab.id
    });

    if (!host || !tab.componentName) {
      console.error('[ComponentInstance] Missing host or componentName', { host, tab });
      setLoadingState('error');
      setError(new Error('Missing host or component name'));
      return;
    }

    // 清理之前的 hostElement
    cleanupHostElement();

    setLoadingState('loading');
    setError(null);

    try {
      console.log('[ComponentInstance] Calling loadComponentByName', tab.componentName);
      // 通过组件名称加载
      const result = await host.loadComponentByName(tab.componentName, tab.params);
      console.log('[ComponentInstance] loadComponentByName result', result);

      setComponentId(result.componentId);

      // 将 hostElement 插入到容器中
      if (containerRef.current && result.hostElement) {
        // 打印容器尺寸
        console.log('[ComponentInstance] Container dimensions:', {
          offsetWidth: containerRef.current.offsetWidth,
          offsetHeight: containerRef.current.offsetHeight,
          clientWidth: containerRef.current.clientWidth,
          clientHeight: containerRef.current.clientHeight,
          scrollHeight: containerRef.current.scrollHeight,
          style: containerRef.current.style.cssText,
          classList: Array.from(containerRef.current.classList)
        });

        // 设置 hostElement 样式确保可见
        result.hostElement.style.width = '100%';
        result.hostElement.style.height = '100%';
        result.hostElement.style.display = 'block';

        hostElementRef.current = result.hostElement;
        containerRef.current.appendChild(result.hostElement);
        console.log('[ComponentInstance] hostElement appended');

        // 打印插入后的尺寸
        setTimeout(() => {
          console.log('[ComponentInstance] After append - container:', {
            offsetWidth: containerRef.current?.offsetWidth,
            offsetHeight: containerRef.current?.offsetHeight,
          }, 'hostElement:', {
            offsetWidth: result.hostElement.offsetWidth,
            offsetHeight: result.hostElement.offsetHeight,
          });
        }, 100);
      } else {
        console.error('[ComponentInstance] No hostElement or container', {
          hasContainer: !!containerRef.current,
          hasHostElement: !!result.hostElement
        });
        throw new Error('Container not available');
      }

      setLoadingState('ready');
      onMounted?.();
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      setLoadingState('error');
      console.error('[ComponentInstance] Failed to load component:', errorObj);
    }
  }, [host, tab, onMounted, cleanupHostElement]);

  // 卸载组件
  const unloadComponent = useCallback(async () => {
    if (!host || !componentId) {
      return;
    }

    try {
      await host.unloadComponent(componentId);
      setComponentId(null);
    } catch (err) {
      console.error('Failed to unload component:', err);
    }
  }, [host, componentId]);

  // 重新加载组件
  const reloadComponent = useCallback(() => {
    unloadComponent().then(() => {
      loadComponent();
    });
  }, [unloadComponent, loadComponent]);

  // 加载组件
  useEffect(() => {
    // 如果没有 host，等待 host 初始化
    if (!host) {
      return;
    }

    loadComponent();

    return () => {
      // 组件卸载时清理
      cleanupHostElement();
      if (componentId && host) {
        host.unloadComponent(componentId).catch(console.error);
      }
    };
    // 当 tab.id 或 host 变化时重新加载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id, host]);

  // 渲染组件内容
  return (
    <>
      {/* 容器 - 使用绝对定位确保填满父空间 */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-auto"
      />

      {/* 加载状态覆盖层 */}
      {loadingState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              正在加载 {tab.title}...
            </p>
          </div>
        </div>
      )}

      {/* 错误状态覆盖层 */}
      {loadingState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 z-10">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            加载失败
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4 max-w-md">
            {error?.message || '未知错误'}
          </p>
          <button
            onClick={reloadComponent}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'transition-colors duration-150'
            )}
          >
            <RotateCw className="w-4 h-4" />
            重试
          </button>
        </div>
      )}
    </>
  );
}
