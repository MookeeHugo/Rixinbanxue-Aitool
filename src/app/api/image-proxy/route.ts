import { NextRequest, NextResponse } from 'next/server'

/**
 * 图片代理API - 解决浏览器CORS和安全策略问题
 *
 * 使用场景：
 * - Supabase Storage签名URL在浏览器中无法直接加载
 * - 绕过CORS、CSP等浏览器安全策略
 *
 * 使用方法：
 * <img src="/api/image-proxy?url=http://127.0.0.1:54321/storage/..." />
 */
export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url')

  if (!imageUrl) {
    return NextResponse.json(
      { error: 'Missing URL parameter' },
      { status: 400 }
    )
  }

  // 安全检查：只允许代理本地Supabase Storage URL
  if (!imageUrl.startsWith('http://127.0.0.1:54321/storage/')) {
    return NextResponse.json(
      { error: 'Invalid URL: only Supabase Storage URLs are allowed' },
      { status: 403 }
    )
  }

  try {
    console.log('[Image Proxy] 代理图片请求:', {
      imageUrl: imageUrl.substring(0, 100) + '...',
      timestamp: new Date().toISOString()
    })

    const response = await fetch(imageUrl, {
      headers: {
        // 转发必要的头部
        'Accept': 'image/*'
      }
    })

    if (!response.ok) {
      console.error('[Image Proxy] 上游请求失败:', {
        status: response.status,
        statusText: response.statusText,
        url: imageUrl.substring(0, 100)
      })

      return NextResponse.json(
        {
          error: `Failed to fetch image: ${response.status} ${response.statusText}`
        },
        { status: response.status }
      )
    }

    // 获取图片数据
    const blob = await response.blob()
    const contentType = response.headers.get('Content-Type') || 'image/png'

    console.log('[Image Proxy] ✅ 图片代理成功:', {
      contentType,
      size: blob.size,
      url: imageUrl.substring(0, 100) + '...'
    })

    // 返回图片，添加CORS头
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch (error) {
    console.error('[Image Proxy] ❌ 代理失败:', {
      error: error instanceof Error ? error.message : String(error),
      url: imageUrl.substring(0, 100) + '...'
    })

    return NextResponse.json(
      {
        error: 'Internal server error while proxying image',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// 支持OPTIONS预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
