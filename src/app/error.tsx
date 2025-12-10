'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('[App Error Boundary]', error, {
      digest: error.digest,
      stack: error.stack
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rx-card p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-error"
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

        <h2 className="text-2xl font-bold mb-3">页面加载失败</h2>
        <p className="text-foreground-secondary mb-6">
          抱歉，页面出现了问题。请尝试刷新页面或返回首页。
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 bg-muted rounded-lg p-4 text-left">
            <summary className="text-sm font-medium cursor-pointer hover:text-primary">
              开发者信息
            </summary>
            <div className="mt-3 text-xs font-mono space-y-2">
              <div>
                <div className="text-foreground-tertiary">错误信息:</div>
                <div className="text-error">{error.message}</div>
              </div>
              {error.digest && (
                <div>
                  <div className="text-foreground-tertiary">错误ID:</div>
                  <div className="text-error">{error.digest}</div>
                </div>
              )}
              {error.stack && (
                <div>
                  <div className="text-foreground-tertiary">堆栈跟踪:</div>
                  <pre className="text-error overflow-auto max-h-40 text-[10px] mt-1 bg-background p-2 rounded">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        <div className="flex gap-3">
          <button onClick={reset} className="flex-1 rx-btn rx-btn-primary">
            重新加载
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 rx-btn"
          >
            返回首页
          </button>
        </div>

        <p className="text-xs text-foreground-tertiary mt-6">
          如果问题持续存在，请联系技术支持
        </p>
      </div>
    </div>
  );
}
