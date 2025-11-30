import './globals.css'
import React from 'react'
import Navbar from '@/components/Navbar'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { Toaster } from '@/components/ui/toaster'

export const metadata = {
  title: '日新数学平台',
  description: '智能组卷 · 自动改错 · 学情分析'
}

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
      <body style={{ backgroundColor: '#ffffff', color: '#111827' }}>
        <AntdRegistry>
          <ConfigProvider
            locale={zhCN}
            theme={{
              token: {
                colorPrimary: '#0052D4',    // 深空蓝
                colorSuccess: '#10b981',     // 成功绿
                colorWarning: '#f59e0b',     // 警告橙
                colorError: '#ef4444',       // 错误红
                colorInfo: '#2563EB',        // 信息蓝
                colorText: '#000000',
                colorTextSecondary: '#3c3c43',
                colorTextTertiary: '#555555',
                colorTextQuaternary: '#999999',
                colorBgContainer: '#ffffff',
                colorBgElevated: '#ffffff',
                colorBgLayout: '#ffffff',
                colorBorder: '#e4e6eb',
                borderRadius: 12,
                borderRadiusLG: 16,
                borderRadiusSM: 8,
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Google Sans', Roboto, 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
                fontSize: 16,
                fontSizeLG: 18,
                fontSizeSM: 14
              },
              components: {
                Table: {
                  borderRadius: 12,
                  headerBg: '#f2f2f7',
                  headerColor: '#000000',
                  colorText: '#000000'
                },
                Button: {
                  borderRadius: 14,
                  controlHeight: 44,
                  paddingContentHorizontal: 24,
                  primaryShadow: '0 2px 16px 0 rgba(255, 1, 62, 0.24)',
                  colorText: '#000000'
                },
                Card: {
                  borderRadius: 12,
                  boxShadow: '0 2px 16px 0 rgba(0, 0, 0, 0.12)',
                  colorText: '#000000'
                },
                Input: {
                  borderRadius: 8,
                  controlHeight: 44,
                  paddingBlock: 12,
                  paddingInline: 16,
                  colorText: '#000000',
                  colorBgContainer: '#ffffff'
                },
                Select: {
                  borderRadius: 8,
                  controlHeight: 44,
                  colorText: '#000000',
                  colorBgContainer: '#ffffff'
                }
              }
            }}
          >
            <Navbar />
            <main className="rx-container rx-main">{children}</main>
            <footer className="rx-footer">
              <div className="rx-container">© 2025 日新数学平台 · MVP v1.0</div>
            </footer>
            <Toaster />
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}
