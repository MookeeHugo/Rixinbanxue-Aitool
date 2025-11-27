"use client"

import { logger } from '@/lib/logger'

export default function DebugEnvPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'undefined'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'undefined'

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">环境变量调试页面</h1>

        <div className="rx-card mb-4">
          <h2 className="text-xl font-semibold mb-4">Supabase 配置</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">NEXT_PUBLIC_SUPABASE_URL:</label>
              <code className="block p-3 bg-gray-800 rounded text-sm break-all">
                {supabaseUrl}
              </code>
              <p className="mt-2 text-sm">
                {supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost') ? (
                  <span className="text-green-400">✅ 使用本地 Supabase</span>
                ) : supabaseUrl.includes('supabase.co') ? (
                  <span className="text-red-400">❌ 使用云端 Supabase</span>
                ) : (
                  <span className="text-yellow-400">⚠️ 未定义</span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">NEXT_PUBLIC_SUPABASE_ANON_KEY:</label>
              <code className="block p-3 bg-gray-800 rounded text-sm break-all">
                {supabaseKey.substring(0, 50)}...
              </code>
              <p className="mt-2 text-sm">
                {supabaseKey.includes('supabase-demo') ? (
                  <span className="text-green-400">✅ 本地开发密钥</span>
                ) : supabaseKey !== 'undefined' ? (
                  <span className="text-yellow-400">⚠️ 自定义密钥</span>
                ) : (
                  <span className="text-red-400">❌ 未定义</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rx-card">
          <h2 className="text-xl font-semibold mb-4">浏览器 LocalStorage</h2>
          <button
            onClick={() => {
              const keys = Object.keys(localStorage)
              const supabaseKeys = keys.filter(k => k.includes('supabase') || k.includes('sb-'))
              const result = supabaseKeys.map(k => ({
                key: k,
                value: localStorage.getItem(k)?.substring(0, 100) + '...'
              }))
              logger.debug('Supabase localStorage:', result)
              alert(`找到 ${supabaseKeys.length} 个 Supabase 相关的 localStorage 键，详情请查看控制台`)
            }}
            className="rx-btn rx-btn-primary mb-4"
          >
            检查 LocalStorage
          </button>

          <button
            onClick={() => {
              const keys = Object.keys(localStorage)
              const supabaseKeys = keys.filter(k => k.includes('supabase') || k.includes('sb-'))
              supabaseKeys.forEach(k => localStorage.removeItem(k))
              alert(`已清除 ${supabaseKeys.length} 个 Supabase 相关的 localStorage 键`)
              window.location.reload()
            }}
            className="rx-btn ml-4"
          >
            清除 Supabase LocalStorage
          </button>
        </div>

        <div className="mt-6">
          <a href="/" className="rx-btn">
            返回首页
          </a>
          <a href="/login" className="rx-btn ml-4">
            前往登录
          </a>
        </div>
      </div>
    </div>
  )
}
