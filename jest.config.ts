import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // 提供 Next.js 应用的路径，用于加载 next.config.js 和 .env 文件
  dir: './',
})

// Jest 配置
const config: Config = {
  // 使用 jsdom 测试环境（用于测试 React 组件）
  testEnvironment: 'jsdom',

  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // 忽略的目录和文件
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/playwright-report/',
    '/test-results/',
    '/tests/e2e/',  // 忽略 E2E 测试
    '/legacy/',
    '/__tests__/utils/',  // 忽略测试工具目录
  ],

  // 模块路径别名（与 tsconfig.json 保持一致）
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // 设置文件（在每个测试文件运行前执行）
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // 收集覆盖率的文件
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // 转换配置
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },

  // 清除 mock
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
}

// 使用 Next.js 的 Jest 配置创建器
export default createJestConfig(config)
