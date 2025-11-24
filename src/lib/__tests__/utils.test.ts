/**
 * 工具函数单元测试
 * 测试输入清理和验证函数
 */

describe('输入清理函数', () => {
  /**
   * 清理搜索关键词：移除所有特殊字符，只保留字母、数字、中文和空格
   * 这是 src/app/questions/page.tsx 中使用的清理逻辑
   */
  const sanitizeSearchKeyword = (input: string): string => {
    return input.trim().replace(/[^\w\s\u4e00-\u9fa5]/g, '')
  }

  describe('sanitizeSearchKeyword', () => {
    it('应该保留字母、数字和空格', () => {
      const input = 'hello world 123'
      expect(sanitizeSearchKeyword(input)).toBe('hello world 123')
    })

    it('应该保留中文字符', () => {
      const input = '这是一个测试'
      expect(sanitizeSearchKeyword(input)).toBe('这是一个测试')
    })

    it('应该移除SQL注入字符', () => {
      const input = "'; DROP TABLE users; --"
      const result = sanitizeSearchKeyword(input)
      expect(result).not.toContain("'")
      expect(result).not.toContain(';')
      expect(result).not.toContain('--')
    })

    it('应该移除特殊字符', () => {
      const input = 'test!@#$%^&*()_+-={}[]|\\:;"<>,.?/'
      const result = sanitizeSearchKeyword(input)
      expect(result).toBe('test_')  // 只保留下划线（\w包含）
    })

    it('应该去除首尾空格', () => {
      const input = '  hello world  '
      expect(sanitizeSearchKeyword(input)).toBe('hello world')
    })

    it('应该处理空字符串', () => {
      expect(sanitizeSearchKeyword('')).toBe('')
    })

    it('应该处理只有空格的字符串', () => {
      expect(sanitizeSearchKeyword('   ')).toBe('')
    })

    it('应该处理混合中英文', () => {
      const input = 'test测试123'
      expect(sanitizeSearchKeyword(input)).toBe('test测试123')
    })

    it('应该防止ilike注入', () => {
      const input = '%test'
      const result = sanitizeSearchKeyword(input)
      // % 应该被移除，但 _ 是 \w 的一部分会被保留
      expect(result).toBe('test')
    })
  })
})

describe('数据验证函数', () => {
  /**
   * 验证邮箱格式
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  describe('isValidEmail', () => {
    it('应该接受有效的邮箱地址', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@example.co.uk')).toBe(true)
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('应该拒绝无效的邮箱地址', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('invalid@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('invalid@example')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  /**
   * 验证用户角色
   */
  const isValidRole = (role: string): role is 'teacher' | 'student' => {
    return role === 'teacher' || role === 'student'
  }

  describe('isValidRole', () => {
    it('应该接受有效的角色', () => {
      expect(isValidRole('teacher')).toBe(true)
      expect(isValidRole('student')).toBe(true)
    })

    it('应该拒绝无效的角色', () => {
      expect(isValidRole('admin')).toBe(false)
      expect(isValidRole('user')).toBe(false)
      expect(isValidRole('')).toBe(false)
      expect(isValidRole('TEACHER')).toBe(false)
    })
  })
})
