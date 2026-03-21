/**
 * Workbench Core
 * 核心功能导出
 */

export { MessageBus } from './message-bus';
export * as Protocol from './protocol';

// Tab Management
export { TabManager, getTabManager, resetTabManager } from './tab-manager';
export {
  workbenchReducer,
  initialWorkbenchState,
  workbenchActions,
} from './tab-reducer';
export type {
  WorkbenchState,
  WorkbenchAction,
  WorkbenchViewMode,
} from './tab-reducer';

// Tab Context
export {
  WorkbenchProvider,
  useWorkbench,
  useWorkbenchState,
  useTabOperations,
  useComponentOperations,
  useViewMode,
} from './tab-context';
export type { WorkbenchContextValue, WorkbenchProviderProps } from './tab-context';
