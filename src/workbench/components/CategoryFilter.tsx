/**
 * Workbench CategoryFilter Component
 *
 * Category filter dropdown for component list.
 */

import React from 'react';
import type { ComponentCategory } from '../types/component-list';
import { cn } from '../../lib/utils';

/**
 * Category filter props
 */
export interface CategoryFilterProps {
  /** Selected category */
  value: ComponentCategory | 'all';

  /** Callback when category changes */
  onChange: (category: ComponentCategory | 'all') => void;

  /** Available categories (default: all predefined categories) */
  categories?: (ComponentCategory | 'all')[];

  /** Additional CSS class name */
  className?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Variant style */
  variant?: 'dropdown' | 'tabs';
}

/**
 * Category display names
 */
const CATEGORY_NAMES: Record<ComponentCategory | 'all', string> = {
  all: 'All Components',
  productivity: 'Productivity',
  files: 'Files',
  data: 'Data',
  communication: 'Communication',
  utilities: 'Utilities',
  developer: 'Developer',
  media: 'Media',
  other: 'Other',
};

/**
 * Default categories
 */
const DEFAULT_CATEGORIES: (ComponentCategory | 'all')[] = [
  'all',
  'productivity',
  'files',
  'data',
  'communication',
  'utilities',
  'developer',
  'media',
  'other',
];

/**
 * CategoryFilter component - Dropdown variant
 */
export function CategoryFilter({
  value,
  onChange,
  categories = DEFAULT_CATEGORIES,
  className,
  disabled = false,
  variant = 'dropdown',
}: CategoryFilterProps) {
  if (variant === 'tabs') {
    return <CategoryTabs value={value} onChange={onChange} categories={categories} disabled={disabled} className={className} />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as ComponentCategory | 'all');
  };

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'appearance-none',
          'bg-background border border-input rounded-md',
          'px-3 py-2 pr-10',
          'text-sm text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all duration-200'
        )}
        aria-label="Filter by category"
      >
        {categories.map((category) => (
          <option key={category} value={category}>
            {CATEGORY_NAMES[category]}
          </option>
        ))}
      </select>

      {/* Dropdown Arrow */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="w-4 h-4 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

/**
 * CategoryTabs component
 * Tab-style category filter
 */
export interface CategoryTabsProps {
  value: ComponentCategory | 'all';
  onChange: (category: ComponentCategory | 'all') => void;
  categories?: (ComponentCategory | 'all')[];
  disabled?: boolean;
  className?: string;
}

export function CategoryTabs({
  value,
  onChange,
  categories = DEFAULT_CATEGORIES,
  disabled = false,
  className,
}: CategoryTabsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 overflow-x-auto',
        'bg-secondary rounded-lg p-1',
        'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600',
        className
      )}
      role="tablist"
    >
      {categories.map((category) => {
        const isActive = value === category;

        return (
          <button
            key={category}
            onClick={() => !disabled && onChange(category)}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap',
              'transition-all duration-150',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            role="tab"
            aria-selected={isActive}
            aria-label={`Filter by ${CATEGORY_NAMES[category]}`}
          >
            {CATEGORY_NAMES[category]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * CategoryChips component
 * Chip-style category filter for mobile or compact layouts
 */
export interface CategoryChipsProps {
  value: ComponentCategory | 'all';
  onChange: (category: ComponentCategory | 'all') => void;
  categories?: (ComponentCategory | 'all')[];
  disabled?: boolean;
  className?: string;
}

export function CategoryChips({
  value,
  onChange,
  categories = DEFAULT_CATEGORIES,
  disabled = false,
  className,
}: CategoryChipsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-2',
        className
      )}
      role="tablist"
    >
      {categories.map((category) => {
        const isActive = value === category;

        return (
          <button
            key={category}
            onClick={() => !disabled && onChange(category)}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium',
              'border transition-all duration-150',
              isActive
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:border-primary/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            role="tab"
            aria-selected={isActive}
            aria-label={`Filter by ${CATEGORY_NAMES[category]}`}
          >
            {CATEGORY_NAMES[category]}
          </button>
        );
      })}
    </div>
  );
}
