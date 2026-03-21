/**
 * Component Registry Module
 *
 * 组件注册表模块
 * 负责组件市场的 API 交互和引用解析
 */

// Type definitions
export type {
  ComponentInfo,
  ComponentManifest,
  ComponentListResponse,
  ComponentDetailResponse,
  ErrorResponse,
  ComponentListItem,
  ParseResult
} from './types';

// API Client
export {
  ComponentRegistryClient,
  createComponentRegistryClient,
  getComponentRegistryClient,
  type ClientConfig
} from './client';

// Reference Resolver
export {
  parseComponentReference,
  parseAllComponentReferences,
  hasComponentReference,
  removeComponentReferences,
  replaceComponentReferences,
  isValidComponentName,
  normalizeComponentName,
  parseComponentId,
  generateComponentId,
  ComponentReferenceResolver,
  createComponentReferenceResolver
} from './resolver';
