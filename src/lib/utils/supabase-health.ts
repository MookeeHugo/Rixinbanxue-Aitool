/**
 * Supabase 健康检查工具
 * 用于在应用启动时检查 Supabase 服务是否可用
 */

/**
 * 检查 Supabase 服务是否可用
 * 通过发送 HEAD 请求到 Supabase REST API 来检查服务状态
 *
 * @returns Promise<boolean> - true 表示服务可用，false 表示服务不可用
 *
 * @example
 * ```typescript
 * const isAvailable = await checkSupabaseHealth();
 * if (!isAvailable) {
 *   console.error('Supabase 服务不可用');
 * }
 * ```
 */
export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url) {
      console.warn('[Health Check] NEXT_PUBLIC_SUPABASE_URL 未设置')
      return false
    }

    // 检查健康端点（3 秒超时）
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(`${url}/rest/v1/`, {
      signal: controller.signal,
      method: 'HEAD',
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch (error) {
    // 网络错误、超时或其他问题
    console.warn('[Health Check] Supabase 服务检查失败:', error instanceof Error ? error.message : String(error))
    return false
  }
}
