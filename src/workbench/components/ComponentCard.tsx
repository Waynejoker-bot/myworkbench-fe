/**
 * Workbench ComponentCard Component
 *
 * Displays a single component card in the component list.
 */

import React from 'react';
import type { ComponentInfo } from '../types/component-list';
import { cn } from '../../lib/utils';

/**
 * ComponentCard props
 */
export interface ComponentCardProps {
  /** Component information */
  component: ComponentInfo;

  /** Whether the component is favorited */
  isFavorite?: boolean;

  /** Callback when card is clicked */
  onSelect: (componentName: string) => void;

  /** Callback when favorite button is clicked */
  onToggleFavorite?: (componentName: string) => void;

  /** Additional CSS class name */
  className?: string;

  /** Whether to show the favorite button (default: true) */
  showFavorite?: boolean;

  /** Disabled state */
  disabled?: boolean;
}

/**
 * ComponentCard component
 */
export function ComponentCard({
  component,
  isFavorite = false,
  onSelect,
  onToggleFavorite,
  className,
  showFavorite = true,
  disabled = false,
}: ComponentCardProps) {
  const handleCardClick = () => {
    if (!disabled) {
      onSelect(component.name);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite && !disabled) {
      onToggleFavorite(component.name);
    }
  };

  return (
    <div
      className={cn(
        'group relative bg-card rounded-lg border border-border',
        'p-4 hover:shadow-md transition-all duration-200',
        'cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={handleCardClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`Select ${component.name}`}
    >
      {/* Favorite Button */}
      {showFavorite && onToggleFavorite && (
        <button
          onClick={handleFavoriteClick}
          className={cn(
            'absolute top-3 right-3 p-1 rounded',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'transition-colors duration-150',
            'opacity-0 group-hover:opacity-100'
          )}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg
            className={cn(
              'w-5 h-5 transition-colors duration-150',
              isFavorite
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-none text-gray-400 hover:text-yellow-400'
            )}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      )}

      {/* Component Icon */}
      <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-lg bg-primary/10">
        {component.icon ? (
          <span className="text-2xl" role="img" aria-label={component.name}>
            {component.icon}
          </span>
        ) : (
          <svg
            className="w-6 h-6 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 3v18" />
          </svg>
        )}
      </div>

      {/* Component Name */}
      <h3 className="text-lg font-semibold mb-1 truncate" title={component.name}>
        {component.name}
      </h3>

      {/* Component Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3" title={component.description}>
        {component.description}
      </p>

      {/* Component Metadata */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {/* Version */}
        <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground">
          v{component.version}
        </span>

        {/* Category */}
        {component.category && (
          <span className="px-2 py-1 rounded bg-secondary/50">
            {component.category}
          </span>
        )}

        {/* Author */}
        {component.author && (
          <span className="truncate" title={component.author}>
            by {component.author}
          </span>
        )}
      </div>

      {/* Usage Stats (optional) */}
      {component.stats && component.stats.usageCount > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Used {component.stats.usageCount} {component.stats.usageCount === 1 ? 'time' : 'times'}
        </div>
      )}

      {/* Tags */}
      {component.tags && component.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {component.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {component.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
              +{component.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ComponentCard grid layout wrapper
 */
export interface ComponentCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

export function ComponentCardGrid({
  children,
  columns = 3,
  className,
}: ComponentCardGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        {
          'grid-cols-2': columns === 2,
          'grid-cols-3': columns === 3,
          'grid-cols-4': columns === 4,
          'grid-cols-5': columns === 5,
        },
        className
      )}
    >
      {children}
    </div>
  );
}
