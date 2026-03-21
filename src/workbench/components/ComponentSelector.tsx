/**
 * ComponentSelector - 组件选择器
 * 显示可用的组件列表，支持点击切换
 */

import { useState, useEffect } from 'react';
import { ChevronDown, Check, Package, Search } from 'lucide-react';
import { getComponentRegistryClient, type ComponentInfo } from '../registry';

export interface ComponentSelectorProps {
  /** 当前选中的组件名称 */
  value?: string;

  /** 选中组件时的回调 */
  onChange?: (componentName: string) => void;

  /** 是否禁用 */
  disabled?: boolean;

  /** 占位符文本 */
  placeholder?: string;

  /** 自定义类名 */
  className?: string;
}

export function ComponentSelector({
  value,
  onChange,
  disabled = false,
  placeholder = '选择组件',
  className = ''
}: ComponentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载组件列表
  useEffect(() => {
    const loadComponents = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const client = getComponentRegistryClient();
        const list = await client.list();
        setComponents(list);
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载组件列表失败';
        setError(message);
        console.error('Failed to load components:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadComponents();
  }, []);

  // 过滤组件
  const filteredComponents = components.filter(component => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      component.name.toLowerCase().includes(query) ||
      component.description.toLowerCase().includes(query)
    );
  });

  // 获取当前选中的组件
  const selectedComponent = components.find(c => c.name === value);

  // 处理选择
  const handleSelect = (componentName: string) => {
    onChange?.(componentName);
    setIsOpen(false);
  };

  return (
    <div className={`component-selector ${className}`}>
      {/* 下拉按钮 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2
          px-3 py-2 bg-white dark:bg-slate-800
          border border-slate-200 dark:border-slate-700
          rounded-lg text-left
          hover:border-slate-300 dark:hover:border-slate-600
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedComponent ? (
            <>
              <span className="text-lg">{selectedComponent.icon || <Package className="w-5 h-5 text-slate-400" />}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {selectedComponent.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {selectedComponent.description}
                </div>
              </div>
            </>
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {/* 搜索框 */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索组件..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900
                  border border-slate-200 dark:border-slate-700 rounded
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  text-slate-900 dark:text-slate-100
                  placeholder-slate-400"
              />
            </div>
          </div>

          {/* 组件列表 */}
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                加载中...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-500 dark:text-red-400">
                {error}
              </div>
            ) : filteredComponents.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {searchQuery ? '未找到匹配的组件' : '暂无可用组件'}
              </div>
            ) : (
              <div>
                {filteredComponents.map(component => (
                  <button
                    key={component.id}
                    type="button"
                    onClick={() => handleSelect(component.name)}
                    className={`
                      w-full px-3 py-2 flex items-center gap-2 text-left
                      hover:bg-slate-50 dark:hover:bg-slate-700/50
                      transition-colors
                      ${component.name === value ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    `}
                  >
                    <span className="text-lg flex-shrink-0">
                      {component.icon || <Package className="w-5 h-5 text-slate-400" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {component.name}
                        </span>
                        {component.name === value && (
                          <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {component.description}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        v{component.version}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 点击外部关闭 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * 组件列表卡片
 * 显示所有可用组件的卡片形式
 */
export interface ComponentListProps {
  /** 当前选中的组件名称 */
  value?: string;

  /** 选中组件时的回调 */
  onChange?: (componentName: string) => void;

  /** 是否禁用 */
  disabled?: boolean;

  /** 自定义类名 */
  className?: string;
}

export function ComponentList({
  value,
  onChange,
  disabled = false,
  className = ''
}: ComponentListProps) {
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComponents = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const client = getComponentRegistryClient();
        const list = await client.list();
        setComponents(list);
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载组件列表失败';
        setError(message);
        console.error('Failed to load components:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadComponents();
  }, []);

  const handleSelect = (componentName: string) => {
    if (!disabled) {
      onChange?.(componentName);
    }
  };

  return (
    <div className={`component-list ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          可用组件
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          选择一个组件来加载
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : components.length === 0 ? (
        <div className="p-4 text-center text-slate-500 dark:text-slate-400">
          暂无可用组件
        </div>
      ) : (
        <div className="space-y-2">
          {components.map(component => (
            <button
              key={component.id}
              type="button"
              onClick={() => handleSelect(component.name)}
              disabled={disabled}
              className={`
                w-full p-3 rounded-lg border text-left transition-all
                ${component.name === value
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">
                  {component.icon || <Package className="w-6 h-6 text-slate-400" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {component.name}
                    </span>
                    {component.name === value && (
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {component.description}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    v{component.version}
                    {component.author && ` · ${component.author}`}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
