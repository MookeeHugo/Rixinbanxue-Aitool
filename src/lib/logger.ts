/**
 * 日志系统
 * 统一的日志收集和管理
 */

import { ErrorLevel, BaseAppError } from './errors';

// 日志级别
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// 日志条目
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: BaseAppError;
  userId?: string;
  sessionId?: string;
}

// 日志传输器接口
export interface LogTransport {
  log(entry: LogEntry): void | Promise<void>;
}

/**
 * 控制台日志传输器
 */
class ConsoleTransport implements LogTransport {
  log(entry: LogEntry): void {
    const prefix = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(message, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.context);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.context, entry.error);
        break;
    }
  }
}

/**
 * Supabase 日志传输器
 * 将日志发送到 Supabase 数据库
 */
class SupabaseTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;
  private readonly maxBufferSize = 10;
  private readonly flushIntervalMs = 5000; // 5秒

  constructor() {
    // 定期清空缓冲区
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  log(entry: LogEntry): void {
    // 只记录警告和错误到远程
    if (entry.level === LogLevel.WARN || entry.level === LogLevel.ERROR) {
      this.buffer.push(entry);

      // 如果缓冲区满了，立即清空
      if (this.buffer.length >= this.maxBufferSize) {
        this.flush();
      }
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      // 发送日志到服务器
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries }),
      });
    } catch (error) {
      logger.error('Failed to send logs to server:', { error: error });
      // 失败时不重新加入缓冲区，避免无限累积
    }
  }

  destroy(): void {
    clearInterval(this.flushInterval);
    this.flush(); // 最后一次清空
  }
}

/**
 * Logger 类
 */
export class Logger {
  private transports: LogTransport[] = [];
  private context: Record<string, any> = {};
  private userId?: string;
  private sessionId?: string;

  constructor() {
    // 默认添加控制台传输器
    this.addTransport(new ConsoleTransport());

    // 在浏览器环境且非开发环境添加 Supabase 传输器
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.addTransport(new SupabaseTransport());
    }
  }

  /**
   * 添加日志传输器
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /**
   * 设置全局上下文
   */
  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string | undefined): void {
    this.userId = userId;
  }

  /**
   * 设置会话ID
   */
  setSessionId(sessionId: string | undefined): void {
    this.sessionId = sessionId;
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: BaseAppError): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: { ...this.context, ...context },
      error,
      userId: this.userId,
      sessionId: this.sessionId,
    };

    // 发送到所有传输器
    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (transportError) {
        logger.error('Error in log transport:', { error: transportError });
      }
    }
  }

  /**
   * Debug 日志
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info 日志
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning 日志
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error 日志
   */
  error(message: string, error?: BaseAppError | Error, context?: Record<string, any>): void {
    const appError = error instanceof BaseAppError ? error : undefined;
    this.log(LogLevel.ERROR, message, context, appError);
  }

  /**
   * 创建子 Logger（带独立上下文）
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger();
    childLogger.transports = this.transports;
    childLogger.context = { ...this.context, ...context };
    childLogger.userId = this.userId;
    childLogger.sessionId = this.sessionId;
    return childLogger;
  }
}

// 全局单例 Logger
let globalLogger: Logger | null = null;

/**
 * 获取全局 Logger 实例
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

/**
 * 便捷方法
 */
export const logger = {
  debug: (message: string, context?: Record<string, any>) => getLogger().debug(message, context),
  info: (message: string, context?: Record<string, any>) => getLogger().info(message, context),
  warn: (message: string, context?: Record<string, any>) => getLogger().warn(message, context),
  error: (message: string, error?: BaseAppError | Error, context?: Record<string, any>) =>
    getLogger().error(message, error, context),
  child: (context: Record<string, any>) => getLogger().child(context),
  setContext: (context: Record<string, any>) => getLogger().setContext(context),
  setUserId: (userId: string | undefined) => getLogger().setUserId(userId),
  setSessionId: (sessionId: string | undefined) => getLogger().setSessionId(sessionId),
};

/**
 * 性能日志工具
 */
export class PerformanceLogger {
  private startTime: number;
  private marks: Map<string, number> = new Map();
  private logger: Logger;

  constructor(private operation: string, context?: Record<string, any>) {
    this.logger = getLogger().child({ operation, ...context });
    this.startTime = performance.now();
    this.logger.debug(`Started: ${operation}`);
  }

  /**
   * 标记检查点
   */
  mark(name: string): void {
    const elapsed = performance.now() - this.startTime;
    this.marks.set(name, elapsed);
    this.logger.debug(`Checkpoint: ${name}`, { elapsed: `${elapsed.toFixed(2)}ms` });
  }

  /**
   * 结束并记录性能
   */
  end(success = true): void {
    const totalTime = performance.now() - this.startTime;
    const marks = Object.fromEntries(this.marks);

    this.logger.info(`Completed: ${this.operation}`, {
      success,
      totalTime: `${totalTime.toFixed(2)}ms`,
      marks,
    });
  }

  /**
   * 结束并记录错误
   */
  endWithError(error: Error): void {
    const totalTime = performance.now() - this.startTime;

    this.logger.error(`Failed: ${this.operation}`, error, {
      totalTime: `${totalTime.toFixed(2)}ms`,
    });
  }
}

/**
 * 性能监控装饰器（用于包装函数）
 */
export function withPerformanceLogging<T extends (...args: unknown[]) => unknown>(
  fn: T,
  operationName?: string
): T {
  return ((...args: Parameters<T>) => {
    const perfLogger = new PerformanceLogger(operationName || fn.name);

    try {
      const result = fn(...args);

      // 如果是 Promise，等待完成后记录
      if (result instanceof Promise) {
        return result
          .then(value => {
            perfLogger.end(true);
            return value;
          })
          .catch(error => {
            perfLogger.endWithError(error);
            throw error;
          });
      }

      // 同步函数直接记录
      perfLogger.end(true);
      return result;
    } catch (error: unknown) {
      perfLogger.endWithError(error);
      throw error;
    }
  }) as T;
}
