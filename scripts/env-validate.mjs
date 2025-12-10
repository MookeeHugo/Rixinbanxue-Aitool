#!/usr/bin/env node

/**
 * 环境变量校验（可在 CI 调用）
 * - 校验必需/推荐变量并给出降级提示
 */

import fs from 'fs'
import path from 'path'

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]

const recommended = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'PADDLEOCR_SERVICE_URL',
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PUBLIC_URL',
  'LIVEKIT_WS_URL',
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DSN'
]

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return {}
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  const map = {}
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) {
      const key = m[1]
      const raw = m[2]
      const val = raw.replace(/^["']|["']$/g, '')
      map[key] = val
    }
  }
  return map
}

function main() {
  const env = { ...process.env, ...loadEnv() }
  const missingRequired = required.filter(k => !env[k])
  const missingRecommended = recommended.filter(k => !env[k])

  if (missingRequired.length === 0) {
    console.log('✓ 必需环境变量齐全')
  } else {
    console.error('✗ 缺少必需环境变量:')
    missingRequired.forEach(k => console.error(`  - ${k}`))
    process.exitCode = 1
  }

  if (missingRecommended.length > 0) {
    console.warn('\n⚠️  建议配置的环境变量（未设置将采用降级行为）:')
    missingRecommended.forEach(k => console.warn(`  - ${k}`))
    console.warn('\n降级提示:')
    console.warn(' - 无 R2 配置将回落到 Supabase Storage（若配置）或报错')
    console.warn(' - 无 PaddleOCR 将无法使用本地 OCR 服务')
    console.warn(' - 无 LiveKit URL 将跳过直播健康检查')
    console.warn(' - 无 Sentry DSN 将不会上报错误')
  } else {
    console.log('\n✓ 建议变量也已配置')
  }
}

main()
