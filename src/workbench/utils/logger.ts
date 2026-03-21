/**
 * Logger Utilities
 * 结构化日志记录器
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export type LogEntry = {
  level: LogLevel;
  levelName: string;
  message: string;
  timestamp: number;
  context?: string;
  data?: unknown;
  error?: Error;
};

export type LoggerConfig = {
  level: LogLevel;
  enabled?: boolean;
  prefix?: string;
  context?: string;
  maxEntries?: number;
};

/**
 * Logger 类
 */
export class Logger {
  private config: LoggerConfig;
  private history: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      prefix: '[Workbench]',
      maxEntries: 1000,
      ...config
    };
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 设置上下文
   */
  setContext(context: string): Logger {
    return new Logger({ ...this.config, context });
  }

  /**
   * Debug 级别日志
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info 级别日志
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warn 级别日志
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error 级别日志
   */
  error(message: string, error?: Error | unknown, data?: unknown): void {
    const errorObj = error instanceof Error ? error : undefined;
    const errorData = error instanceof Error ? data : error;

    this.log(LogLevel.ERROR, message, errorData, errorObj);
  }

  /**
   * 记录日志
   */
  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    error?: Error
  ): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      levelName: LogLevel[level],
      message,
      timestamp: Date.now(),
      context: this.config.context,
      data,
      error
    };

    // 添加到历史记录
    this.history.push(entry);
    if (this.config.maxEntries && this.history.length > this.config.maxEntries) {
      this.history.shift();
    }

    // 输出到控制台
    if (this.config.enabled !== false) {
      this.outputToConsole(entry);
    }
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = this.config.prefix || '';
    const context = entry.context ? `[${entry.context}]` : '';
    const timestamp = new Date(entry.timestamp).toISOString();

    const message = `${prefix}${context} ${timestamp} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.error || entry.data);
        break;
    }
  }

  /**
   * 获取历史记录
   */
  getHistory(): LogEntry[] {
    return [...this.history];
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * 创建子 Logger
   */
  child(context: string): Logger {
    return new Logger({
      ...this.config,
      context: this.config.context ? `${this.config.context}:${context}` : context
    });
  }
}

/**
 * 默认 Logger 实例
 */
export const logger = new Logger();

/**
 * 创建命名 Logger
 */
export function createLogger(name: string): Logger {
  return logger.child(name);
}

/**
 * 从环境变量获取日志级别
 */
export function getLogLevelFromEnv(): LogLevel {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    return LogLevel.INFO;
  }

  const level = process.env.LOG_LEVEL?.toUpperCase();
  switch (level) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'NONE':
      return LogLevel.NONE;
    default:
      return LogLevel.INFO;
  }
}
