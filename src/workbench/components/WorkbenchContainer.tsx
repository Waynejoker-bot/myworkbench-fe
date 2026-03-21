/**
 * WorkbenchContainer - React 容器组件
 * 使用 Shadow DOM 实现样式隔离，提供可调整大小的面板、加载状态显示
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCw, AlertCircle } from 'lucide-react';
import type { HostConfig } from '../types';
import { createWorkbenchHost } from '../host';
import { uuid } from '../utils/uuid';

export interface WorkbenchContainerProps {
  /** 组件清单 URL */
  componentUrl?: string;

  /** 容器宽度 */
  width?: number;

  /** 最小宽度 */
  minWidth?: number;

  /** 最大宽度 */
  maxWidth?: number;

  /** 是否可调整大小 */
  resizable?: boolean;

  /** 组件参数 */
  params?: Record<string, unknown>;

  /** Host 配置 */
  hostConfig?: Partial<Omit<HostConfig, 'messageAPI' | 'sessionAPI' | 'inputAPI'>>;

  /** 尺寸变化回调 */
  onResize?: (width: number) => void;

  /** 关闭回调 */
  onClose?: () => void;

  /** 组件加载完成回调 */
  onLoad?: (componentId: string) => void;

  /** 组件错误回调 */
  onError?: (error: Error) => void;
}

export function WorkbenchContainer({
  componentUrl,
  width = 560,
  minWidth = 280,
  maxWidth = 800,
  resizable = true,
  params = {},
  hostConfig = {},
  onResize,
  onClose,
  onLoad,
  onError
}: WorkbenchContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const componentContainerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<ReturnType<typeof createWorkbenchHost> | null>(null);
  const componentIdRef = useRef<string | null>(null);
  const paramsRef = useRef(params);

  // 状态
  const [currentWidth, setCurrentWidth] = useState(width);
  const [isResizing, setIsResizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 更新 paramsRef
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // 同步 width prop 变化到 currentWidth 状态
  useEffect(() => {
    setCurrentWidth(width);
  }, [width]);

  // 加载组件
  const loadComponent = useCallback(async () => {
    if (!componentUrl || !hostRef.current || !componentContainerRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsReady(false);

    // 清空之前的组件
    if (componentContainerRef.current) {
      componentContainerRef.current.innerHTML = '';
    }

    try {
      // loadComponent 现在返回 { componentId, hostElement }
      const result = await hostRef.current.loadComponent(componentUrl, paramsRef.current);
      componentIdRef.current = result.componentId;

      // 将 hostElement 插入到容器中
      if (componentContainerRef.current && result.hostElement) {
        componentContainerRef.current.appendChild(result.hostElement);
      }

      setIsReady(true);
      onLoad?.(result.componentId);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      onError?.(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [componentUrl]);

  // 初始化 Host
  useEffect(() => {
    const config: HostConfig = {
      messageAPI: {
        getAll: () => [],
        getById: () => undefined,
        send: async () => {},
        subscribe: () => () => {}
      },
      sessionAPI: {
        getCurrent: () => null,
        switch: async () => {},
        create: async () => ({
          id: uuid(),
          title: 'New Chat',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }),
        list: () => [],
        subscribe: () => () => {}
      },
      inputAPI: {
        append: () => {},
        replace: () => {},
        insert: () => {},
        clear: () => {},
        getValue: () => '',
        subscribe: () => () => {}
      },
      uiAPI: {
        resize: (w) => {
          const newWidth = Math.max(minWidth, Math.min(maxWidth, w));
          setCurrentWidth(newWidth);
          onResize?.(newWidth);
        },
        close: onClose || (() => {}),
        focus: () => {},
        notify: () => {}
      },
      context: {
        sessionId: uuid(),
        metadata: {}
      },
      ...hostConfig
    };

    const host = createWorkbenchHost(config);
    hostRef.current = host;
    host.init();

    return () => {
      host.destroy();
    };
    // 仅在组件挂载时初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听 componentUrl 变化
  useEffect(() => {
    if (componentUrl) {
      loadComponent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentUrl]);

  // 处理拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!resizable) return;
    setIsResizing(true);
    e.preventDefault();
  }, [resizable]);

  // 处理拖拽
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const newWidth = rect.right - e.clientX;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      setCurrentWidth(clampedWidth);
      onResize?.(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, onResize]);

  // 重新加载
  const handleReload = useCallback(() => {
    loadComponent();
  }, [loadComponent]);

  // 卸载组件（关闭时）
  useEffect(() => {
    return () => {
      if (componentIdRef.current && hostRef.current) {
        hostRef.current.unloadComponent(componentIdRef.current);
      }
    };
  }, []);

  // 渲染错误状态
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900"
        style={{ width: currentWidth }}
      >
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          加载失败
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
          {error.message}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleReload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            重试
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              关闭
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-white dark:bg-slate-900 flex flex-col"
      style={{ width: currentWidth }}
    >
      {/* 调整大小手柄 */}
      {resizable && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors group ${
            isResizing ? 'bg-blue-400 dark:bg-blue-600' : 'bg-transparent hover:bg-blue-300 dark:hover:bg-blue-700'
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full transition-colors ${
            isResizing
              ? 'bg-blue-500 dark:bg-blue-500'
              : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400 dark:group-hover:bg-slate-500'
          }`} />
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              正在加载组件...
            </p>
          </div>
        </div>
      )}

      {/* 头部 */}
      {isReady && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              组件已就绪
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleReload}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="重新加载"
            >
              <RotateCw className="w-4 h-4 text-slate-500" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="关闭"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 组件容器 - Shadow DOM host 将插入这里 */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={componentContainerRef}
          id="workbench-component-container"
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
