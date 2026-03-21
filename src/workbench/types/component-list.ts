/**
 * Workbench Component List Types
 *
 * Defines types for component list management including filtering,
 * sorting, and display options.
 */

import type { TabStrategy } from './tab';

/**
 * Component category
 */
export type ComponentCategory =
  | 'productivity'  // 生产力工具
  | 'files'         // 文件相关
  | 'data'          // 数据处理
  | 'communication' // 通信相关
  | 'utilities'     // 实用工具
  | 'developer'     // 开发工具
  | 'media'         // 媒体相关
  | 'other';        // 其他

/**
 * Component statistics
 */
export interface ComponentStatistics {
  /** Number of times the component has been used */
  usageCount: number;

  /** Last used timestamp */
  lastUsedAt: number;

  /** Average session duration (optional) */
  avgSessionDuration?: number;
}

/**
 * Component information
 * Extended version with Tab support and statistics
 */
export interface ComponentInfo {
  // Basic Information (from existing ComponentManifest)
  /** Component unique identifier */
  id: string;

  /** Component name */
  name: string;

  /** Component version */
  version: string;

  /** Component description */
  description: string;

  /** Component author (optional) */
  author?: string;

  /** Component icon URL or identifier (optional) */
  icon?: string;

  // New Fields for Tab Support
  /** Component category */
  category?: ComponentCategory;

  /** Component tags */
  tags?: string[];

  /** Tab strategy */
  tabStrategy: TabStrategy;

  /** Component statistics */
  stats?: ComponentStatistics;

  // Resources
  /** Manifest URL */
  manifestUrl: string;

  /** Entry point URL */
  entryUrl: string;
}

/**
 * Component filter options
 */
export interface ComponentFilterOptions {
  /** Search query string */
  searchQuery?: string;

  /** Filter by category */
  category?: ComponentCategory | 'all';

  /** Filter by tags */
  tags?: string[];

  /** Show only favorite components */
  favoritesOnly?: boolean;

  /** Show only recent components */
  recentOnly?: boolean;
}

/**
 * Component sort options
 */
export type ComponentSortOption =
  | 'name'         // Sort by name (A-Z)
  | 'recent'       // Sort by last used time
  | 'popular';     // Sort by usage count

/**
 * Component list view mode
 */
export type ComponentListViewMode = 'grid' | 'list';

/**
 * Component list display options
 */
export interface ComponentListDisplayOptions {
  /** View mode */
  mode: ComponentListViewMode;

  /** Sort option */
  sortBy: ComponentSortOption;

  /** Filter options */
  filters: ComponentFilterOptions;

  /** Grid columns (for grid mode) */
  gridColumns?: number;
}

/**
 * Component card state
 */
export interface ComponentCardState {
  /** Component name */
  componentName: string;

  /** Whether the component is favorited */
  isFavorite: boolean;

  /** Whether the component is currently loading */
  isLoading: boolean;

  /** Whether the component card is hovered */
  isHovered: boolean;
}

/**
 * Component list storage data
 * Data persisted to localStorage
 */
export interface ComponentListStorage {
  /** Recently used component names (max 10) */
  recentComponents: string[];

  /** Favorited component names */
  favoriteComponents: string[];

  /** Display options (optional) */
  displayOptions?: ComponentListDisplayOptions;
}

/**
 * Component search result
 */
export interface ComponentSearchResult {
  /** Component info */
  component: ComponentInfo;

  /** Relevance score (0-1) */
  score: number;

  /** Matched fields */
  matchedFields: ('name' | 'description' | 'tags' | 'category')[];
}
