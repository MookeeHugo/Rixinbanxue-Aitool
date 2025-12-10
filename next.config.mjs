import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ========== 性能优化配置 ==========

  // 1. 使用 SWC 编译器进行代码压缩和优化
  swcMinify: true,

  // 2. 编译器优化配置 - 生产环境移除 console
  compiler: {
    // 生产环境移除 console 输出（保留 console.error 和 console.warn）
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // 3. 实验性功能 - 提升开发体验
  experimental: {
    // 优化包导入 - 减少 Ant Design 等库的打包体积
    optimizePackageImports: ['antd', 'lucide-react', '@ant-design/icons'],

    // 优化服务器组件
    serverActions: {
      bodySizeLimit: '2mb',
    },

    // 指定仅在服务端使用的包（不打包到客户端）
    serverComponentsExternalPackages: ['sharp'],
  },

  // 4. 图片优化配置
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      // 允许本地 Supabase 存储
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // 5. Webpack 配置优化
  webpack: (config, { dev, isServer }) => {
      // 开发环境优化
    if (dev) {
      // 使用平台无关的路径解析
      const rootDir = process.cwd()

      // Webpack schema 仅接受字符串数组或单个 RegExp；使用 glob 字符串列表以通过校验
      const ignoredList = [
        '**/node_modules/**',
        '**/.next/**',
        '**/.git/**',
        '**/test-results/**',
        '**/playwright-report/**',
        '**/__pycache__/**',
        '**/.pytest_cache/**',
        '**/logs/**',
      ]

      config.watchOptions = {
        poll: 1000, // 每秒检查一次
        aggregateTimeout: 300, // 延迟重新构建
        ignored: [
          ...ignoredList,
          // 防止扫描到系统保护目录（使用统一的正斜杠通配，不含盘符）
          '**/System Volume Information/**',
          '**/system volume information/**',
          '**/SYSTEM VOLUME INFORMATION/**',
        ],
      }

      // 注意：Next.js 14.2.7 已经内置了文件系统缓存，这里不需要额外配置
    }

    // 生产环境优化
    if (!dev) {
      // 代码拆分优化
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // 第三方库单独打包
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Ant Design 单独打包
            antd: {
              name: 'antd',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](antd|@ant-design)[\\/]/,
              priority: 30,
            },
            // React 生态单独打包
            react: {
              name: 'react',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
            },
            // 公共代码
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      }
    }

    return config
  },

  // 6. 静态页面生成配置
  reactStrictMode: false, // 临时禁用以修复 ActionQueueContext 错误

  // 7. 输出配置
  poweredByHeader: false, // 移除 X-Powered-By header

  // 8. 压缩配置
  compress: true,

  // 9. 开发环境 Headers 配置 - 修复 CSP 错误
  async headers() {
    // 仅在开发环境中放松 CSP 限制
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                // dev 下允许 eval 以支持 Next.js HMR/React Fast Refresh
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: blob: https: http://127.0.0.1:54321",
                "font-src 'self' data:",
                "connect-src 'self' ws: wss: http://127.0.0.1:* http://localhost:* https://*.supabase.co",
              ].join('; '),
            },
          ],
        },
      ]
    }
    return []
  },
}

export default nextConfig
