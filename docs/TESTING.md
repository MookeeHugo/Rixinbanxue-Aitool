# 单元测试指南

本项目使用 Jest + React Testing Library 进行单元测试。

## 📚 目录

- [快速开始](#快速开始)
- [运行测试](#运行测试)
- [编写测试](#编写测试)
- [测试工具](#测试工具)
- [最佳实践](#最佳实践)

---

## 🚀 快速开始

### 安装依赖

依赖已配置好，运行以下命令安装：

```bash
npm install
```

### 运行测试

```bash
# 运行所有单元测试
npm test

# 监听模式（开发时推荐）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 只运行单元测试（不包括 E2E）
npm run test:unit

# 运行所有测试（单元测试 + E2E）
npm run test:all
```

---

## 📋 测试结构

### 目录组织

```
src/
├── lib/
│   ├── __tests__/           # lib 目录的测试
│   │   └── utils.test.ts
│   └── server/
│       ├── __tests__/       # server 模块的测试
│       │   └── auth.test.ts
│       └── auth.ts
├── components/
│   ├── __tests__/           # 组件测试
│   │   └── Button.test.tsx
│   └── ui/
│       └── button.tsx
└── __tests__/
    └── utils/               # 测试工具（不会被执行）
        ├── supabaseMock.ts
        └── nextMock.ts
```

### 测试命名

- 测试文件：`*.test.ts` 或 `*.test.tsx`
- 测试工具：放在 `__tests__/utils/` 目录

---

## ✏️ 编写测试

### 1. 函数测试示例

```typescript
// src/lib/__tests__/utils.test.ts
describe('工具函数', () => {
  describe('sanitize', () => {
    it('应该移除特殊字符', () => {
      const input = "'; DROP TABLE users; --"
      const result = sanitize(input)

      expect(result).not.toContain("'")
      expect(result).not.toContain(';')
    })
  })
})
```

### 2. React 组件测试示例

```typescript
// src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button 组件', () => {
  it('应该渲染按钮文本', () => {
    render(<Button>点击我</Button>)
    expect(screen.getByText('点击我')).toBeInTheDocument()
  })

  it('应该响应点击事件', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>点击我</Button>)

    fireEvent.click(screen.getByText('点击我'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### 3. 认证测试示例

```typescript
// src/lib/server/__tests__/auth.test.ts
import { requireTeacher } from '../auth'

describe('requireTeacher', () => {
  it('应该在用户是教师时返回 true', () => {
    const user = {
      id: 'test-id',
      email: 'teacher@test.com',
      role: 'teacher' as const,
      name: 'Test Teacher',
    }

    expect(requireTeacher(user)).toBe(true)
  })
})
```

---

## 🛠️ 测试工具

### Supabase Mock

用于模拟 Supabase 客户端：

```typescript
import { createSupabaseMock, mockQuerySuccess } from '@/__tests__/utils/supabaseMock'

// 创建 Mock
const { client, query } = createSupabaseMock()

// 模拟成功响应
query.single.mockResolvedValue(mockQuerySuccess({ id: '123', name: 'Test' }))

// 模拟失败响应
query.single.mockResolvedValue(mockQueryError('Not found'))
```

### Next.js 请求 Mock

用于模拟 API 路由请求：

```typescript
import { createMockRequest, createAuthenticatedRequest } from '@/__tests__/utils/nextMock'

// 创建普通请求
const req = createMockRequest({
  url: 'http://localhost:3000/api/test',
  method: 'POST',
  body: { data: 'test' },
})

// 创建带认证的请求
const authReq = createAuthenticatedRequest('user-id', {
  method: 'GET',
})
```

---

## ✅ 最佳实践

### 1. 测试组织

- ✅ 使用 `describe` 分组相关测试
- ✅ 使用清晰的测试描述
- ✅ 每个 `it` 块只测试一个功能点

```typescript
describe('功能模块', () => {
  describe('子功能', () => {
    it('应该在正常情况下工作', () => {
      // 测试代码
    })

    it('应该在错误情况下抛出异常', () => {
      // 测试代码
    })
  })
})
```

### 2. AAA 模式

- **Arrange（准备）**：设置测试数据和环境
- **Act（执行）**：执行被测试的代码
- **Assert（断言）**：验证结果

```typescript
it('应该计算总价', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }]

  // Act
  const total = calculateTotal(items)

  // Assert
  expect(total).toBe(30)
})
```

### 3. Mock 使用

- ✅ 只 Mock 外部依赖（API、数据库等）
- ✅ 不要 Mock 被测试的代码
- ✅ 在 `beforeEach` 中重置 Mock

```typescript
describe('API 测试', () => {
  let mockFetch: jest.Mock

  beforeEach(() => {
    mockFetch = jest.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    jest.restoreMocks()
  })

  it('应该调用 API', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => ({}) })
    await fetchData()
    expect(mockFetch).toHaveBeenCalled()
  })
})
```

### 4. 异步测试

```typescript
it('应该加载数据', async () => {
  // 使用 async/await
  const data = await loadData()
  expect(data).toBeDefined()
})

it('应该处理错误', async () => {
  // 测试异常
  await expect(loadInvalidData()).rejects.toThrow('Invalid data')
})
```

### 5. 组件测试

```typescript
it('应该显示加载状态', async () => {
  render(<AsyncComponent />)

  // 检查加载状态
  expect(screen.getByText('加载中...')).toBeInTheDocument()

  // 等待数据加载
  await waitFor(() => {
    expect(screen.getByText('数据已加载')).toBeInTheDocument()
  })
})
```

---

## 📊 覆盖率目标

当前覆盖率目标（`jest.config.ts`）：

```typescript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
}
```

查看详细覆盖率报告：

```bash
npm run test:coverage
# 打开 coverage/lcov-report/index.html 查看详情
```

---

## 🔧 配置文件

### jest.config.ts

Jest 主配置文件，包含：
- 测试环境配置（jsdom）
- 路径别名（@/）
- 忽略规则
- 覆盖率设置

### jest.setup.ts

测试环境设置文件，包含：
- Testing Library 扩展
- 环境变量 Mock
- 全局 Mock（window.matchMedia 等）

---

## 🎯 常用断言

```typescript
// 相等断言
expect(value).toBe(expected)          // 严格相等
expect(value).toEqual(expected)       // 深度相等

// 真值断言
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeDefined()
expect(value).toBeNull()

// 数字断言
expect(number).toBeGreaterThan(3)
expect(number).toBeLessThanOrEqual(5)

// 字符串断言
expect(string).toContain('substring')
expect(string).toMatch(/regex/)

// 数组断言
expect(array).toContain(item)
expect(array).toHaveLength(3)

// 对象断言
expect(object).toHaveProperty('key')
expect(object).toMatchObject({ key: 'value' })

// 函数断言
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledTimes(1)
expect(mockFn).toHaveBeenCalledWith(arg1, arg2)

// DOM 断言（Testing Library）
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toBeDisabled()
expect(element).toHaveClass('className')
expect(element).toHaveAttribute('attr', 'value')
```

---

## 📚 相关资源

- [Jest 官方文档](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library 查询指南](https://testing-library.com/docs/queries/about/)
- [Jest Mock 函数](https://jestjs.io/docs/mock-functions)

---

## 🐛 调试技巧

### 1. 查看渲染结果

```typescript
import { screen, debug } from '@testing-library/react'

it('调试测试', () => {
  render(<Component />)
  screen.debug()  // 打印整个 DOM
  screen.debug(screen.getByRole('button'))  // 打印特定元素
})
```

### 2. 只运行单个测试

```typescript
it.only('只运行这个测试', () => {
  // 测试代码
})

describe.only('只运行这个测试组', () => {
  // 测试代码
})
```

### 3. 跳过测试

```typescript
it.skip('跳过这个测试', () => {
  // 测试代码
})
```

---

**最后更新**: 2025-11-23
**测试框架**: Jest 30.2.0 + React Testing Library 16.3.0
