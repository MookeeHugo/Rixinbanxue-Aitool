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
    '--brand-red': '348 100% 50%',
    '--brand-red-hover': '348 100% 44%',
    '--brand-orange': '29 100% 50%',
    '--background': '0 0% 100%',
    '--background-secondary': '240 11% 95%',
    '--background-tertiary': '0 0% 98%',
    '--foreground': '0 0% 0%',
    '--foreground-secondary': '240 4% 24%',
    '--foreground-tertiary': '0 0% 33%',
    '--foreground-quaternary': '0 0% 60%',
    '--border': '220 13% 91%',
    '--border-medium': '240 4% 82%',
    '--border-dark': '240 5% 79%',
    '--success': '145 80% 49%',
    '--warning': '36 100% 50%',
    '--error': '4 100% 60%',
    '--info': '211 100% 50%',
    '--card': '0 0% 100%',
    '--card-foreground': '0 0% 0%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '0 0% 0%',
    '--primary': '348 100% 50%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '240 11% 95%',
    '--secondary-foreground': '0 0% 0%',
    '--muted': '240 11% 95%',
    '--muted-foreground': '0 0% 33%',
    '--accent': '240 11% 95%',
    '--accent-foreground': '0 0% 0%',
    '--destructive': '4 100% 60%',
    '--destructive-foreground': '0 0% 100%',
    '--input': '0 0% 100%',
    '--ring': '348 100% 50%',
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
                colorPrimary: '#ff013e',
                colorSuccess: '#34c759',
                colorWarning: '#ff9500',
                colorError: '#ff3b30',
                colorInfo: '#007aff',
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
