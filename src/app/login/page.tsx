"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn({ email, password })
      const session = await supabase.auth.getSession()

      // 将 session 传给后端，写入 HttpOnly cookie，便于 SSR/RSC 读取
      if (session.data.session) {
        const { access_token, refresh_token, expires_at } = session.data.session
        const response = await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token, refresh_token, expires_at }),
        })
        if (!response.ok) {
          console.error('同步服务端 session 失败')
        }
      }

      router.push('/') // 登录成功后跳转到首页
    } catch (err: any) {
      logger.error('登录失败', { error: err })
      setError(err.message || '登录失败，请检查邮箱和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rx-card">
          <h1 className="text-2xl font-bold mb-6 text-center">登录 - 日新教学平台</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="rx-input"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rx-btn rx-btn-primary py-3"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted">
              还没有账号？
              <Link href="/register" className="text-primary hover:underline ml-1">
                点击注册
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
