/**
 * Workbench Host
 * Host 端功能导出
 */

// ============ 类型导出 ============
export type {
  HostAPI,
  MessageAPI,
  SessionAPI,
  InputAPI,
  UIAPI,
  EventAPI,
  HostConfig,
  HostSecurityConfig,
  HostCapabilities,
  WorkbenchHost as WorkbenchHostInterface,
  ComponentInstance
} from '../types/host';

// ============ 功能导出 ============
export {
  HostCapabilitiesBuilder,
  createDefaultMessageAPI,
  createDefaultSessionAPI,
  createDefaultInputAPI,
  createDefaultUIAPI
} from './capabilities';

export {
  ComponentLoader,
  createComponentLoader
} from './loader';

export {
  WorkbenchHost,
  createWorkbenchHost
} from './host';
