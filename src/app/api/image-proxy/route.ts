import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientId } from '@/lib/server/rate-limit'
import { withTimeout } from '@/lib/utils/timeout'

const DEFAULT_ALLOWLIST = ['http://127.0.0.1:54321/storage/']
const allowlistFromEnv = (process.env.IMAGE_PROXY_ALLOWLIST || '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean)
const ALLOWLIST = [...DEFAULT_ALLOWLIST, ...allowlistFromEnv]
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB

function isUrlAllowed(url: string): boolean {
  return ALLOWLIST.some(prefix => url.startsWith(prefix))
}

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url')

  if (!imageUrl) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 })
  }

  const clientId = getClientId(request)
  const rate = checkRateLimit(`image-proxy:${clientId}`, { limit: 30, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': Math.ceil(rate.retryAfterMs / 1000).toString() } }
    )
  }

  if (!isUrlAllowed(imageUrl)) {
    return NextResponse.json(
      { error: '非法 URL：仅允许代理受信任的存储地址' },
      { status: 403 }
    )
  }

  try {
    const response = await withTimeout(
      fetch(imageUrl, {
        headers: { Accept: 'image/*' },
      }),
      10_000,
      '上游请求超时'
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: `上游请求失败: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const lengthHeader = response.headers.get('content-length')
    if (lengthHeader && Number(lengthHeader) > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: '图片体积过大，已拒绝代理（上限 5MB）' },
        { status: 413 }
      )
    }

    const blob = await response.blob()
    if (blob.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: '图片体积过大，已拒绝代理（上限 5MB）' },
        { status: 413 }
      )
    }

    const contentType = response.headers.get('Content-Type') || 'image/png'

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: '代理请求失败',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
