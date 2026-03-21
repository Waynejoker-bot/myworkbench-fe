/**
 * Workbench TabBar Component
 *
 * Displays a tab bar with all open tabs.
 * Supports tab switching, closing, and adding new tabs.
 */

import React, { useRef, useEffect } from 'react';
import { ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import type { Tab } from '../types/tab';
import { cn } from '../../lib/utils';

/**
 * TabBar component props
 */
export interface TabBarProps {
  /** All tabs */
  tabs: Tab[];

  /** Active tab ID */
  activeTabId: string | null;

  /** Callback when tab is selected */
  onTabSelect: (tabId: string) => void;

  /** Callback when tab is closed */
  onTabClose: (tabId: string) => void;

  /** Callback when add button is clicked */
  onTabAdd: () => void;

  /** Additional CSS class name */
  className?: string;

  /** Callback when collapse button is clicked */
  onToggleCollapse?: () => void;

  /** Whether in fullscreen mode */
  isFullscreen?: boolean;

  /** Callback when entering fullscreen mode */
  onEnterFullscreen?: () => void;

  /** Callback when exiting fullscreen mode */
  onExitFullscreen?: () => void;
}

/**
 * TabBar component
 */
export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabAdd,
  className,
  onToggleCollapse,
  isFullscreen = false,
  onEnterFullscreen,
  onExitFullscreen,
}: TabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const tab = activeTabRef.current;
      const container = scrollContainerRef.current;

      const containerRect = container.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();

      if (tabRect.left < containerRect.left) {
        container.scrollLeft -= containerRect.left - tabRect.left;
      } else if (tabRect.right > containerRect.right) {
        container.scrollLeft += tabRect.right - containerRect.right;
      }
    }
  }, [activeTabId]);

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  const handleTabSelect = (tabId: string) => {
    onTabSelect(tabId);
  };

  return (
    <div
      className={cn(
        'flex items-center bg-border border-b border-border/50 bg-gray-100 dark:bg-gray-800',
        'h-10 px-2 gap-1 overflow-x-auto',
        'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent',
        className
      )}
    >
      {/* Tab List */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1 flex-1 overflow-x-auto"
        style={{ maxWidth: `calc(100% - ${onToggleCollapse ? '80px' : '40px'})` }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => handleTabSelect(tab.id)}
              className={cn(
                'group flex items-center gap-2 px-3 h-8 min-w-0 max-w-[200px]',
                'rounded-t-lg border border-b-0 transition-all duration-150',
                'text-sm font-medium whitespace-nowrap overflow-hidden',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                isActive
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                  : 'bg-gray-200/50 dark:bg-gray-800/50 border-transparent text-gray-600 dark:text-gray-400'
              )}
              title={tab.title}
            >
              {/* Tab Icon */}
              {tab.icon && (
                <span className="flex-shrink-0 text-base" aria-hidden="true">
                  {tab.icon}
                </span>
              )}

              {/* Tab Title */}
              <span className="flex-1 truncate text-left">
                {tab.title}
              </span>

              {/* Tab Status Indicator */}
              {tab.status === 'loading' && (
                <span
                  className="flex-shrink-0 w-3 h-3"
                  aria-label="Loading"
                >
                  <svg className="animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </span>
              )}

              {tab.status === 'error' && (
                <span
                  className="flex-shrink-0 w-3 h-3 text-red-500"
                  aria-label="Error"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </span>
              )}

              {/* Close Button */}
              {tab.closable && !tab.pinned && (
                <button
                  onClick={(e) => handleTabClose(e, tab.id)}
                  className={cn(
                    'flex-shrink-0 p-0.5 rounded',
                    'opacity-0 group-hover:opacity-100',
                    'hover:bg-gray-300 dark:hover:bg-gray-600',
                    'transition-all duration-150'
                  )}
                  aria-label={`Close ${tab.title}`}
                >
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Pinned Indicator */}
              {tab.pinned && (
                <span
                  className="flex-shrink-0 text-xs text-gray-400"
                  aria-label="Pinned"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                    <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11.2V22H12.8V16H18V14L16 12Z" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}

        {/* Empty State */}
        {tabs.length === 0 && (
          <div className="text-sm text-gray-400 dark:text-gray-600 px-3">
            No tabs open
          </div>
        )}
      </div>

      {/* Add Tab Button */}
      <button
        onClick={onTabAdd}
        className={cn(
          'flex-shrink-0 flex items-center justify-center',
          'w-8 h-8 rounded',
          'bg-gray-200 dark:bg-gray-800',
          'hover:bg-gray-300 dark:hover:bg-gray-700',
          'text-gray-600 dark:text-gray-400',
          'transition-colors duration-150'
        )}
        aria-label="Add new tab"
        title="Add new tab"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* Fullscreen Button */}
      {(onEnterFullscreen || onExitFullscreen) && (
        <button
          onClick={isFullscreen ? onExitFullscreen : onEnterFullscreen}
          className={cn(
            'flex-shrink-0 flex items-center justify-center',
            'w-8 h-8 rounded',
            'bg-gray-200 dark:bg-gray-800',
            'hover:bg-gray-300 dark:hover:bg-gray-700',
            'text-gray-600 dark:text-gray-400',
            'transition-colors duration-150'
          )}
          aria-label={isFullscreen ? '退出全屏' : '全屏显示'}
          title={isFullscreen ? '退出全屏' : '全屏显示'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Collapse Button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className={cn(
            'flex-shrink-0 flex items-center justify-center',
            'w-8 h-8 rounded',
            'bg-gray-200 dark:bg-gray-800',
            'hover:bg-gray-300 dark:hover:bg-gray-700',
            'text-gray-600 dark:text-gray-400',
            'transition-colors duration-150'
          )}
          aria-label="Collapse panel"
          title="收起工作台"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * TabBar.Item component (for individual tab rendering)
 * Can be used separately if needed
 */
export interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
}

export function TabItem({ tab, isActive, onSelect, onClose }: TabItemProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(tab.id);
  };

  return (
    <button
      onClick={() => onSelect(tab.id)}
      className={cn(
        'group flex items-center gap-2 px-3 h-8 min-w-0 max-w-[200px]',
        'rounded-t-lg border border-b-0 transition-all duration-150',
        'text-sm font-medium whitespace-nowrap overflow-hidden',
        'hover:bg-gray-200 dark:hover:bg-gray-700',
        isActive
          ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
          : 'bg-gray-200/50 dark:bg-gray-800/50 border-transparent text-gray-600 dark:text-gray-400'
      )}
      title={tab.title}
    >
      {tab.icon && (
        <span className="flex-shrink-0 text-base" aria-hidden="true">
          {tab.icon}
        </span>
      )}

      <span className="flex-1 truncate text-left">{tab.title}</span>

      {tab.closable && !tab.pinned && (
        <button
          onClick={handleClose}
          className={cn(
            'flex-shrink-0 p-0.5 rounded',
            'opacity-0 group-hover:opacity-100',
            'hover:bg-gray-300 dark:hover:bg-gray-600',
            'transition-all duration-150'
          )}
          aria-label={`Close ${tab.title}`}
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </button>
  );
}
