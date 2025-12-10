'use client'

import './globals.css'
import React from 'react'
import Navbar from '@/components/Navbar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ClientErrorMonitor } from '@/components/ClientErrorMonitor'
import { Toaster } from '@/components/ui/toaster'

// 强制动态渲染，禁用静态生成
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lightThemeVars: React.CSSProperties = {
    // RixinMate 品牌色系统
    '--primary': '213 100% 42%',           // #0052D4 深空蓝
    '--primary-foreground': '0 0% 100%',   // 白色文字
    '--accent': '25 100% 50%',             // #FF6B00 光子橙
    '--accent-foreground': '0 0% 100%',    // 白色文字

    // 背景色系统
    '--background': '210 20% 98%',         // #F9FAFB 极浅灰
    '--background-secondary': '210 16% 96%', // #F3F4F6
    '--background-tertiary': '0 0% 100%',  // 白色

    // 前景色系统（灰阶文字）
    '--foreground': '222 47% 11%',         // #111827 深黑
    '--foreground-secondary': '215 16% 47%', // #6B7280 中灰
    '--foreground-tertiary': '214 14% 65%', // #9CA3AF
    '--foreground-quaternary': '214 16% 82%', // #D1D5DB

    // 边框色系统
    '--border': '214 20% 91%',             // #E5E7EB
    '--border-medium': '214 16% 88%',      // #D1D5DB
    '--border-dark': '214 14% 65%',        // #9CA3AF

    // 语义色
    '--success': '160 84% 39%',            // #10b981
    '--warning': '38 92% 50%',             // #f59e0b
    '--error': '0 84% 60%',                // #ef4444
    '--info': '217 91% 60%',               // #3b82f6

    // shadcn/ui 兼容变量
    '--card': '0 0% 100%',
    '--card-foreground': '222 47% 11%',    // #111827
    '--popover': '0 0% 100%',
    '--popover-foreground': '222 47% 11%',
    '--muted': '210 16% 96%',              // #F3F4F6
    '--muted-foreground': '215 16% 47%',   // #6B7280
    '--destructive': '0 84% 60%',          // #ef4444
    '--destructive-foreground': '0 0% 100%',
    '--input': '0 0% 100%',
    '--ring': '213 100% 42%',              // #0052D4 深空蓝
    '--radius': '0.75rem'
  } as React.CSSProperties

  return (
    <html lang="zh-CN" style={lightThemeVars}>
      <head>
        <title>日新数学平台</title>
        <meta name="description" content="智能组卷 · 自动改错 · 学情分析" />
      </head>
      <body style={{ backgroundColor: '#ffffff', color: '#111827' }}>
        <ClientErrorMonitor />
        <ErrorBoundary>
          <Navbar />
          <main className="rx-container rx-main">{children}</main>
          <footer className="rx-footer">
            <div className="rx-container">© 2025 日新数学平台 · MVP v1.0</div>
          </footer>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}
