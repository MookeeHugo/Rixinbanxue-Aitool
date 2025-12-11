#!/usr/bin/env tsx

/**
 * 环境变量验证脚本
 * 在应用启动前检查所有必需的环境变量是否已配置
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// 加载环境变量（如果还未加载）
config({ path: resolve(process.cwd(), '.env.local') })

// 定义必需的环境变量
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

// 定义可选但推荐的环境变量
const optionalEnvVars = [
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'GEMINI_API_KEY',
  'DEEPSEEK_API_KEY',
  'ALIYUN_ACCESS_KEY_ID',
  'ALIYUN_ACCESS_KEY_SECRET',
] as const

/**
 * 检查环境变量
 */
function validateEnvironment() {
  const missing: string[] = []
  const optional: string[] = []

  // 检查必需的环境变量
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  // 检查可选的环境变量
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      optional.push(envVar)
    }
  }

  // 如果有缺失的必需变量，报错退出
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:')
    missing.forEach(envVar => console.error(`   - ${envVar}`))
    console.error('\n💡 Please check your .env.local file')
    console.error('   You can copy from .env.local.example to get started\n')
    process.exit(1)
  }

  // 如果有缺失的可选变量，警告但不退出
  if (optional.length > 0) {
    console.warn('\n⚠️  Optional environment variables not configured:')
    optional.forEach(envVar => console.warn(`   - ${envVar}`))
    console.warn('   Some features may not be available\n')
  }

  // 所有必需变量都已配置
  console.log('✅ All required environment variables are configured')

  if (optional.length === 0) {
    console.log('✅ All optional environment variables are configured\n')
  }
}

// 运行验证
validateEnvironment()
