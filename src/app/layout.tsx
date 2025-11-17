import "./globals.css";
import React from "react";
import Navbar from "@/components/Navbar";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";

export const metadata = {
  title: "日新教学平台",
  description: "智能组卷 · 自动批改 · 学情分析",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Gauthmath 设计系统主题变量 (HSL格式)
  const lightThemeVars: React.CSSProperties = {
    // Gauthmath 品牌色
    "--brand-red": "348 100% 50%",         // #ff013e
    "--brand-red-hover": "348 100% 44%",   // #e00036
    "--brand-orange": "29 100% 50%",       // #ff7a00

    // Gauthmath 背景色
    "--background": "0 0% 100%",           // #ffffff
    "--background-secondary": "240 11% 95%", // #f2f2f7
    "--background-tertiary": "0 0% 98%",   // #fafafa

    // Gauthmath 前景色
    "--foreground": "0 0% 0%",             // #000000
    "--foreground-secondary": "240 4% 24%", // #3c3c43
    "--foreground-tertiary": "0 0% 33%",    // #555555 (提高对比度至 7.5:1)
    "--foreground-quaternary": "0 0% 60%",  // #999999 (提高对比度至 4.6:1)

    // Gauthmath 边框色
    "--border": "220 13% 91%",             // #e4e6eb
    "--border-medium": "240 4% 82%",       // #d1d1d6
    "--border-dark": "240 5% 79%",         // #c7c7cc

    // Gauthmath 功能色
    "--success": "145 80% 49%",            // #34c759
    "--warning": "36 100% 50%",            // #ff9500
    "--error": "4 100% 60%",               // #ff3b30
    "--info": "211 100% 50%",              // #007aff

    // shadcn/ui 兼容变量
    "--card": "0 0% 100%",                 // #ffffff
    "--card-foreground": "0 0% 0%",        // #000000
    "--popover": "0 0% 100%",              // #ffffff
    "--popover-foreground": "0 0% 0%",     // #000000
    "--primary": "348 100% 50%",           // #ff013e (品牌红色)
    "--primary-foreground": "0 0% 100%",   // #ffffff
    "--secondary": "240 11% 95%",          // #f2f2f7
    "--secondary-foreground": "0 0% 0%",   // #000000
    "--muted": "240 11% 95%",              // #f2f2f7
    "--muted-foreground": "0 0% 33%",      // #555555 (提高对比度)
    "--accent": "240 11% 95%",             // #f2f2f7
    "--accent-foreground": "0 0% 0%",      // #000000
    "--destructive": "4 100% 60%",         // #ff3b30
    "--destructive-foreground": "0 0% 100%", // #ffffff
    "--input": "0 0% 100%",                // #ffffff
    "--ring": "348 100% 50%",              // #ff013e
    "--radius": "0.75rem",                 // 12px (Gauthmath 默认圆角)
  } as React.CSSProperties;

  return (
    <html lang="zh-CN" style={lightThemeVars}>
      <body style={{ backgroundColor: "#ffffff", color: "#111827" }}>
        <AntdRegistry>
          <ConfigProvider
            locale={zhCN}
            theme={{
              token: {
                // Gauthmath 品牌色
                colorPrimary: "#ff013e",           // 品牌红色 (替代紫色)
                colorSuccess: "#34c759",           // Gauthmath 成功色
                colorWarning: "#ff9500",           // Gauthmath 警告色
                colorError: "#ff3b30",             // Gauthmath 错误色
                colorInfo: "#007aff",              // Gauthmath 信息色

                // Gauthmath 文字颜色
                colorText: "#000000",              // 主文字颜色 (Gauthmath)
                colorTextSecondary: "#3c3c43",     // 次要文字颜色 (Gauthmath)
                colorTextTertiary: "#555555",      // 三级文字颜色 (提高对比度至 7.5:1)
                colorTextQuaternary: "#999999",    // 四级文字颜色 (提高对比度至 4.6:1)

                // Gauthmath 背景颜色
                colorBgContainer: "#ffffff",       // 容器背景
                colorBgElevated: "#ffffff",        // 浮层背景
                colorBgLayout: "#ffffff",          // 布局背景

                // Gauthmath 边框颜色
                colorBorder: "#e4e6eb",            // 边框颜色 (Gauthmath)

                // Gauthmath 圆角系统
                borderRadius: 12,                  // 默认圆角
                borderRadiusLG: 16,                // 大圆角
                borderRadiusSM: 8,                 // 小圆角

                // Gauthmath 字体系统
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Google Sans', Roboto, 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
                fontSize: 16,                      // 标准正文
                fontSizeLG: 18,                    // 大正文
                fontSizeSM: 14,                    // 小正文
              },
              components: {
                Table: {
                  borderRadius: 12,
                  headerBg: "#f2f2f7",             // Gauthmath background-secondary
                  headerColor: "#000000",          // Gauthmath foreground
                  colorText: "#000000",            // Gauthmath foreground
                },
                Button: {
                  borderRadius: 14,                // Gauthmath 按钮圆角
                  controlHeight: 44,               // Gauthmath 按钮高度
                  paddingContentHorizontal: 24,    // Gauthmath 按钮横向内边距
                  primaryShadow: "0 2px 16px 0 rgba(255, 1, 62, 0.24)",  // Gauthmath 品牌红色阴影
                  colorText: "#000000",            // 按钮文字颜色
                },
                Card: {
                  borderRadius: 12,                // Gauthmath 卡片圆角
                  boxShadow: "0 2px 16px 0 rgba(0, 0, 0, 0.12)",  // Gauthmath 默认阴影
                  colorText: "#000000",            // 卡片文字颜色
                },
                Input: {
                  borderRadius: 8,                 // Gauthmath 输入框圆角
                  controlHeight: 44,               // Gauthmath 输入框高度
                  paddingBlock: 12,                // 纵向内边距
                  paddingInline: 16,               // 横向内边距
                  colorText: "#000000",            // 输入框文字颜色
                  colorBgContainer: "#ffffff",     // 输入框背景
                },
                Select: {
                  borderRadius: 8,                 // Gauthmath 选择器圆角
                  controlHeight: 44,               // Gauthmath 选择器高度
                  colorText: "#000000",            // 选择器文字颜色
                  colorBgContainer: "#ffffff",     // 选择器背景
                },
              },
            }}
          >
            <Navbar />
            <main className="rx-container rx-main">{children}</main>
            <footer className="rx-footer">
              <div className="rx-container">© 2025 日新教学平台 · MVP v1.0</div>
            </footer>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
