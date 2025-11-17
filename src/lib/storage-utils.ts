/**
 * 提取 Cloudflare R2 / CDN URL 中的对象 key，便于删除或签名访问。
 * 兼容形式：
 * - https://cdn.xxx.com/public/questions/img.png
 * - https://r2.xxx.com/questions/img.png
 * - questions/img.png
 */
export function extractR2KeyFromUrl(url?: string | null): string {
  if (!url) return ''

  // 已经是 key
  if (!url.startsWith('http')) {
    return trimKey(url)
  }

  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.replace(/^\/+/, '').split('/')

    // CDN 会带有 public 前缀
    if (segments[0] === 'public') {
      return trimKey(segments.slice(1).join('/'))
    }

    return trimKey(segments.join('/'))
  } catch {
    return trimKey(url)
  }
}

function trimKey(key: string) {
  return key.replace(/^\/+/, '')
}
