/**
 * Workbench TabContent Component
 *
 * Displays the content area for tabs.
 * Handles tab visibility and component rendering.
 */

import React, { useEffect, useRef } from 'react';
import type { Tab } from '../types/tab';
import { cn } from '../../lib/utils';

/**
 * TabContent component props
 */
export interface TabContentProps {
  /** All tabs */
  tabs: Tab[];

  /** Active tab ID */
  activeTabId: string | null;

  /** Render function for tab content */
  renderTabContent: (tab: Tab) => React.ReactNode;

  /** Additional CSS class name */
  className?: string;

  /** Whether to keep inactive tabs mounted (default: false) */
  keepInactiveMounted?: boolean;
}

/**
 * TabContent component
 */
export function TabContent({
  tabs,
  activeTabId,
  renderTabContent,
  className,
  keepInactiveMounted = false,
}: TabContentProps) {
  return (
    <div
      className={cn(
        'flex-1 h-full overflow-hidden relative flex',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        // If not keeping inactive tabs mounted, only render active tab
        if (!keepInactiveMounted && !isActive) {
          return null;
        }

        return (
          <TabPane
            key={tab.id}
            tab={tab}
            isActive={isActive}
          >
            {renderTabContent(tab)}
          </TabPane>
        );
      })}

      {/* Empty State */}
      {tabs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600">
          <p className="text-sm">No tabs open</p>
        </div>
      )}
    </div>
  );
}

/**
 * TabPane component
 * Individual tab content pane
 */
export interface TabPaneProps {
  /** Tab data */
  tab: Tab;

  /** Whether this tab is active */
  isActive: boolean;

  /** Tab content */
  children: React.ReactNode;

  /** Additional CSS class name */
  className?: string;
}

export function TabPane({ tab, isActive, children, className }: TabPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Call visibility change callback when tab becomes active/inactive
  useEffect(() => {
    if (tab.componentInstance) {
      const component = tab.componentInstance as any;
      if (component.onVisibilityChange && typeof component.onVisibilityChange === 'function') {
        component.onVisibilityChange(isActive);
      }
    }
  }, [isActive, tab.componentInstance]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex-1 h-full transition-opacity duration-150',
        isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none hidden',
        className
      )}
      role="tabpanel"
      aria-labelledby={`tab-${tab.id}`}
      aria-hidden={!isActive}
    >
      {children}
    </div>
  );
}

/**
 * TabEmptyState component
 * Shown when no tabs are open
 */
export interface TabEmptyStateProps {
  /** Message to display */
  message?: string;

  /** Action button label */
  actionLabel?: string;

  /** Action button callback */
  onAction?: () => void;

  /** Additional CSS class name */
  className?: string;
}

export function TabEmptyState({
  message = 'No tabs open',
  actionLabel,
  onAction,
  className,
}: TabEmptyStateProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center',
        'text-gray-400 dark:text-gray-600',
        className
      )}
    >
      <svg
        className="w-16 h-16 mb-4 opacity-50"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
        <path d="M15 3v18" />
      </svg>

      <p className="text-lg mb-2">{message}</p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={cn(
            'mt-4 px-4 py-2 rounded',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90',
            'transition-colors duration-150'
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
