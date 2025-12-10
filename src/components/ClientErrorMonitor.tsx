/**
 * 客户端错误监控组件
 * 捕获浏览器端未处理的 Promise 拒绝和全局错误
 */

'use client'

import { useEffect } from 'react'

export function ClientErrorMonitor() {
  useEffect(() => {
    // 捕获未处理的 Promise 拒绝
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[浏览器] 未处理的 Promise 拒绝:', event.reason)

      // 开发环境显示警告
      if (process.env.NODE_ENV === 'development') {
        const message = event.reason instanceof Error
          ? event.reason.message
          : String(event.reason)

        console.error('========================================')
        console.error('未处理的 Promise 拒绝')
        console.error('========================================')
        console.error('原因:', message)
        if (event.reason instanceof Error && event.reason.stack) {
          console.error('堆栈:', event.reason.stack)
        }
        console.error('========================================')
      }

      // 可选：发送到错误监控服务
      // TODO: 集成 Sentry 或其他监控服务
    }

    // 捕获全局错误
    const handleError = (event: ErrorEvent) => {
      console.error('[浏览器] 全局错误:', event.error || event.message)

      if (process.env.NODE_ENV === 'development') {
        console.error('========================================')
        console.error('全局错误')
        console.error('========================================')
        console.error('消息:', event.message)
        console.error('文件:', event.filename)
        console.error('行号:', event.lineno)
        console.error('列号:', event.colno)
        if (event.error?.stack) {
          console.error('堆栈:', event.error.stack)
        }
        console.error('========================================')
      }
    }

    // 注册事件监听器
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    // 清理函数
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  // 此组件不渲染任何内容
  return null
}
