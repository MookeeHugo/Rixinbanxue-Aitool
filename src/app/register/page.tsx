"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth'
import type { UserRole } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<UserRole>('teacher')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证密码
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少为6位')
      return
    }

    setLoading(true)

    try {
      await signUp({ email, password, name, role })
      // 注册成功后跳转到登录页
      router.push('/login?registered=true')
    } catch (err: any) {
      setError(err.message || '注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rx-card">
          <h1 className="text-2xl font-bold mb-6 text-center">注册 - 日新教学平台</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                姓名
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rx-input"
                placeholder="张老师"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rx-input"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="rx-input"
                placeholder="至少6位"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                确认密码
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="rx-input"
                placeholder="再次输入密码"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-2">
                角色
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="rx-select"
                disabled={loading}
              >
                <option value="teacher">教师</option>
                <option value="student">学生</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rx-btn rx-btn-primary py-3"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted">
              已有账号？
              <Link href="/login" className="text-primary hover:underline ml-1">
                点击登录
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
