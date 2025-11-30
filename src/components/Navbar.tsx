"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentProfile, signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import { logger } from '@/lib/logger'
export default function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()

    // 监听 Supabase auth 状态变化，确保登录/登出时导航栏自动更新
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // 用户登录，重新加载 profile
          await loadProfile()
        } else if (event === 'SIGNED_OUT') {
          // 用户登出，清除 profile
          setProfile(null)
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const loadProfile = async () => {
    try {
      const data = await getCurrentProfile()
      setProfile(data)
    } catch (error) {
      logger.error('Failed to load profile:', { error: error })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setProfile(null)

      // 清理所有本地存储，避免状态污染
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()

        // 使用完全刷新而非客户端路由，确保应用完全重置
        // 这可以解决退出登录后静态资源404的问题
        window.location.href = '/login'
      }
    } catch (error) {
      logger.error('Failed to sign out:', { error: error })
      alert('退出登录失败，请重试')
    }
  }

  return (
    <header className="rx-header">
      <div className="rx-container">
        <div className="flex items-center justify-between">
          <Link href="/" className="rx-logo">
            日新教学平台
          </Link>

          <nav className="rx-nav">
            {profile ? (
              <>
                {profile.role === 'teacher' && (
                  <>
                    <Link href="/tools/ingest">开始录题</Link>
                    <Link href="/questions">题库管理</Link>
                    <Link href="/papers">智能组卷</Link>
                    <Link href="/assignments">作业管理</Link>
                    <Link href="/classes">班级管理</Link>
                    <Link href="/teacher-analytics">教学分析</Link>
                  </>
                )}
                {profile.role === 'student' && (
                  <>
                    <Link href="/my-assignments">我的作业</Link>
                    <Link href="/my-mistakes">错题本</Link>
                    <Link href="/analytics">学情分析</Link>
                  </>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/80">
                    {profile.name} ({profile.role === 'teacher' ? '教师' : '学生'})
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-sm rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
                  >
                    退出登录
                  </button>
                </div>
              </>
            ) : (
              <>
                {!loading && (
                  <>
                    <Link href="/login" className="px-4 py-2 text-sm rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200">
                      登录
                    </Link>
                    <Link href="/register" className="px-4 py-2 text-sm rounded-lg bg-accent-500 text-white hover:bg-accent-600 transition-all duration-200">
                      注册
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
