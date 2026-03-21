/**
 * Workbench Tab Reducer
 *
 * React reducer for managing workbench state including tabs,
 * components, and user preferences.
 */

import type { Tab, TabStatus } from '../types/tab';
import type { ComponentInfo, ComponentCategory } from '../types/component-list';

/**
 * Workbench view mode
 */
export type WorkbenchViewMode = 'list' | 'component';

/**
 * Workbench state
 */
export interface WorkbenchState {
  /** Current view mode */
  mode: WorkbenchViewMode;

  /** Tab management */
  tabs: Tab[];
  activeTabId: string | null;

  /** Component list */
  components: ComponentInfo[];

  /** User preferences */
  recentComponents: string[];
  favoriteComponents: string[];

  /** Filter state */
  filterQuery: string;
  filterCategory: ComponentCategory | 'all';

  /** Loading state */
  isLoadingComponents: boolean;
  componentsError: Error | null;
}

/**
 * Workbench action types
 */
export type WorkbenchAction =
  | { type: 'SET_MODE'; payload: WorkbenchViewMode }
  | { type: 'SET_TABS'; payload: Tab[] }
  | { type: 'ADD_TAB'; payload: Tab }
  | { type: 'REMOVE_TAB'; payload: string }
  | { type: 'SWITCH_TAB'; payload: string }
  | { type: 'UPDATE_TAB'; payload: { tabId: string; updates: Partial<Tab> } }
  | { type: 'UPDATE_TAB_STATUS'; payload: { tabId: string; status: TabStatus; error?: Error } }
  | { type: 'SET_ACTIVE_TAB'; payload: string | null }
  | { type: 'SET_COMPONENTS'; payload: ComponentInfo[] }
  | { type: 'SET_LOADING_COMPONENTS'; payload: boolean }
  | { type: 'SET_COMPONENTS_ERROR'; payload: Error | null }
  | { type: 'ADD_RECENT_COMPONENT'; payload: string }
  | { type: 'REMOVE_RECENT_COMPONENT'; payload: string }
  | { type: 'TOGGLE_FAVORITE_COMPONENT'; payload: string }
  | { type: 'SET_FILTER_QUERY'; payload: string }
  | { type: 'SET_FILTER_CATEGORY'; payload: ComponentCategory | 'all' }
  | { type: 'CLEAR_ALL_TABS' }
  | { type: 'RESET_STATE' };

/**
 * Initial state
 */
export const initialWorkbenchState: WorkbenchState = {
  mode: 'list',
  tabs: [],
  activeTabId: null,
  components: [],
  recentComponents: [],
  favoriteComponents: [],
  filterQuery: '',
  filterCategory: 'all',
  isLoadingComponents: false,
  componentsError: null,
};

/**
 * Workbench reducer
 * @param state - Current state
 * @param action - Action to apply
 * @returns New state
 */
export function workbenchReducer(
  state: WorkbenchState,
  action: WorkbenchAction
): WorkbenchState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
      };

    case 'SET_TABS':
      return {
        ...state,
        tabs: action.payload,
      };

    case 'ADD_TAB': {
      const newTabs = [...state.tabs, action.payload];
      return {
        ...state,
        tabs: newTabs,
        mode: 'component',
        activeTabId: action.payload.id,
      };
    }

    case 'REMOVE_TAB': {
      const newTabs = state.tabs.filter(tab => tab.id !== action.payload);
      let newActiveTabId = state.activeTabId;

      // If removed tab was active, switch to another tab
      if (state.activeTabId === action.payload) {
        if (newTabs.length === 0) {
          // No more tabs, switch to list view
          newActiveTabId = null;
          return {
            ...state,
            tabs: newTabs,
            activeTabId: null,
            mode: 'list',
          };
        } else {
          // Switch to most recently used tab
          const mostRecent = newTabs.sort((a, b) => b.lastActivatedAt - a.lastActivatedAt)[0];
          if (mostRecent) {
            newActiveTabId = mostRecent.id;
          }
        }
      }

      return {
        ...state,
        tabs: newTabs,
        activeTabId: newActiveTabId,
      };
    }

    case 'SWITCH_TAB':
      return {
        ...state,
        activeTabId: action.payload,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload
            ? { ...tab, lastActivatedAt: Date.now() }
            : tab
        ),
      };

    case 'UPDATE_TAB': {
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? { ...tab, ...action.payload.updates }
            : tab
        ),
      };
    }

    case 'UPDATE_TAB_STATUS': {
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                status: action.payload.status,
                error: action.payload.error,
              }
            : tab
        ),
      };
    }

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTabId: action.payload,
      };

    case 'SET_COMPONENTS':
      return {
        ...state,
        components: action.payload,
        isLoadingComponents: false,
        componentsError: null,
      };

    case 'SET_LOADING_COMPONENTS':
      return {
        ...state,
        isLoadingComponents: action.payload,
      };

    case 'SET_COMPONENTS_ERROR':
      return {
        ...state,
        isLoadingComponents: false,
        componentsError: action.payload,
      };

    case 'ADD_RECENT_COMPONENT': {
      const recent = state.recentComponents.filter(name => name !== action.payload);
      recent.unshift(action.payload);
      // Keep only 10 recent components
      return {
        ...state,
        recentComponents: recent.slice(0, 10),
      };
    }

    case 'REMOVE_RECENT_COMPONENT':
      return {
        ...state,
        recentComponents: state.recentComponents.filter(name => name !== action.payload),
      };

    case 'TOGGLE_FAVORITE_COMPONENT': {
      const favorites = state.favoriteComponents.includes(action.payload)
        ? state.favoriteComponents.filter(name => name !== action.payload)
        : [...state.favoriteComponents, action.payload];
      return {
        ...state,
        favoriteComponents: favorites,
      };
    }

    case 'SET_FILTER_QUERY':
      return {
        ...state,
        filterQuery: action.payload,
      };

    case 'SET_FILTER_CATEGORY':
      return {
        ...state,
        filterCategory: action.payload,
      };

    case 'CLEAR_ALL_TABS':
      return {
        ...state,
        tabs: [],
        activeTabId: null,
        mode: 'list',
      };

    case 'RESET_STATE':
      return {
        ...initialWorkbenchState,
      };

    default:
      return state;
  }
}

/**
 * Action creators
 */
export const workbenchActions = {
  setMode: (mode: WorkbenchViewMode): WorkbenchAction => ({
    type: 'SET_MODE',
    payload: mode,
  }),

  setTabs: (tabs: Tab[]): WorkbenchAction => ({
    type: 'SET_TABS',
    payload: tabs,
  }),

  addTab: (tab: Tab): WorkbenchAction => ({
    type: 'ADD_TAB',
    payload: tab,
  }),

  removeTab: (tabId: string): WorkbenchAction => ({
    type: 'REMOVE_TAB',
    payload: tabId,
  }),

  switchTab: (tabId: string): WorkbenchAction => ({
    type: 'SWITCH_TAB',
    payload: tabId,
  }),

  updateTab: (tabId: string, updates: Partial<Tab>): WorkbenchAction => ({
    type: 'UPDATE_TAB',
    payload: { tabId, updates },
  }),

  updateTabStatus: (tabId: string, status: TabStatus, error?: Error): WorkbenchAction => ({
    type: 'UPDATE_TAB_STATUS',
    payload: { tabId, status, error },
  }),

  setActiveTab: (tabId: string | null): WorkbenchAction => ({
    type: 'SET_ACTIVE_TAB',
    payload: tabId,
  }),

  setComponents: (components: ComponentInfo[]): WorkbenchAction => ({
    type: 'SET_COMPONENTS',
    payload: components,
  }),

  setLoadingComponents: (isLoading: boolean): WorkbenchAction => ({
    type: 'SET_LOADING_COMPONENTS',
    payload: isLoading,
  }),

  setComponentsError: (error: Error | null): WorkbenchAction => ({
    type: 'SET_COMPONENTS_ERROR',
    payload: error,
  }),

  addRecentComponent: (componentName: string): WorkbenchAction => ({
    type: 'ADD_RECENT_COMPONENT',
    payload: componentName,
  }),

  removeRecentComponent: (componentName: string): WorkbenchAction => ({
    type: 'REMOVE_RECENT_COMPONENT',
    payload: componentName,
  }),

  toggleFavoriteComponent: (componentName: string): WorkbenchAction => ({
    type: 'TOGGLE_FAVORITE_COMPONENT',
    payload: componentName,
  }),

  setFilterQuery: (query: string): WorkbenchAction => ({
    type: 'SET_FILTER_QUERY',
    payload: query,
  }),

  setFilterCategory: (category: ComponentCategory | 'all'): WorkbenchAction => ({
    type: 'SET_FILTER_CATEGORY',
    payload: category,
  }),

  clearAllTabs: (): WorkbenchAction => ({
    type: 'CLEAR_ALL_TABS',
  }),

  resetState: (): WorkbenchAction => ({
    type: 'RESET_STATE',
  }),
};
