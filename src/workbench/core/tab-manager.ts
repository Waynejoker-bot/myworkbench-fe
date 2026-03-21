/**
 * Workbench Tab Manager
 *
 * Manages tab lifecycle including creation, switching, and closing.
 * Enforces tab strategy policies (singleton/multiple modes).
 */

import type {
  Tab,
  TabStrategy,
  TabFilterOptions,
  TabStatistics,
  TabEvent,
  TabEventType,
} from '../types/tab';
import { TabEventType as TabEventTypeEnum } from '../types/tab';
import { uuid } from '../utils/uuid';

/**
 * Tab event listener type
 */
type TabEventListener = (event: TabEvent) => void;

/**
 * Tab Manager class
 * Manages all tabs in the workbench
 */
export class TabManager {
  private tabs: Map<string, Tab> = new Map();
  private componentStrategies: Map<string, TabStrategy> = new Map();
  private eventListeners: Map<TabEventType, TabEventListener[]> = new Map();
  private activeTabId: string | null = null;

  constructor() {
    this.initializeEventListeners();
  }

  /**
   * Open a new tab for a component
   * @param componentName - Component name
   * @param params - Component parameters
   * @returns Tab ID
   */
  openTab(componentName: string, params: Record<string, unknown> = {}): string {
    const strategy = this.getTabStrategy(componentName);

    // Check singleton mode
    if (strategy.mode === 'singleton') {
      const existingTab = this.findTabByComponent(componentName);
      if (existingTab) {
        this.switchTab(existingTab.id);
        return existingTab.id;
      }
    }

    // Check instance limit for multiple mode
    if (strategy.mode === 'multiple' && strategy.maxInstances) {
      const instanceCount = this.countTabsByComponent(componentName);
      if (instanceCount >= strategy.maxInstances) {
        throw new Error(
          `Maximum instances (${strategy.maxInstances}) reached for ${componentName}`
        );
      }
    }

    // Create new tab
    const tab = this.createTab(componentName, params, strategy);
    this.tabs.set(tab.id, tab);

    // Emit tab opened event
    this.emitEvent({
      type: TabEventTypeEnum.OPENED,
      tabId: tab.id,
      timestamp: Date.now(),
      data: { componentName, params },
    });

    // Switch to new tab
    this.switchTab(tab.id);

    return tab.id;
  }

  /**
   * Close a tab
   * @param tabId - Tab ID to close
   * @returns Whether the tab was closed
   */
  closeTab(tabId: string): boolean {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return false;
    }

    // Check if tab is closable
    if (!tab.closable || tab.pinned) {
      return false;
    }

    // Remove tab
    this.tabs.delete(tabId);

    // Emit tab closed event
    this.emitEvent({
      type: TabEventTypeEnum.CLOSED,
      tabId,
      timestamp: Date.now(),
      data: { componentName: tab.componentName },
    });

    // If closed tab was active, switch to another tab
    if (this.activeTabId === tabId) {
      const remainingTabs = Array.from(this.tabs.values());
      if (remainingTabs.length > 0) {
        // Switch to most recently used tab
        const mostRecent = remainingTabs.sort((a, b) => b.lastActivatedAt - a.lastActivatedAt)[0];
        if (mostRecent) {
          this.switchTab(mostRecent.id, false); // Don't emit switch event on auto-switch
        }
      } else {
        this.activeTabId = null;
      }
    }

    return true;
  }

  /**
   * Switch to a tab
   * @param tabId - Tab ID to switch to
   * @param emitEvent - Whether to emit switch event (default: true)
   * @returns Whether the switch was successful
   */
  switchTab(tabId: string, emitEvent = true): boolean {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return false;
    }

    const previousTabId = this.activeTabId;
    this.activeTabId = tabId;
    tab.lastActivatedAt = Date.now();

    // Update tab status
    if (tab.status === 'loading') {
      tab.status = 'ready';
    }

    if (emitEvent) {
      this.emitEvent({
        type: TabEventTypeEnum.SWITCHED,
        tabId,
        timestamp: Date.now(),
        data: { previousTabId },
      });
    }

    return true;
  }

  /**
   * Get a tab by ID
   * @param tabId - Tab ID
   * @returns Tab or undefined
   */
  getTab(tabId: string): Tab | undefined {
    return this.tabs.get(tabId);
  }

  /**
   * Get all tabs
   * @returns Array of all tabs
   */
  getAllTabs(): Tab[] {
    return Array.from(this.tabs.values());
  }

  /**
   * Get active tab
   * @returns Active tab or undefined
   */
  getActiveTab(): Tab | undefined {
    if (!this.activeTabId) {
      return undefined;
    }
    return this.tabs.get(this.activeTabId);
  }

  /**
   * Get active tab ID
   * @returns Active tab ID or null
   */
  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  /**
   * Update tab status
   * @param tabId - Tab ID
   * @param status - New status
   * @param error - Optional error object
   */
  updateTabStatus(tabId: string, status: Tab['status'], error?: Error): void {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return;
    }

    const oldStatus = tab.status;
    tab.status = status;
    if (error) {
      tab.error = error;
    }

    this.emitEvent({
      type: TabEventTypeEnum.STATUS_CHANGED,
      tabId,
      timestamp: Date.now(),
      data: { oldStatus, newStatus: status, error },
    });
  }

  /**
   * Update tab title
   * @param tabId - Tab ID
   * @param title - New title
   */
  updateTabTitle(tabId: string, title: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return;
    }

    tab.title = title;

    this.emitEvent({
      type: TabEventTypeEnum.UPDATED,
      tabId,
      timestamp: Date.now(),
      data: { field: 'title', value: title },
    });
  }

  /**
   * Pin/unpin a tab
   * @param tabId - Tab ID
   * @param pinned - Whether to pin the tab
   */
  setTabPinned(tabId: string, pinned: boolean): void {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return;
    }

    tab.pinned = pinned;

    this.emitEvent({
      type: TabEventTypeEnum.UPDATED,
      tabId,
      timestamp: Date.now(),
      data: { field: 'pinned', value: pinned },
    });
  }

  /**
   * Filter tabs
   * @param options - Filter options
   * @returns Filtered tabs
   */
  filterTabs(options: TabFilterOptions): Tab[] {
    let tabs = Array.from(this.tabs.values());

    if (options.componentName) {
      tabs = tabs.filter(tab => tab.componentName === options.componentName);
    }

    if (options.status) {
      tabs = tabs.filter(tab => tab.status === options.status);
    }

    if (options.pinned !== undefined) {
      tabs = tabs.filter(tab => tab.pinned === options.pinned);
    }

    return tabs;
  }

  /**
   * Get tab statistics
   * @returns Tab statistics
   */
  getStatistics(): TabStatistics {
    const tabs = Array.from(this.tabs.values());

    const byStatus: Record<'loading' | 'ready' | 'error', number> = {
      loading: 0,
      ready: 0,
      error: 0,
    };

    const byComponent: Record<string, number> = {};
    let pinned = 0;

    tabs.forEach(tab => {
      const status = tab.status;
      byStatus[status]++;
      byComponent[tab.componentName] = (byComponent[tab.componentName] || 0) + 1;
      if (tab.pinned) {
        pinned++;
      }
    });

    return {
      total: tabs.length,
      byStatus,
      byComponent,
      pinned,
    };

    return {
      total: tabs.length,
      byStatus: byStatus as TabStatistics['byStatus'],
      byComponent,
      pinned,
    };
  }

  /**
   * Add event listener
   * @param eventType - Event type
   * @param listener - Event listener
   */
  addEventListener(eventType: TabEventType, listener: TabEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   * @param eventType - Event type
   * @param listener - Event listener
   */
  removeEventListener(eventType: TabEventType, listener: TabEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Clear all tabs
   */
  clearAll(): void {
    const tabIds = Array.from(this.tabs.keys());
    tabIds.forEach(tabId => this.closeTab(tabId));
    this.activeTabId = null;
  }

  /**
   * Get tab strategy for a component
   * @param componentName - Component name
   * @returns Tab strategy
   */
  private getTabStrategy(componentName: string): TabStrategy {
    if (!this.componentStrategies.has(componentName)) {
      // Default strategy for components without manifest
      return {
        mode: 'multiple',
        allowClose: true,
      };
    }
    return this.componentStrategies.get(componentName)!;
  }

  /**
   * Set tab strategy for a component
   * @param componentName - Component name
   * @param strategy - Tab strategy
   */
  setTabStrategy(componentName: string, strategy: TabStrategy): void {
    this.componentStrategies.set(componentName, strategy);
  }

  /**
   * Create a new tab
   * @param componentName - Component name
   * @param params - Component parameters
   * @param strategy - Tab strategy
   * @returns New tab
   */
  private createTab(
    componentName: string,
    params: Record<string, unknown>,
    strategy: TabStrategy
  ): Tab {
    const id = uuid();
    const instanceId = uuid();

    // Generate default title
    const defaultTitle = strategy.defaultTitle || '{{name}}';
    const title = defaultTitle.replace('{{name}}', componentName).replace('{{version}}', '1.0.0');

    return {
      id,
      componentName,
      instanceId,
      title,
      status: 'loading',
      closable: strategy.allowClose !== false,
      pinned: false,
      params,
      createdAt: Date.now(),
      lastActivatedAt: Date.now(),
    };
  }

  /**
   * Find tab by component name (for singleton mode)
   * @param componentName - Component name
   * @returns Tab or undefined
   */
  private findTabByComponent(componentName: string): Tab | undefined {
    return Array.from(this.tabs.values()).find(
      tab => tab.componentName === componentName
    );
  }

  /**
   * Count tabs by component name
   * @param componentName - Component name
   * @returns Number of tabs
   */
  private countTabsByComponent(componentName: string): number {
    return Array.from(this.tabs.values()).filter(
      tab => tab.componentName === componentName
    ).length;
  }

  /**
   * Emit tab event
   * @param event - Tab event
   */
  private emitEvent(event: TabEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  /**
   * Initialize event listeners map
   */
  private initializeEventListeners(): void {
    Object.values(TabEventTypeEnum).forEach(eventType => {
      this.eventListeners.set(eventType as TabEventType, []);
    });
  }
}

/**
 * Create a singleton TabManager instance
 */
let tabManagerInstance: TabManager | null = null;

export function getTabManager(): TabManager {
  if (!tabManagerInstance) {
    tabManagerInstance = new TabManager();
  }
  return tabManagerInstance;
}

export function resetTabManager(): void {
  if (tabManagerInstance) {
    tabManagerInstance.clearAll();
  }
  tabManagerInstance = null;
}
