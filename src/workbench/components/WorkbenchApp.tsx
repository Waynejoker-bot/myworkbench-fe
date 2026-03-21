/**
 * WorkbenchApp - Workbench 主容器组件
 *
 * 集成 Tab 管理、组件列表视图和组件实例渲染
 * 提供完整的 Workbench 功能
 */

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useWorkbench } from '../core/tab-context';
import { TabBar } from './TabBar';
import { TabContent } from './TabContent';
import { ComponentListView } from './ComponentListView';
import { ComponentInstance } from './ComponentInstance';
import { cn } from '../../lib/utils';
import { createWorkbenchHost } from '../host';
import type { HostConfig, InputAPI, SessionAPI } from '../types/host';
import { uuid } from '../utils/uuid';

// Re-export types for external use
export type { InputAPI, SessionAPI };

/**
 * WorkbenchApp 组件属性
 */
export interface WorkbenchAppProps {
  /** Host 配置（不包含 messageAPI 和 sessionAPI） */
  hostConfig?: Partial<Omit<HostConfig, 'messageAPI' | 'sessionAPI'>>;

  /** 输入 API（用于组件控制聊天输入框） */
  inputAPI?: InputAPI;

  /** 会话 API（用于组件切换会话） */
  sessionAPI?: SessionAPI;

  /** 是否在组件加载时自动加载组件列表（默认：true） */
  autoLoadComponents?: boolean;

  /** 额外的 CSS 类名 */
  className?: string;

  /** TabBar 额外的 CSS 类名 */
  tabBarClassName?: string;

  /** 内容区域额外的 CSS 类名 */
  contentClassName?: string;

  /** 折叠/展开面板的回调 */
  onToggleCollapse?: () => void;

  /** 是否处于全屏模式 */
  isFullscreen?: boolean;

  /** 进入全屏模式的回调 */
  onEnterFullscreen?: () => void;

  /** 退出全屏模式的回调 */
  onExitFullscreen?: () => void;
}

/**
 * WorkbenchApp ref 接口
 * 允许外部组件调用 WorkbenchApp 的方法
 */
export interface WorkbenchAppRef {
  /** 打开一个新的标签页 */
  openTab: (componentName: string, params?: Record<string, unknown>) => string;
  /** 关闭指定的标签页 */
  closeTab: (tabId: string) => void;
  /** 切换到指定的标签页 */
  switchTab: (tabId: string) => void;
  /** 显示组件列表视图 */
  showListView: () => void;
}

/**
 * WorkbenchApp 组件
 */
export const WorkbenchApp = forwardRef<WorkbenchAppRef, WorkbenchAppProps>(function WorkbenchApp({
  hostConfig = {},
  inputAPI: externalInputAPI,
  sessionAPI: externalSessionAPI,
  autoLoadComponents = true,
  className,
  tabBarClassName,
  contentClassName,
  onToggleCollapse,
  isFullscreen = false,
  onEnterFullscreen,
  onExitFullscreen,
}, ref) {
  const {
    state,
    openTab,
    closeTab,
    switchTab,
    loadComponents,
    filterComponents,
    toggleFavorite,
    showListView,
  } = useWorkbench();

  const hostRef = useRef<ReturnType<typeof createWorkbenchHost> | null>(null);
  const mountedTabsRef = useRef<Set<string>>(new Set());

  // 暴露方法给外部 ref
  useImperativeHandle(ref, () => ({
    openTab,
    closeTab,
    switchTab,
    showListView,
  }), [openTab, closeTab, switchTab, showListView]);

  // 初始化 Host
  useEffect(() => {
    // 默认的空 inputAPI
    const defaultInputAPI = {
      append: () => {},
      replace: () => {},
      insert: () => {},
      clear: () => {},
      getValue: () => '',
      subscribe: () => () => {},
    };

    // 默认的空 sessionAPI
    const defaultSessionAPI = {
      getCurrent: () => null,
      switch: async () => {},
      create: async () => ({
        id: uuid(),
        title: 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
      list: () => [],
      subscribe: () => () => {},
    };

    const config: HostConfig = {
      messageAPI: {
        getAll: () => [],
        getById: () => undefined,
        send: async () => {},
        subscribe: () => () => {},
      },
      sessionAPI: externalSessionAPI || defaultSessionAPI,
      inputAPI: externalInputAPI || defaultInputAPI,
      uiAPI: {
        resize: () => {},
        close: () => {},
        focus: () => {},
        notify: () => {},
      },
      context: {
        sessionId: uuid(),
        metadata: {},
      },
      ...hostConfig,
    };

    const host = createWorkbenchHost(config);
    hostRef.current = host;

    // 初始化 Host
    host.init().catch((error) => {
      console.error('Failed to initialize WorkbenchHost:', error);
    });

    return () => {
      // 清理所有已挂载的组件
      mountedTabsRef.current.forEach((tabId) => {
        const tab = state.tabs.find((t) => t.id === tabId);
        if (tab?.componentName) {
          host.unloadComponent(tabId).catch(console.error);
        }
      });
      mountedTabsRef.current.clear();

      // 销毁 Host
      host.destroy().catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalInputAPI, externalSessionAPI]);

  // 加载组件列表
  useEffect(() => {
    if (!autoLoadComponents) {
      return;
    }

    const loadComponentList = async () => {
      try {
        // TODO: 从 API 加载组件列表
        // 暂时使用空数组，需要实现 API 调用
        await loadComponents();
      } catch (error) {
        console.error('Failed to load component list:', error);
      }
    };

    loadComponentList();
  }, [autoLoadComponents, loadComponents]);

  // 处理组件选择
  const handleComponentSelect = useCallback(
    (componentName: string) => {
      try {
        openTab(componentName, {});
      } catch (error) {
        console.error('Failed to open component:', error);
      }
    },
    [openTab]
  );

  // 处理添加标签页
  const handleAddTab = useCallback(() => {
    showListView();
  }, [showListView]);

  // 处理标签页选择
  const handleTabSelect = useCallback(
    (tabId: string) => {
      switchTab(tabId);
    },
    [switchTab]
  );

  // 处理标签页关闭
  const handleTabClose = useCallback(
    async (tabId: string) => {
      // 卸载组件
      if (hostRef.current) {
        try {
          await hostRef.current.unloadComponent(tabId);
        } catch (error) {
          console.error('Failed to unload component:', error);
        }
      }

      // 从已挂载集合中移除
      mountedTabsRef.current.delete(tabId);

      // 关闭标签页
      closeTab(tabId);
    },
    [closeTab]
  );

  // 渲染标签页内容
  // 使用 ref 来访问最新的 hostRef.current，避免依赖变化导致重新创建
  const renderTabContent = useCallback(
    (tab: any) => {
      return (
        <ComponentInstance
          key={tab.id}
          tab={tab}
          host={hostRef.current}
          onMounted={() => {
            mountedTabsRef.current.add(tab.id);
          }}
        />
      );
    },
    []  // 空依赖数组，确保函数不会重新创建
  );

  // 是否显示组件列表
  const showComponentList = state.mode === 'list' || state.tabs.length === 0;

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-gray-900', className)}>
      {/* 标签栏 */}
      <TabBar
        tabs={state.tabs}
        activeTabId={state.activeTabId}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onTabAdd={handleAddTab}
        className={tabBarClassName}
        onToggleCollapse={onToggleCollapse}
        isFullscreen={isFullscreen}
        onEnterFullscreen={onEnterFullscreen}
        onExitFullscreen={onExitFullscreen}
      />

      {/* 内容区域 */}
      <div className={cn('flex-1 overflow-hidden', contentClassName)}>
        {showComponentList ? (
          /* 组件列表视图 */
          <ComponentListView
            components={filterComponents()}
            onSelect={handleComponentSelect}
            recent={state.recentComponents}
            favorites={state.favoriteComponents}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          /* 标签页内容 */
          <TabContent
            tabs={state.tabs}
            activeTabId={state.activeTabId}
            renderTabContent={renderTabContent}
            keepInactiveMounted={false}
          />
        )}
      </div>
    </div>
  );
});

WorkbenchApp.displayName = 'WorkbenchApp';

/**
 * WorkbenchAppWrapper 组件
 * 包含 WorkbenchProvider 的完整组件
 */
import { WorkbenchProvider } from '../core/tab-context';

export interface WorkbenchAppWrapperProps extends WorkbenchAppProps {
  /** 是否从存储加载状态（默认：true） */
  loadFromStorage?: boolean;
}

export interface WorkbenchAppWrapperRef {
  /** 打开一个新的标签页 */
  openTab: (componentName: string, params?: Record<string, unknown>) => string;
  /** 关闭指定的标签页 */
  closeTab: (tabId: string) => void;
  /** 切换到指定的标签页 */
  switchTab: (tabId: string) => void;
  /** 显示组件列表视图 */
  showListView: () => void;
}

export const WorkbenchAppWrapper = forwardRef<WorkbenchAppWrapperRef, WorkbenchAppWrapperProps>(
  function WorkbenchAppWrapper({
    loadFromStorage = true,
    ...props
  }, ref) {
    return (
      <WorkbenchProvider loadFromStorage={loadFromStorage}>
        <WorkbenchApp ref={ref} {...props} />
      </WorkbenchProvider>
    );
  }
);

WorkbenchAppWrapper.displayName = 'WorkbenchAppWrapper';
