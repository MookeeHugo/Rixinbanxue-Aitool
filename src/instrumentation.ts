export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('./lib/logger');

    // 处理未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('[process] Unhandled Promise Rejection',
        reason instanceof Error ? reason : new Error(String(reason)),
        {
          promise: String(promise),
          reason: String(reason)
        }
      );

      if (process.env.NODE_ENV === 'development') {
        console.error('\n========================================');
        console.error('检测到未处理的 Promise 拒绝');
        console.error('========================================');
        console.error('原因:', reason);
        console.error('========================================\n');
      }
    });

    // 处理未捕获的异常
    process.on('uncaughtException', (error: Error) => {
      logger.error('[process] Uncaught Exception', error, {
        stack: error.stack
      });

      if (process.env.NODE_ENV === 'development') {
        console.error('\n========================================');
        console.error('检测到未捕获的异常');
        console.error('========================================');
        console.error('错误:', error.message);
        console.error('堆栈:', error.stack);
        console.error('========================================\n');
      } else {
        console.error('发生致命错误，正在优雅关闭');
        process.exit(1);
      }
    });

    console.log('[instrumentation] 全局错误处理器已安装');
  }
}
