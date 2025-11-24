/**
 * Next.js 请求/响应测试 Mock 工具
 */

import { NextRequest } from 'next/server'

/**
 * 创建模拟的 NextRequest 对象
 */
export const createMockRequest = (options: {
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: any
  cookies?: Record<string, string>
} = {}): NextRequest => {
  const {
    url = 'http://localhost:3000/api/test',
    method = 'GET',
    headers = {},
    body,
    cookies = {},
  } = options

  const req = new NextRequest(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  })

  // Mock cookies
  if (Object.keys(cookies).length > 0) {
    const cookieStore = {
      get: jest.fn((name: string) => ({
        name,
        value: cookies[name] || null,
      })),
      getAll: jest.fn(() =>
        Object.entries(cookies).map(([name, value]) => ({
          name,
          value,
        }))
      ),
      set: jest.fn(),
      delete: jest.fn(),
    }

    ;(req as any).cookies = cookieStore
  }

  return req
}

/**
 * 创建带认证的请求
 */
export const createAuthenticatedRequest = (
  userId: string,
  options: Parameters<typeof createMockRequest>[0] = {}
) => {
  const session = {
    access_token: 'mock-access-token',
    user: {
      id: userId,
      email: 'test@example.com',
    },
  }

  return createMockRequest({
    ...options,
    headers: {
      authorization: `Bearer mock-access-token`,
      ...options.headers,
    },
    cookies: {
      'sb-auth-token': encodeURIComponent(JSON.stringify(session)),
      ...options.cookies,
    },
  })
}

/**
 * 模拟 cookies() 函数（用于 Server Components）
 */
export const mockCookies = (cookieData: Record<string, string> = {}) => {
  return {
    get: jest.fn((name: string) => ({
      name,
      value: cookieData[name],
    })),
    getAll: jest.fn(() =>
      Object.entries(cookieData).map(([name, value]) => ({
        name,
        value,
      }))
    ),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn((name: string) => name in cookieData),
  }
}
