/**
 * Workbench SearchInput Component
 *
 * Search input field for filtering components.
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

/**
 * SearchInput props
 */
export interface SearchInputProps {
  /** Search query value */
  value: string;

  /** Callback when search query changes */
  onChange: (query: string) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Additional CSS class name */
  className?: string;

  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;

  /** Whether to show clear button (default: true) */
  showClear?: boolean;

  /** Disabled state */
  disabled?: boolean;
}

/**
 * SearchInput component
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search components...',
  className,
  debounceMs = 300,
  showClear = true,
  disabled = false,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(localValue);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [localValue, debounceMs, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Escape key clears the search
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div
      className={cn(
        'relative flex items-center',
        'bg-background border border-input rounded-md',
        'focus-within:ring-2 focus-within:ring-ring focus-within:border-ring',
        'transition-all duration-200',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Search Icon */}
      <svg
        className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>

      {/* Input Field */}
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full pl-10 pr-10 py-2 bg-transparent',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'outline-none',
          disabled && 'cursor-not-allowed'
        )}
        aria-label="Search components"
      />

      {/* Clear Button */}
      {showClear && localValue && !disabled && (
        <button
          onClick={handleClear}
          className={cn(
            'absolute right-2 p-1 rounded',
            'hover:bg-secondary text-muted-foreground hover:text-foreground',
            'transition-colors duration-150'
          )}
          aria-label="Clear search"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * SearchBar component
 * Combines search input with optional filters
 */
export interface SearchBarProps extends SearchInputProps {
  /** Total number of results */
  resultCount?: number;

  /** Whether to show result count (default: false) */
  showResultCount?: boolean;
}

export function SearchBar({
  resultCount,
  showResultCount = false,
  ...searchInputProps
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Search Input */}
      <div className="flex-1">
        <SearchInput {...searchInputProps} />
      </div>

      {/* Result Count */}
      {showResultCount && resultCount !== undefined && (
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {resultCount} {resultCount === 1 ? 'result' : 'results'}
        </div>
      )}
    </div>
  );
}
