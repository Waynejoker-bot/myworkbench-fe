/**
 * Validator Utilities
 * 数据验证工具
 */

import type { ComponentManifest } from '../types/component';

/**
 * 验证 URL 格式
 * 支持绝对 URL (http/https) 和相对路径（包括纯文件名）
 */
export function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  // 空字符串无效
  if (value.length === 0) return false;

  // 检查是否是相对路径（以 / 开头、以 ./ 开头、以 ../ 开头，或纯文件名）
  if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../') || !value.includes('/')) {
    return true;
  }

  // 检查是否是绝对 URL
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 验证 UUID 格式
 */
export function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * 验证 Email 格式
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * 验证版本号格式 (semver)
 */
export function isValidVersion(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
  return semverRegex.test(value);
}

/**
 * 验证 JSON
 */
export function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证是否为纯对象
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * 验证是否为数组
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * 验证是否为函数
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * 验证是否为 Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'then' in value &&
    isFunction((value as { then: unknown }).then)
  );
}

/**
 * 验证消息来源
 */
export function isValidMessageSource(value: unknown): boolean {
  return value === 'chatbox' || value === 'workbench' || value === 'component';
}

/**
 * 验证组件清单
 */
export function isComponentManifest(value: unknown): value is ComponentManifest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof (value as ComponentManifest).name === 'string' &&
    'version' in value &&
    typeof (value as ComponentManifest).version === 'string' &&
    'description' in value &&
    typeof (value as ComponentManifest).description === 'string' &&
    'author' in value &&
    typeof (value as ComponentManifest).author === 'string' &&
    'entry' in value &&
    typeof (value as ComponentManifest).entry === 'string' &&
    'capabilities' in value &&
    typeof (value as ComponentManifest).capabilities === 'object'
  );
}

/**
 * 验证消息目标
 */
export function isValidMessageTarget(value: unknown): boolean {
  return (
    value === 'broadcast' ||
    value === 'chatbox' ||
    value === 'workbench' ||
    value === 'component'
  );
}

/**
 * 验证角色
 */
export function isValidRole(value: unknown): value is 'user' | 'assistant' | 'system' {
  return value === 'user' || value === 'assistant' || value === 'system';
}

/**
 * 验证通知级别
 */
export function isValidNotificationLevel(
  value: unknown
): value is 'info' | 'success' | 'warning' | 'error' {
  return (
    value === 'info' ||
    value === 'success' ||
    value === 'warning' ||
    value === 'error'
  );
}

/**
 * Schema 验证器
 */
export class SchemaValidator<T extends Record<string, unknown>> {
  private schema: {
    [K in keyof T]?: {
      required?: boolean;
      validate?: (value: unknown) => boolean;
      defaultValue?: T[K];
      transform?: (value: unknown) => T[K];
    };
  };

  constructor(
    schema: {
      [K in keyof T]?: {
        required?: boolean;
        validate?: (value: unknown) => boolean;
        defaultValue?: T[K];
        transform?: (value: unknown) => T[K];
      };
    }
  ) {
    this.schema = schema;
  }

  /**
   * 验证数据
   */
  validate(data: unknown): { valid: boolean; errors: string[]; data?: T } {
    const errors: string[] = [];

    if (!isPlainObject(data)) {
      return { valid: false, errors: ['Data must be an object'] };
    }

    const result: Partial<T> = {};

    // 验证所有字段
    for (const [key, fieldSchema] of Object.entries(this.schema)) {
      const value = (data as Record<string, unknown>)[key];
      const schema = fieldSchema as {
        required?: boolean;
        validate?: (value: unknown) => boolean;
        defaultValue?: T[keyof T];
        transform?: (value: unknown) => T[keyof T];
      };

      // 检查必填字段
      if (schema.required && value === undefined) {
        errors.push(`Field "${key}" is required`);
        continue;
      }

      // 使用默认值
      if (value === undefined && schema.defaultValue !== undefined) {
        (result as Record<string, unknown>)[key] = schema.defaultValue;
        continue;
      }

      // 跳过可选字段
      if (value === undefined) {
        continue;
      }

      // 运值验证
      if (schema.validate && !schema.validate(value)) {
        errors.push(`Field "${key}" is invalid`);
        continue;
      }

      // 转换值
      const finalValue = schema.transform ? schema.transform(value) : value;
      (result as Record<string, unknown>)[key] = finalValue;
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, errors: [], data: result as T };
  }

  /**
   * 验证并抛出错误
   */
  validateOrThrow(data: unknown): T {
    const result = this.validate(data);

    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors.join(', ')}`);
    }

    return result.data!;
  }
}

/**
 * 创建范围验证器
 */
export function createRangeValidator(
  min: number,
  max: number,
  inclusive = true
): (value: unknown) => boolean {
  return (value: unknown) => {
    if (typeof value !== 'number') return false;
    if (inclusive) {
      return value >= min && value <= max;
    }
    return value > min && value < max;
  };
}

/**
 * 创建枚举验证器
 */
export function createEnumValidator<T extends string>(
  values: readonly T[]
): (value: unknown) => value is T {
  const valueSet = new Set(values);
  return (value: unknown): value is T => {
    return typeof value === 'string' && valueSet.has(value as T);
  };
}

/**
 * 创建长度验证器
 */
export function createLengthValidator(
  minLength?: number,
  maxLength?: number
): (value: unknown) => boolean {
  return (value: unknown) => {
    if (typeof value !== 'string' && !Array.isArray(value)) return false;

    const length = Array.isArray(value) ? value.length : (value as string).length;

    if (minLength !== undefined && length < minLength) return false;
    if (maxLength !== undefined && length > maxLength) return false;

    return true;
  };
}

/**
 * 创建正则验证器
 */
export function createRegexValidator(regex: RegExp): (value: unknown) => boolean {
  return (value: unknown) => {
    return typeof value === 'string' && regex.test(value);
  };
}
