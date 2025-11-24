/**
 * 认证模块单元测试
 * 测试 src/lib/server/auth.ts 中的认证相关函数
 */

import { requireTeacher, requireStudent, requireAuth } from '../auth'
import type { AuthenticatedUser } from '../auth'

describe('认证辅助函数', () => {
  describe('requireTeacher', () => {
    it('应该在用户是教师时返回 true', () => {
      const user: AuthenticatedUser = {
        id: 'test-id',
        email: 'teacher@test.com',
        role: 'teacher',
        name: 'Test Teacher',
      }

      expect(requireTeacher(user)).toBe(true)
    })

    it('应该在用户是学生时返回 false', () => {
      const user: AuthenticatedUser = {
        id: 'test-id',
        email: 'student@test.com',
        role: 'student',
        name: 'Test Student',
      }

      expect(requireTeacher(user)).toBe(false)
    })

    it('应该在用户为 null 时返回 false', () => {
      expect(requireTeacher(null)).toBe(false)
    })
  })

  describe('requireStudent', () => {
    it('应该在用户是学生时返回 true', () => {
      const user: AuthenticatedUser = {
        id: 'test-id',
        email: 'student@test.com',
        role: 'student',
        name: 'Test Student',
      }

      expect(requireStudent(user)).toBe(true)
    })

    it('应该在用户是教师时返回 false', () => {
      const user: AuthenticatedUser = {
        id: 'test-id',
        email: 'teacher@test.com',
        role: 'teacher',
        name: 'Test Teacher',
      }

      expect(requireStudent(user)).toBe(false)
    })

    it('应该在用户为 null 时返回 false', () => {
      expect(requireStudent(null)).toBe(false)
    })
  })

  describe('requireAuth', () => {
    it('应该在用户已登录时返回 true', () => {
      const user: AuthenticatedUser = {
        id: 'test-id',
        email: 'user@test.com',
        role: 'teacher',
        name: 'Test User',
      }

      expect(requireAuth(user)).toBe(true)
    })

    it('应该在教师已登录时返回 true', () => {
      const teacher: AuthenticatedUser = {
        id: 'test-id',
        email: 'teacher@test.com',
        role: 'teacher',
        name: 'Test Teacher',
      }

      expect(requireAuth(teacher)).toBe(true)
    })

    it('应该在学生已登录时返回 true', () => {
      const student: AuthenticatedUser = {
        id: 'test-id',
        email: 'student@test.com',
        role: 'student',
        name: 'Test Student',
      }

      expect(requireAuth(student)).toBe(true)
    })

    it('应该在用户为 null 时返回 false', () => {
      expect(requireAuth(null)).toBe(false)
    })
  })
})

describe('认证类型定义', () => {
  it('AuthenticatedUser 应该包含所有必需字段', () => {
    const user: AuthenticatedUser = {
      id: 'test-id',
      email: 'test@example.com',
      role: 'teacher',
      name: 'Test User',
    }

    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('email')
    expect(user).toHaveProperty('role')
    expect(user).toHaveProperty('name')
  })

  it('role 字段应该只允许 teacher 或 student', () => {
    const teacher: AuthenticatedUser = {
      id: 'test-id',
      email: 'test@example.com',
      role: 'teacher',
      name: 'Test User',
    }

    const student: AuthenticatedUser = {
      id: 'test-id',
      email: 'test@example.com',
      role: 'student',
      name: 'Test User',
    }

    expect(['teacher', 'student']).toContain(teacher.role)
    expect(['teacher', 'student']).toContain(student.role)
  })
})
