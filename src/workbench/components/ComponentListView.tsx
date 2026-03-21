/**
 * Workbench ComponentListView Component
 *
 * Displays a list of all available components with search and filter capabilities.
 */

import React, { useMemo, useState } from 'react';
import type { ComponentInfo, ComponentCategory } from '../types/component-list';
import { ComponentCard, ComponentCardGrid } from './ComponentCard';
import { SearchBar } from './SearchInput';
import { CategoryFilter } from './CategoryFilter';
import { cn } from '../../lib/utils';

/**
 * ComponentListView props
 */
export interface ComponentListViewProps {
  /** All available components */
  components: ComponentInfo[];

  /** Callback when a component is selected */
  onSelect: (componentName: string) => void;

  /** Recently used component names */
  recent?: string[];

  /** Favorited component names */
  favorites?: string[];

  /** Callback when favorite is toggled */
  onToggleFavorite?: (componentName: string) => void;

  /** Additional CSS class name */
  className?: string;

  /** Number of columns in the grid (default: 3) */
  columns?: 2 | 3 | 4 | 5;

  /** Whether to show recent section (default: true) */
  showRecent?: boolean;

  /** Whether to show favorites section (default: true) */
  showFavorites?: boolean;

  /** Empty state message */
  emptyMessage?: string;
}

/**
 * ComponentListView component
 */
export function ComponentListView({
  components,
  onSelect,
  recent = [],
  favorites = [],
  onToggleFavorite,
  className,
  columns = 3,
  showRecent = true,
  showFavorites = true,
  emptyMessage = 'No components found',
}: ComponentListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');

  // Filter components based on search and category
  const filteredComponents = useMemo(() => {
    return components.filter((component) => {
      // Search filter
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        const matchesSearch =
          component.name.toLowerCase().includes(lowerQuery) ||
          component.description.toLowerCase().includes(lowerQuery) ||
          component.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery));

        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && component.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [components, searchQuery, selectedCategory]);

  // Get recent components
  const recentComponents = useMemo(() => {
    return recent
      .map((name) => components.find((c) => c.name === name))
      .filter((c): c is ComponentInfo => c !== undefined);
  }, [recent, components]);

  // Get favorite components
  const favoriteComponents = useMemo(() => {
    return favorites
      .map((name) => components.find((c) => c.name === name))
      .filter((c): c is ComponentInfo => c !== undefined);
  }, [favorites, components]);

  // Check if we should show sections
  const showRecentSection = showRecent && recentComponents.length > 0 && !searchQuery && selectedCategory === 'all';
  const showFavoritesSection = showFavorites && favoriteComponents.length > 0 && !searchQuery && selectedCategory === 'all';

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const hasResults = filteredComponents.length > 0 || showRecentSection || showFavoritesSection;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with search and filter */}
      <div className="flex-shrink-0 p-6 space-y-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Components</h2>
          {filteredComponents.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {filteredComponents.length} {filteredComponents.length === 1 ? 'component' : 'components'}
            </span>
          )}
        </div>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search components..."
          showResultCount={false}
        />

        <CategoryFilter
          value={selectedCategory}
          onChange={setSelectedCategory}
          variant="tabs"
        />
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto p-6">
        {!hasResults ? (
          <EmptyState message={emptyMessage} onClear={clearFilters} />
        ) : (
          <div className="space-y-8">
            {/* Recent Components */}
            {showRecentSection && (
              <ComponentSection title="Recently Used">
                <ComponentCardGrid columns={columns}>
                  {recentComponents.slice(0, 6).map((component) => (
                    <ComponentCard
                      key={component.name}
                      component={component}
                      isFavorite={favorites.includes(component.name)}
                      onSelect={onSelect}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </ComponentCardGrid>
              </ComponentSection>
            )}

            {/* Favorite Components */}
            {showFavoritesSection && (
              <ComponentSection title="Favorites">
                <ComponentCardGrid columns={columns}>
                  {favoriteComponents.map((component) => (
                    <ComponentCard
                      key={component.name}
                      component={component}
                      isFavorite={true}
                      onSelect={onSelect}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </ComponentCardGrid>
              </ComponentSection>
            )}

            {/* All Components */}
            <ComponentSection
              title={
                searchQuery || selectedCategory !== 'all'
                  ? 'Search Results'
                  : showRecentSection || showFavoritesSection
                  ? 'All Components'
                  : undefined
              }
            >
              {filteredComponents.length === 0 ? (
                <EmptyState message={emptyMessage} onClear={clearFilters} />
              ) : (
                <ComponentCardGrid columns={columns}>
                  {filteredComponents.map((component) => (
                    <ComponentCard
                      key={component.name}
                      component={component}
                      isFavorite={favorites.includes(component.name)}
                      onSelect={onSelect}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </ComponentCardGrid>
              )}
            </ComponentSection>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ComponentSection component
 * Section with title and content
 */
export interface ComponentSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function ComponentSection({ title, children, className }: ComponentSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      )}
      {children}
    </div>
  );
}

/**
 * EmptyState component
 * Shown when no components match filters
 */
export interface EmptyStateProps {
  message: string;
  onClear?: () => void;
  className?: string;
}

export function EmptyState({ message, onClear, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12',
        'text-center',
        className
      )}
    >
      <svg
        className="w-16 h-16 text-muted-foreground/50 mb-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>

      <p className="text-lg text-muted-foreground mb-2">{message}</p>

      {onClear && (
        <button
          onClick={onClear}
          className={cn(
            'mt-4 px-4 py-2 rounded-md text-sm font-medium',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90',
            'transition-colors duration-150'
          )}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/**
 * ComponentListHeader component
 * Header component for the list view
 */
export interface ComponentListHeaderProps {
  componentCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: ComponentCategory | 'all';
  onCategoryChange: (category: ComponentCategory | 'all') => void;
  className?: string;
}

export function ComponentListHeader({
  componentCount,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  className,
}: ComponentListHeaderProps) {
  return (
    <div className={cn('flex-shrink-0 p-6 space-y-4 border-b border-border', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Components</h2>
        <span className="text-sm text-muted-foreground">
          {componentCount} {componentCount === 1 ? 'component' : 'components'}
        </span>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search components..."
      />

      <CategoryFilter value={selectedCategory} onChange={onCategoryChange} variant="tabs" />
    </div>
  );
}
