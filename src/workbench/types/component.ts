/**
 * Workbench Component Types
 *
 * Defines types for Workbench components including lifecycle,
 * manifest, and initialization contexts.
 */

import type { HostAPI } from './host';
import type { WorkbenchMessage } from './message';
import type { ComponentConfig, SessionContext as CommonSessionContext } from './common';
import type { TabStrategy } from './tab';
import type { ComponentCategory } from './component-list';

/**
 * Session context for components (aliased to avoid conflict)
 */
export type SessionContext = CommonSessionContext;

/**
 * Workbench Component interface
 * All components must implement this interface
 */
export interface WorkbenchComponent {
  /** Unique component identifier */
  readonly id: string;

  /** Component version */
  readonly version: string;

  /**
   * Initialize component with context
   * @param context - Initialization context
   */
  init(context: InitContext): Promise<void> | void;

  /**
   * Mount component to an element
   * @param element - DOM element to mount to
   */
  mount(element: HTMLElement): Promise<void> | void;

  /**
   * Unmount component
   */
  unmount(): Promise<void> | void;

  /**
   * Handle incoming messages
   * @param message - Workbench message to handle
   */
  handleMessage?(message: WorkbenchMessage): Promise<void> | void;

  /**
   * Called when the container size changes
   * Components can implement this method to respond to size changes
   * @param size - New size dimensions
   */
  onResize?(size: { width: number; height: number }): void;

  /**
   * Health check for component
   * @returns Whether component is healthy
   */
  healthCheck(): Promise<boolean> | boolean;
}

/**
 * Component initialization context
 */
export interface InitContext {
  /** Host API for communicating with ChatBox */
  host: HostAPI;

  /** Initial parameters */
  params: Record<string, unknown>;

  /** Session context */
  session: SessionContext;

  /** Component configuration */
  config: ComponentConfig;

  /** Component manifest */
  manifest: ComponentManifest;
}

/**
 * Component manifest (metadata)
 */
export interface ComponentManifest {
  /** Component name */
  name: string;

  /** Component version */
  version: string;

  /** Component description */
  description: string;

  /** Component author */
  author: string;

  /** Optional icon URL or identifier */
  icon?: string;

  /** Entry point URL */
  entry: string;

  /** Optional style file URLs */
  styles?: string[];

  /** Optional asset URLs */
  assets?: string[];

  /** Component capabilities */
  capabilities: {
    /** Required capabilities from Host */
    required: string[];

    /** Optional capabilities from Host */
    optional: string[];

    /** Capabilities provided by component */
    provided: string[];
  };

  /** Optional dependencies */
  dependencies?: Dependency[];

  /** Optional security configuration */
  security?: SecurityConfig;

  /** Optional configuration schema (JSON Schema) */
  configSchema?: Record<string, unknown>;

  // Tab System Support (New fields)
  /** Tab strategy configuration */
  tabStrategy?: TabStrategy;

  /** Component category */
  category?: ComponentCategory;

  /** Component tags */
  tags?: string[];

  /** Default view mode (fullscreen | panel) */
  viewMode?: 'fullscreen' | 'panel';
}

/**
 * Component dependency
 */
export interface Dependency {
  /** Dependency name */
  name: string;

  /** Dependency version */
  version: string;

  /** Optional dependency URL */
  url?: string;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** Required permissions */
  permissions: string[];

  /** Optional Content Security Policy */
  csp?: string;
}

/**
 * Component lifecycle hooks
 */
export interface ComponentLifecycle {
  /**
   * Called during initialization
   * @param context - Initialization context
   */
  onInit?(context: InitContext): Promise<void> | void;

  /**
   * Called after mounting
   */
  onMount?(): Promise<void> | void;

  /**
   * Called when parameters are updated
   * @param params - Updated parameters
   */
  onUpdate?(params: Record<string, unknown>): Promise<void> | void;

  /**
   * Called when visibility changes
   * @param visible - Whether component is visible
   */
  onVisibilityChange?(visible: boolean): void;

  /**
   * Called when size changes
   * @param size - New size dimensions
   */
  onResize?(size: { width: number; height: number }): void;

  /**
   * Called before unmounting
   */
  onDestroy?(): Promise<void> | void;
}

/**
 * Component load strategy
 */
export interface ComponentLoadStrategy {
  /** Remote loading configuration */
  remote: {
    /** JavaScript entry file URL */
    jsUrl: string;

    /** Optional CSS file URLs */
    cssUrl?: string[];

    /** Optional HTML template URL */
    htmlUrl?: string;

    /** Optional version */
    version?: string;

    /** Optional SRI hash */
    integrity?: string;
  };

  /** Optional inline code configuration (dev only) */
  inline?: {
    /** Inline code */
    code: string;

    /** Optional inline styles */
    styles?: string;
  };
}

/**
 * Component cache entry
 */
export interface ComponentCacheEntry {
  /** Component manifest */
  manifest: ComponentManifest;

  /** Cached resources */
  resources: Map<string, Blob>;

  /** Cache timestamp */
  timestamp: number;

  /** Component version */
  version: string;

  /** Optional ETag */
  etag?: string;
}
