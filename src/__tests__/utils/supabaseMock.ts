/**
 * Supabase 测试 Mock 工具
 * 用于模拟 Supabase 客户端的各种方法
 */

export const createSupabaseMock = () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  }

  const mockAuth = {
    getUser: jest.fn(),
    getSession: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
  }

  const mockStorage = {
    from: jest.fn().mockReturnValue({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
      createSignedUrl: jest.fn(),
    }),
  }

  const mockClient = {
    from: jest.fn().mockReturnValue(mockQuery),
    auth: mockAuth,
    storage: mockStorage,
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    }),
  }

  return {
    client: mockClient,
    query: mockQuery,
    auth: mockAuth,
    storage: mockStorage,
  }
}

/**
 * 模拟成功的查询响应
 */
export const mockQuerySuccess = <T>(data: T) => ({
  data,
  error: null,
})

/**
 * 模拟失败的查询响应
 */
export const mockQueryError = (message: string) => ({
  data: null,
  error: {
    message,
    details: '',
    hint: '',
    code: '500',
  },
})

/**
 * 模拟用户对象
 */
export const mockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  ...overrides,
})

/**
 * 模拟 Profile 对象
 */
export const mockProfile = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'teacher' as const,
  created_at: new Date().toISOString(),
  ...overrides,
})

/**
 * 模拟 Session 对象
 */
export const mockSession = (overrides = {}) => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser(),
  ...overrides,
})
