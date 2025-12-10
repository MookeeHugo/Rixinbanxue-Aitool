/**
 * Timeout utilities for Promise-based operations
 * Prevents indefinite hanging by adding timeout protection to async operations
 */

/**
 * 为 Promise 添加超时保护
 * @param promise - 要执行的 Promise
 * @param ms - 超时时间（毫秒）
 * @param errorMessage - 超时错误信息
 * @returns 带超时保护的 Promise
 * @throws Error - 如果操作超时
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetch('https://api.example.com/data'),
 *   5000,
 *   'API 请求超时'
 * );
 * ```
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = `操作超时 (${ms}ms)`
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Supabase 专用超时包装器（默认 10 秒）
 * 用于包装所有 Supabase 数据库和认证操作
 *
 * @param promise - Supabase 操作 Promise
 * @param ms - 超时时间（毫秒），默认 10000ms (10秒)
 * @returns 带超时保护的 Promise
 * @throws Error - 如果 Supabase 操作超时
 *
 * @example
 * ```typescript
 * const { data } = await withSupabaseTimeout(
 *   supabase.from('users').select('*'),
 *   10000
 * );
 * ```
 */
export function withSupabaseTimeout<T>(
  promise: Promise<T>,
  ms = 10000
): Promise<T> {
  return withTimeout(promise, ms, 'Supabase 请求超时');
}

/**
 * Supabase 超时重试（默认重试 1 次，500ms 退避），用于偶发延迟的场景
 */
export async function withSupabaseRetry<T>({
  factory,
  timeoutMs = 10000,
  retries = 1,
  backoffMs = 500
}: {
  factory: () => Promise<T>;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
}): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withSupabaseTimeout(factory(), timeoutMs);
    } catch (error) {
      lastError = error;
      // 仅在超时或网络类错误时重试，其他错误直接抛出
      const message = error instanceof Error ? error.message : String(error);
      const isTimeout = message.includes('Supabase 请求超时') || message.includes('timeout');
      if (!isTimeout || attempt === retries) {
        throw error;
      }
      if (backoffMs > 0) {
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
