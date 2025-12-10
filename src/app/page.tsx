"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import type { Profile } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { checkSupabaseHealth } from '@/lib/utils/supabase-health'
export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [supabaseAvailable, setSupabaseAvailable] = useState<boolean | null>(null)

  const loadProfile = useCallback(async () => {
    try {
      setError(null) // 重置错误状态
      const data = await getCurrentProfile()
      setProfile(data)
    } catch (error) {
      logger.error('Failed to load profile:', { error: error })
      // 设置错误状态，显示给用户
      setError(error instanceof Error ? error.message : '加载用户信息失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 先检查 Supabase 是否可用
    checkSupabaseHealth().then((available) => {
      setSupabaseAvailable(available)
      if (!available) {
        setError('无法连接到数据库服务，请确保服务已启动')
        setLoading(false)
      } else {
        loadProfile()
      }
    })

    // 15 秒后如果还在加载，显示超时提示
    const timer = setTimeout(() => {
      if (loading) {
        setLoadingTimeout(true)
      }
    }, 15000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 错误状态 - 显示错误信息和重试按钮
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="text-error text-lg mb-4">⚠️ {error}</div>
          {supabaseAvailable === false && (
            <div className="mb-4 p-4 bg-muted rounded-lg text-left">
              <p className="text-sm text-foreground-secondary mb-2">
                数据库服务未启动，请在项目根目录运行:
              </p>
              <code className="block bg-background px-3 py-2 rounded text-sm font-mono">
                npx supabase start
              </code>
            </div>
          )}
          <button
            onClick={() => {
              setLoading(true)
              setError(null)
              setSupabaseAvailable(null)
              window.location.reload()
            }}
            className="rx-btn rx-btn-primary"
          >
            重新检查
          </button>
        </div>
      </div>
    )
  }

  // 加载超时提示
  if (loading && loadingTimeout) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center">
          <div className="text-muted mb-4">加载时间过长...</div>
          <p className="text-sm text-foreground-secondary mb-4">
            可能是网络问题或服务未启动
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rx-btn rx-btn-primary"
          >
            刷新页面
          </button>
        </div>
      </div>
    )
  }

  // 未登录状态 - 显示欢迎页
  if (!loading && !profile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold mb-4">欢迎使用日新教学平台</h1>
          <p className="text-xl text-muted mb-8">
            智能组卷 · 自动批改 · 学情分析
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login" className="rx-btn rx-btn-primary px-8 py-3 text-lg">
              立即登录
            </Link>
            <Link href="/register" className="rx-btn px-8 py-3 text-lg">
              免费注册
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted">加载中...</div>
      </div>
    )
  }

  // 已登录 - 教师端仪表盘
  if (profile?.role === 'teacher') {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">教师工作台</h1>
        <div className="rx-grid">
          <section className="rx-card">
            <h2 className="text-xl font-semibold mb-2">开始录题</h2>
            <p className="rx-muted mb-4">使用 AI 智能识别试卷，快速录入题目</p>
            <div className="flex gap-2">
              <Link href="/tools/ingest" className="rx-btn rx-btn-primary">
                开始录题
              </Link>
            </div>
          </section>

          <section className="rx-card">
            <h2 className="text-xl font-semibold mb-2">题库管理</h2>
            <p className="rx-muted mb-4">管理您的题目库，支持选择题、填空题、解答题</p>
            <div className="flex gap-2">
              <Link href="/questions" className="rx-btn rx-btn-primary">
                进入题库
              </Link>
            </div>
          </section>

          <section className="rx-card bg-gradient-to-br from-forest-50 to-forest-100 border-forest-300">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              🤖 AI创作数学题
              <span className="text-xs px-2 py-0.5 bg-forest-500 text-white rounded-full">NEW</span>
            </h2>
            <p className="rx-muted mb-4">使用DeepSeek AI自动生成专业数学题和配图</p>
            <div className="flex gap-2">
              <Link href="/ai-creator/new" className="rx-btn rx-btn-primary">
                开始创作
              </Link>
              <Link href="/ai-creator" className="rx-btn">
                管理创作
              </Link>
            </div>
          </section>

          <section className="rx-card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              📱 小红书AI分析
              <span className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded-full">NEW</span>
            </h2>
            <p className="rx-muted mb-4">爬取爆款帖子，AI分析+智能重写，打造教师IP</p>
            <div className="flex gap-2">
              <Link href="/xiaohongshu" className="rx-btn rx-btn-primary">
                开始分析
              </Link>
            </div>
          </section>

          <section className="rx-card">
            <h2 className="text-xl font-semibold mb-2">智能组卷</h2>
            <p className="rx-muted mb-4">根据知识点和难度智能生成试卷</p>
            <div className="flex gap-2">
              <Link href="/papers" className="rx-btn rx-btn-primary">
                开始组卷
              </Link>
            </div>
          </section>

          <section className="rx-card">
            <h2 className="text-xl font-semibold mb-2">作业管理</h2>
            <p className="rx-muted mb-4">发布作业、批改作业、查看提交情况</p>
            <div className="flex gap-2">
              <Link href="/assignments" className="rx-btn rx-btn-primary">
                管理作业
              </Link>
            </div>
          </section>

          <section className="rx-card">
            <h2 className="text-xl font-semibold mb-2">班级管理</h2>
            <p className="rx-muted mb-4">管理您的班级和学生信息</p>
            <div className="flex gap-2">
              <Link href="/classes" className="rx-btn rx-btn-primary">
                我的班级
              </Link>
            </div>
          </section>

          <section className="rx-card">
            <h2 className="text-xl font-semibold mb-2">直播课堂</h2>
            <p className="rx-muted mb-4">创建在线直播课堂</p>
            <div className="flex gap-2">
              <Link href="/live/new" className="rx-btn rx-btn-primary">创建课堂</Link>
              <Link href="/live" className="rx-btn">查看列表</Link>
            </div>
          </section>

          <section className="rx-card">
            <h2 className="text-xl font-semibold mb-2">学情分析</h2>
            <p className="rx-muted mb-4">查看学生的学习情况和薄弱知识点</p>
            <div className="flex gap-2">
              <span className="rx-badge">即将上线</span>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // 已登录 - 学生端仪表盘
  if (profile?.role === 'student') {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">学生学习中心</h1>
        <div className="rx-grid">
          <section className="rx-card">
            <h2 className="text-xl font-semibold mb-2">我的作业</h2>
            <p className="rx-muted mb-4">查看和完成老师布置的作业</p>
            <div className="flex gap-2">
              <Link href="/my-assignments" className="rx-btn rx-btn-primary">
                查看作业
              </Link>
            </div>
          </section>

          <section className="rx-card">
            <h2 className="text-xl font-semibold mb-2">错题本</h2>
            <p className="rx-muted mb-4">复习您做错的题目</p>
            <div className="flex gap-2">
              <Link href="/my-mistakes" className="rx-btn rx-btn-primary">
                查看错题
              </Link>
            </div>
          </section>

          <section className="rx-card">
            <h2 className="text-xl font-semibold mb-2">我的班级</h2>
            <p className="rx-muted mb-4">查看班级信息</p>
            <div className="flex gap-2">
              <Link href="/my-classes" className="rx-btn rx-btn-primary">
                进入班级
              </Link>
            </div>
          </section>

          <section className="rx-card">
            <h2 className="text-xl font-semibold mb-2">学习报告</h2>
            <p className="rx-muted mb-4">查看您的学习进度和知识点掌握情况</p>
            <div className="flex gap-2">
              <span className="rx-badge">即将上线</span>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return null
}

