/**
 * Workbench Component
 * Component 端功能导出
 */

// ============ 类型导出 ============
export type {
  WorkbenchComponent,
  InitContext,
  SessionContext,
  ComponentManifest,
  ComponentLifecycle,
  Dependency,
  SecurityConfig,
  ComponentLoadStrategy,
  ComponentCacheEntry
} from '../types/component';

export type {
  ComponentInstance
} from '../types/host';

// ============ 功能导出 ============
export { ComponentSDK, sdk } from './sdk';
export { WorkbenchComponentBase } from './base';
