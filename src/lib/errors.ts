import { logger } from '@/lib/logger'

/**
 * 统一错误处理框架
 * 定义标准错误类型和处理逻辑
 */

// 错误级别
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// 错误类别
export enum ErrorCategory {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

// 标准错误接口
export interface AppError {
  code: string;
  message: string;
  category: ErrorCategory;
  level: ErrorLevel;
  details?: unknown;
  userMessage?: string; // 用户友好的错误消息
  recoverable?: boolean; // 是否可恢复
  timestamp: Date;
  stack?: string;
}

/**
 * 自定义错误基类
 */
export class BaseAppError extends Error implements AppError {
  code: string;
  category: ErrorCategory;
  level: ErrorLevel;
  details?: unknown;
  userMessage?: string;
  recoverable: boolean;
  timestamp: Date;

  constructor(
    code: string,
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    level: ErrorLevel = ErrorLevel.ERROR,
    options: {
      details?: unknown;
      userMessage?: string;
      recoverable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.level = level;
    this.details = options.details;
    this.userMessage = options.userMessage || message;
    this.recoverable = options.recoverable ?? true;
    this.timestamp = new Date();

    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      level: this.level,
      details: this.details,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * 网络错误
 */
export class NetworkError extends BaseAppError {
  constructor(message: string, details?: unknown) {
    super(
      'NETWORK_ERROR',
      message,
      ErrorCategory.NETWORK,
      ErrorLevel.ERROR,
      {
        details,
        userMessage: '网络连接失败，请检查您的网络设置',
        recoverable: true,
      }
    );
  }
}

/**
 * 认证错误
 */
export class AuthError extends BaseAppError {
  constructor(message: string, details?: unknown) {
    super(
      'AUTH_ERROR',
      message,
      ErrorCategory.AUTH,
      ErrorLevel.ERROR,
      {
        details,
        userMessage: '认证失败，请重新登录',
        recoverable: false,
      }
    );
  }
}

/**
 * 权限错误
 */
export class PermissionError extends BaseAppError {
  constructor(message: string, details?: unknown) {
    super(
      'PERMISSION_ERROR',
      message,
      ErrorCategory.PERMISSION,
      ErrorLevel.WARNING,
      {
        details,
        userMessage: '您没有权限执行此操作',
        recoverable: false,
      }
    );
  }
}

/**
 * 验证错误
 */
export class ValidationError extends BaseAppError {
  constructor(message: string, details?: unknown) {
    super(
      'VALIDATION_ERROR',
      message,
      ErrorCategory.VALIDATION,
      ErrorLevel.WARNING,
      {
        details,
        userMessage: '输入数据不合法，请检查后重试',
        recoverable: true,
      }
    );
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends BaseAppError {
  constructor(resource: string, id?: string) {
    super(
      'NOT_FOUND',
      `Resource not found: ${resource}${id ? ` (${id})` : ''}`,
      ErrorCategory.NOT_FOUND,
      ErrorLevel.WARNING,
      {
        details: { resource, id },
        userMessage: `未找到请求的${resource}`,
        recoverable: false,
      }
    );
  }
}

/**
 * 服务器错误
 */
export class ServerError extends BaseAppError {
  constructor(message: string, statusCode?: number, details?: unknown) {
    super(
      'SERVER_ERROR',
      message,
      ErrorCategory.SERVER,
      ErrorLevel.ERROR,
      {
        details: {
          ...(details && typeof details === 'object' ? details : {}),
          statusCode
        },
        userMessage: '服务器错误，请稍后重试',
        recoverable: true,
      }
    );
  }
}

/**
 * 将未知错误转换为 AppError
 */
export function toAppError(error: unknown): BaseAppError {
  // 如果已经是 AppError，直接返回
  if (error instanceof BaseAppError) {
    return error;
  }

  // 如果是标准 Error
  if (error instanceof Error) {
    // 网络错误
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new NetworkError(error.message, { originalError: error });
    }

    // 认证错误
    if (error.message.includes('unauthorized') || error.message.includes('token')) {
      return new AuthError(error.message, { originalError: error });
    }

    // 通用错误
    return new BaseAppError(
      'UNKNOWN_ERROR',
      error.message,
      ErrorCategory.UNKNOWN,
      ErrorLevel.ERROR,
      {
        details: { originalError: error },
        userMessage: '发生未知错误，请稍后重试',
      }
    );
  }

  // 字符串错误
  if (typeof error === 'string') {
    return new BaseAppError(
      'UNKNOWN_ERROR',
      error,
      ErrorCategory.UNKNOWN,
      ErrorLevel.ERROR,
      {
        userMessage: error,
      }
    );
  }

  // 完全未知的错误
  return new BaseAppError(
    'UNKNOWN_ERROR',
    'An unknown error occurred',
    ErrorCategory.UNKNOWN,
    ErrorLevel.ERROR,
    {
      details: { error },
      userMessage: '发生未知错误',
    }
  );
}

/**
 * HTTP 响应错误处理
 */
export async function handleApiError(response: Response): Promise<never> {
  let errorData: Record<string, unknown>;

  try {
    errorData = await response.json();
  } catch {
    errorData = { message: response.statusText };
  }

  const message = (typeof errorData.error === 'string' ? errorData.error : null) ||
                  (typeof errorData.message === 'string' ? errorData.message : null) ||
                  'API request failed';
  const details = {
    status: response.status,
    url: response.url,
    ...errorData,
  };

  // 根据状态码分类
  switch (response.status) {
    case 401:
      throw new AuthError(message, details);
    case 403:
      throw new PermissionError(message, details);
    case 404:
      throw new NotFoundError('resource', typeof errorData.id === 'string' ? errorData.id : undefined);
    case 422:
      throw new ValidationError(message, details);
    case 500:
    case 502:
    case 503:
    case 504:
      throw new ServerError(message, response.status, details);
    default:
      throw new BaseAppError(
        `HTTP_${response.status}`,
        message,
        ErrorCategory.UNKNOWN,
        ErrorLevel.ERROR,
        {
          details,
          userMessage: '请求失败，请稍后重试',
        }
      );
  }
}

/**
 * 错误处理器配置
 */
export interface ErrorHandlerConfig {
  onError?: (error: BaseAppError) => void;
  showNotification?: (message: string, level: ErrorLevel) => void;
  logToServer?: boolean;
}

let globalErrorHandlerConfig: ErrorHandlerConfig = {};

/**
 * 配置全局错误处理器
 */
export function configureErrorHandler(config: ErrorHandlerConfig) {
  globalErrorHandlerConfig = { ...globalErrorHandlerConfig, ...config };
}

/**
 * 处理错误
 */
export function handleError(error: unknown): BaseAppError {
  const appError = toAppError(error);

  // 调用全局错误处理器
  if (globalErrorHandlerConfig.onError) {
    try {
      globalErrorHandlerConfig.onError(appError);
    } catch (handlerError) {
      logger.error('Error in error handler:', { error: handlerError });
    }
  }

  // 显示通知
  if (globalErrorHandlerConfig.showNotification && appError.userMessage) {
    try {
      globalErrorHandlerConfig.showNotification(appError.userMessage, appError.level);
    } catch (notificationError) {
      logger.error('Error showing notification:', { error: notificationError });
    }
  }

  // 记录到控制台
  console.error('[Error Handler]', appError.toJSON());

  return appError;
}

/**
 * 包装异步函数，自动处理错误
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: {
    silent?: boolean; // 是否静默处理错误
    fallback?: unknown; // 错误时的fallback值
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = handleError(error);

      if (options.silent) {
        return options.fallback;
      }

      throw appError;
    }
  }) as T;
}

/**
 * 错误重试包装器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    shouldRetry?: (error: BaseAppError) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    shouldRetry = (error) => error.recoverable,
  } = options;

  let lastError: BaseAppError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = toAppError(error);

      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt || !shouldRetry(lastError)) {
        throw lastError;
      }

      // 指数退避
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
