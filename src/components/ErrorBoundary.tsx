/**
 * React 错误边界组件
 * 捕获组件树中的渲染错误并提供友好的错误UI
 */

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { BaseAppError, toAppError, ErrorLevel } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: (error: BaseAppError, reset: () => void) => ReactNode;
  onError?: (error: BaseAppError, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: BaseAppError | null;
}

/**
 * 错误边界组件
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新状态以触发降级UI的渲染
    return {
      hasError: true,
      error: toAppError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const appError = toAppError(error);

    // 记录错误到日志系统
    logger.error('React Error Boundary caught an error', appError, {
      componentStack: errorInfo.componentStack,
    });

    // 调用自定义错误处理器
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // 默认错误UI
      return (
        <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}

/**
 * 默认错误降级UI
 */
function DefaultErrorFallback({ error, onReset }: {
  error: BaseAppError;
  onReset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-xl p-6">
        {/* 错误图标 */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* 错误标题 */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          出错了
        </h2>

        {/* 错误消息 */}
        <p className="text-gray-400 text-center mb-6">
          {error.userMessage || error.message}
        </p>

        {/* 错误详情（开发环境） */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 bg-slate-900/50 rounded p-3">
            <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
              技术详情
            </summary>
            <div className="mt-2 text-xs text-gray-500 font-mono space-y-2">
              <div>
                <div className="text-gray-400">错误代码:</div>
                <div className="text-red-400">{error.code}</div>
              </div>
              <div>
                <div className="text-gray-400">错误类型:</div>
                <div className="text-red-400">{error.category}</div>
              </div>
              <div>
                <div className="text-gray-400">消息:</div>
                <div className="text-red-400">{error.message}</div>
              </div>
              {error.stack && (
                <div>
                  <div className="text-gray-400">堆栈跟踪:</div>
                  <pre className="text-red-400 overflow-auto max-h-40 text-[10px] mt-1">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            重试
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            返回首页
          </button>
        </div>

        {/* 帮助文本 */}
        <p className="text-xs text-gray-500 text-center mt-4">
          如果问题持续存在，请
          <a href="/support" className="text-blue-400 hover:text-blue-300 ml-1">
            联系支持
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * 简化的错误边界（用于局部组件）
 */
export function SimpleErrorBoundary({
  children,
  fallbackMessage = '此部分内容加载失败',
}: {
  children: ReactNode;
  fallbackMessage?: string;
}) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-500"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-200 font-medium">{fallbackMessage}</p>
              {error.userMessage && (
                <p className="text-xs text-red-300 mt-1">{error.userMessage}</p>
              )}
              <button
                onClick={reset}
                className="text-xs text-red-400 hover:text-red-300 mt-2 underline"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * 用于包装async组件的错误边界
 */
export function AsyncErrorBoundary({
  children,
  loadingFallback,
  errorFallback,
}: {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: (error: BaseAppError, reset: () => void) => ReactNode;
}) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <React.Suspense
        fallback={
          loadingFallback || (
            <div className="flex items-center justify-center p-8">
              <div className="text-gray-400">加载中...</div>
            </div>
          )
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}
