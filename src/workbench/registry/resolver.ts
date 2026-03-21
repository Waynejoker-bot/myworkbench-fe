/**
 * Component Reference Resolver
 *
 * 组件引用解析器
 * 负责解析聊天输入中的组件引用（如 @component-name）
 */

import type { ParseResult } from './types';

/**
 * 组件引用正则表达式
 * 匹配 @component-name 格式，其中组件名可以包含字母、数字、连字符和下划线
 */
const COMPONENT_REF_REGEX = /@([a-zA-Z0-9_-]+)/g;

/**
 * 解析输入中的组件引用
 *
 * @example
 * ```ts
 * // 单个组件引用
 * parseComponentReference("使用 @file-browser 查看文件")
 * // => { component: "file-browser", remainingText: "使用  查看文件", originalText: "..." }
 *
 * // 多个组件引用（返回第一个）
 * parseComponentReference("使用 @file-browser 和 @hello-world")
 * // => { component: "file-browser", remainingText: "使用  和 @hello-world", originalText: "..." }
 *
 * // 没有组件引用
 * parseComponentReference("这是一条普通消息")
 * // => { remainingText: "这是一条普通消息", originalText: "..." }
 * ```
 *
 * @param text - 输入文本
 * @returns 解析结果
 */
export function parseComponentReference(text: string): ParseResult {
  const match = COMPONENT_REF_REGEX.exec(text);

  if (match && match[1]) {
    const componentName = match[1];
    const fullMatch = match[0];

    // 移除组件引用，保留剩余文本
    const remainingText = text.replace(fullMatch, '').trim();

    return {
      component: componentName,
      remainingText,
      originalText: text
    };
  }

  return {
    remainingText: text,
    originalText: text
  };
}

/**
 * 解析输入中的所有组件引用
 *
 * @example
 * ```ts
 * parseAllComponentReferences("使用 @file-browser 和 @hello-world")
 * // => ["file-browser", "hello-world"]
 * ```
 *
 * @param text - 输入文本
 * @returns 组件名称数组
 */
export function parseAllComponentReferences(text: string): string[] {
  const matches = Array.from(text.matchAll(COMPONENT_REF_REGEX));
  const componentNames = new Set<string>();

  for (const match of matches) {
    if (match[1]) {
      componentNames.add(match[1]);
    }
  }

  return Array.from(componentNames);
}

/**
 * 检查文本中是否包含组件引用
 *
 * @param text - 输入文本
 * @returns 是否包含组件引用
 */
export function hasComponentReference(text: string): boolean {
  return COMPONENT_REF_REGEX.test(text);
}

/**
 * 从文本中移除所有组件引用
 *
 * @param text - 输入文本
 * @returns 移除组件引用后的文本
 */
export function removeComponentReferences(text: string): string {
  return text.replace(COMPONENT_REF_REGEX, '').trim();
}

/**
 * 替换文本中的组件引用为显示文本
 *
 * @param text - 输入文本
 * @param replacement - 替换文本或替换函数
 * @returns 替换后的文本
 */
export function replaceComponentReferences(
  text: string,
  replacement: string | ((componentName: string) => string)
): string {
  return text.replace(COMPONENT_REF_REGEX, (_, componentName) => {
    if (typeof replacement === 'function') {
      return replacement(componentName);
    }
    return replacement;
  });
}

/**
 * 验证组件名称是否有效
 *
 * @param name - 组件名称
 * @returns 是否有效
 */
export function isValidComponentName(name: string): boolean {
  // 组件名称只能包含字母、数字、连字符和下划线
  const validNameRegex = /^[a-zA-Z0-9_-]+$/;

  // 必须以字母开头
  const startsWithLetter = /^[a-zA-Z]/.test(name);

  return validNameRegex.test(name) && startsWithLetter;
}

/**
 * 规范化组件名称
 *
 * @param name - 组件名称
 * @returns 规范化后的组件名称
 */
export function normalizeComponentName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * 解析组件 ID
 * 组件 ID 格式：com.workbench.{name}
 *
 * @param id - 组件 ID
 * @returns 组件名称，如果格式无效则返回 null
 */
export function parseComponentId(id: string): string | null {
  const prefix = 'com.workbench.';

  if (id.startsWith(prefix)) {
    return id.slice(prefix.length);
  }

  return null;
}

/**
 * 生成组件 ID
 *
 * @param name - 组件名称
 * @returns 组件 ID
 */
export function generateComponentId(name: string): string {
  return `com.workbench.${name}`;
}

/**
 * 组件引用解析器类
 */
export class ComponentReferenceResolver {
  /**
   * 解析单个组件引用
   */
  parse(text: string): ParseResult {
    return parseComponentReference(text);
  }

  /**
   * 解析所有组件引用
   */
  parseAll(text: string): string[] {
    return parseAllComponentReferences(text);
  }

  /**
   * 检查是否包含组件引用
   */
  hasReference(text: string): boolean {
    return hasComponentReference(text);
  }

  /**
   * 移除组件引用
   */
  remove(text: string): string {
    return removeComponentReferences(text);
  }

  /**
   * 替换组件引用
   */
  replace(
    text: string,
    replacement: string | ((componentName: string) => string)
  ): string {
    return replaceComponentReferences(text, replacement);
  }

  /**
   * 验证组件名称
   */
  isValidName(name: string): boolean {
    return isValidComponentName(name);
  }

  /**
   * 规范化组件名称
   */
  normalizeName(name: string): string {
    return normalizeComponentName(name);
  }

  /**
   * 解析组件 ID
   */
  parseId(id: string): string | null {
    return parseComponentId(id);
  }

  /**
   * 生成组件 ID
   */
  generateId(name: string): string {
    return generateComponentId(name);
  }
}

/**
 * 创建默认的组件引用解析器
 */
export function createComponentReferenceResolver(): ComponentReferenceResolver {
  return new ComponentReferenceResolver();
}
