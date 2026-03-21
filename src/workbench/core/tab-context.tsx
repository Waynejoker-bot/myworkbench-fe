/**
 * Workbench Tab Context
 *
 * React Context for managing workbench state and tab operations.
 * Provides a clean interface for components to interact with the workbench.
 */

import { createContext, useContext, useReducer, useCallback, useEffect, useRef, ReactNode } from 'react';
import type { Tab, TabStatus } from '../types/tab';
import type { ComponentInfo, ComponentCategory } from '../types/component-list';
import {
  workbenchReducer,
  initialWorkbenchState,
  workbenchActions,
  type WorkbenchState,
  type WorkbenchAction,
} from './tab-reducer';
import { getTabManager } from './tab-manager';
import { workbenchStorage } from '../storage';
import { getComponentRegistryClient } from '../registry/client';

/**
 * Workbench context value
 */
export interface WorkbenchContextValue {
  // State
  state: WorkbenchState;

  // Tab operations
  openTab: (componentName: string, params?: Record<string, unknown>) => string;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  getTab: (tabId: string) => Tab | undefined;
  updateTabStatus: (tabId: string, status: TabStatus, error?: Error) => void;

  // Component operations
  loadComponents: () => Promise<void>;
  filterComponents: (query?: string, category?: ComponentCategory | 'all') => ComponentInfo[];
  toggleFavorite: (componentName: string) => void;
  isFavorite: (componentName: string) => boolean;

  // View mode
  showListView: () => void;
  showComponentView: () => void;
}

/**
 * Workbench context
 */
const WorkbenchContext = createContext<WorkbenchContextValue | undefined>(undefined);

/**
 * Workbench context provider props
 */
export interface WorkbenchProviderProps {
  children: ReactNode;
  /** Whether to load from storage on mount (default: true) */
  loadFromStorage?: boolean;
}

/**
 * WorkbenchProvider component
 * Provides workbench state and operations to children
 */
export function WorkbenchProvider({
  children,
  loadFromStorage = true,
}: WorkbenchProviderProps) {
  const [state, dispatch] = useReducer<(state: WorkbenchState, action: WorkbenchAction) => WorkbenchState>(
    workbenchReducer,
    initialWorkbenchState
  );

  const tabManager = getTabManager();

  // 防抖保存函数
  const debounceSaveRef = useRef<NodeJS.Timeout | null>(null);

  const saveStateDebounced = useCallback(() => {
    if (debounceSaveRef.current) {
      clearTimeout(debounceSaveRef.current);
    }

    debounceSaveRef.current = setTimeout(() => {
      try {
        workbenchStorage.save({
          componentList: {
            recentComponents: state.recentComponents,
            favoriteComponents: state.favoriteComponents,
            displayOptions: {
              filters: {
                searchQuery: state.filterQuery,
                category: state.filterCategory,
              },
              sortBy: 'name',
              mode: 'grid',
            },
          },
        });
      } catch (error) {
        console.error('Failed to save workbench state:', error);
      }
    }, 300); // 300ms 防抖
  }, [state.recentComponents, state.favoriteComponents, state.filterQuery, state.filterCategory]);

  // Initialize from storage on mount
  useEffect(() => {
    if (!loadFromStorage) {
      return;
    }

    const initializeFromStorage = () => {
      try {
        const storage = workbenchStorage.get();

        // Load recent components
        if (storage.componentList.recentComponents.length > 0) {
          dispatch({
            type: 'SET_COMPONENTS',
            payload: state.components, // Preserve current components
          });
          storage.componentList.recentComponents.forEach(name => {
            dispatch(workbenchActions.addRecentComponent(name));
          });
        }

        // Load favorite components
        if (storage.componentList.favoriteComponents.length > 0) {
          storage.componentList.favoriteComponents.forEach(name => {
            dispatch({ type: 'TOGGLE_FAVORITE_COMPONENT', payload: name });
          });
        }

        // Load display options
        if (storage.componentList.displayOptions) {
          const { filters } = storage.componentList.displayOptions;
          if (filters.searchQuery !== undefined) {
            dispatch(workbenchActions.setFilterQuery(filters.searchQuery));
          }
          if (filters.category) {
            dispatch(workbenchActions.setFilterCategory(filters.category));
          }
        }
      } catch (error) {
        console.error('Failed to load workbench state from storage:', error);
      }
    };

    initializeFromStorage();
  }, [loadFromStorage]);

  // 保存状态变化到存储
  useEffect(() => {
    if (!loadFromStorage) {
      return;
    }

    saveStateDebounced();

    return () => {
      if (debounceSaveRef.current) {
        clearTimeout(debounceSaveRef.current);
      }
    };
  }, [
    state.recentComponents,
    state.favoriteComponents,
    state.filterQuery,
    state.filterCategory,
    loadFromStorage,
    saveStateDebounced,
  ]);

  // Sync TabManager events with reducer
  useEffect(() => {
    const handleTabEvent = (event: any) => {
      switch (event.type) {
        case 'tab:opened':
          // Tab already added by openTab function
          break;
        case 'tab:closed':
          dispatch(workbenchActions.removeTab(event.tabId));
          break;
        case 'tab:switched':
          dispatch(workbenchActions.switchTab(event.tabId));
          break;
        case 'tab:updated':
          // Handled by specific update functions
          break;
      }
    };

    // Listen to all tab events
    tabManager.addEventListener('tab:opened' as any, handleTabEvent);
    tabManager.addEventListener('tab:closed' as any, handleTabEvent);
    tabManager.addEventListener('tab:switched' as any, handleTabEvent);

    return () => {
      tabManager.removeEventListener('tab:opened' as any, handleTabEvent);
      tabManager.removeEventListener('tab:closed' as any, handleTabEvent);
      tabManager.removeEventListener('tab:switched' as any, handleTabEvent);
    };
  }, [tabManager]);

  /**
   * Open a new tab
   */
  const openTab = useCallback(
    (componentName: string, params: Record<string, unknown> = {}): string => {
      const tabId = tabManager.openTab(componentName, params);
      const tab = tabManager.getTab(tabId);

      if (tab) {
        dispatch(workbenchActions.addTab(tab));
        dispatch(workbenchActions.addRecentComponent(componentName));

        // Save to storage
        try {
          workbenchStorage.addRecent(componentName);
        } catch (error) {
          console.error('Failed to save recent component:', error);
        }
      }

      return tabId;
    },
    [tabManager]
  );

  /**
   * Close a tab
   */
  const closeTab = useCallback(
    (tabId: string) => {
      const success = tabManager.closeTab(tabId);
      if (success) {
        dispatch(workbenchActions.removeTab(tabId));
      }
    },
    [tabManager]
  );

  /**
   * Switch to a tab
   */
  const switchTab = useCallback(
    (tabId: string) => {
      tabManager.switchTab(tabId);
    },
    [tabManager]
  );

  /**
   * Get a tab by ID
   */
  const getTab = useCallback(
    (tabId: string): Tab | undefined => {
      return tabManager.getTab(tabId);
    },
    [tabManager]
  );

  /**
   * Update tab status
   */
  const updateTabStatus = useCallback(
    (tabId: string, status: TabStatus, error?: Error) => {
      tabManager.updateTabStatus(tabId, status, error);
      dispatch(workbenchActions.updateTabStatus(tabId, status, error));
    },
    [tabManager]
  );

  /**
   * Load components
   */
  const loadComponents = useCallback(async () => {
    dispatch(workbenchActions.setLoadingComponents(true));

    try {
      // Load from registry
      const client = getComponentRegistryClient();
      const registryComponents = await client.list();

      // Transform registry ComponentInfo to component-list ComponentInfo
      const components: ComponentInfo[] = registryComponents.map((comp) => ({
        ...comp,
        // Add required fields for component-list ComponentInfo
        tabStrategy: { mode: 'multiple' }, // Default to multiple tabs
        category: 'other' as ComponentCategory, // Default category
        tags: [], // Default empty tags
        stats: {
          usageCount: 0,
          lastUsedAt: 0,
        },
      }));

      dispatch(workbenchActions.setComponents(components));
    } catch (error) {
      console.error('Failed to load components:', error);
      dispatch(workbenchActions.setComponentsError(error as Error));
    }
  }, []);

  /**
   * Filter components
   */
  const filterComponents = useCallback(
    (query = state.filterQuery, category = state.filterCategory): ComponentInfo[] => {
      let filtered = state.components;

      // Filter by query
      if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(
          component =>
            component.name.toLowerCase().includes(lowerQuery) ||
            component.description.toLowerCase().includes(lowerQuery) ||
            component.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      }

      // Filter by category
      if (category && category !== 'all') {
        filtered = filtered.filter(component => component.category === category);
      }

      return filtered;
    },
    [state.components, state.filterQuery, state.filterCategory]
  );

  /**
   * Toggle favorite status
   */
  const toggleFavorite = useCallback(
    (componentName: string) => {
      dispatch(workbenchActions.toggleFavoriteComponent(componentName));

      // Save to storage
      try {
        workbenchStorage.toggleFavorite(componentName);
      } catch (error) {
        console.error('Failed to save favorite component:', error);
      }
    },
    []
  );

  /**
   * Check if component is favorited
   */
  const isFavorite = useCallback(
    (componentName: string): boolean => {
      return state.favoriteComponents.includes(componentName);
    },
    [state.favoriteComponents]
  );

  /**
   * Show list view
   */
  const showListView = useCallback(() => {
    dispatch(workbenchActions.setMode('list'));
  }, []);

  /**
   * Show component view
   */
  const showComponentView = useCallback(() => {
    dispatch(workbenchActions.setMode('component'));
  }, []);

  const contextValue: WorkbenchContextValue = {
    state,
    openTab,
    closeTab,
    switchTab,
    getTab,
    updateTabStatus,
    loadComponents,
    filterComponents,
    toggleFavorite,
    isFavorite,
    showListView,
    showComponentView,
  };

  return (
    <WorkbenchContext.Provider value={contextValue}>
      {children}
    </WorkbenchContext.Provider>
  );
}

/**
 * Hook to use workbench context
 * @throws Error if used outside of WorkbenchProvider
 */
export function useWorkbench(): WorkbenchContextValue {
  const context = useContext(WorkbenchContext);

  if (!context) {
    throw new Error('useWorkbench must be used within a WorkbenchProvider');
  }

  return context;
}

/**
 * Hook to use workbench state
 */
export function useWorkbenchState(): WorkbenchState {
  const { state } = useWorkbench();
  return state;
}

/**
 * Hook to use tab operations
 */
export function useTabOperations() {
  const { openTab, closeTab, switchTab, getTab, updateTabStatus } = useWorkbench();
  return { openTab, closeTab, switchTab, getTab, updateTabStatus };
}

/**
 * Hook to use component operations
 */
export function useComponentOperations() {
  const { loadComponents, filterComponents, toggleFavorite, isFavorite } = useWorkbench();
  return { loadComponents, filterComponents, toggleFavorite, isFavorite };
}

/**
 * Hook to use view mode
 */
export function useViewMode() {
  const { state, showListView, showComponentView } = useWorkbench();
  return {
    mode: state.mode,
    showListView,
    showComponentView,
  };
}
