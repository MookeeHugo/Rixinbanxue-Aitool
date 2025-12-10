#!/usr/bin/env node

/**
 * 开发环境健康检查（扩展版）
 * 功能：
 * 1) 端口占用与依赖安装
 * 2) 关键环境变量存在性（含 Sentry DSN 提示）
 * 3) 外部服务探活：Supabase / PaddleOCR / LiveKit / R2
 */

import { promisify } from 'util'
import { exec as execCb } from 'child_process'
import http from 'http'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const exec = promisify(execCb)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const PORT = process.env.PORT || 3002
const PADDLE_URL = process.env.PADDLEOCR_SERVICE_URL || 'http://localhost:8000'
const LIVEKIT_URL = process.env.LIVEKIT_WS_URL || ''
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || ''

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve({ available: false, responding: true, status: res.statusCode })
    })

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        resolve({ available: true, responding: false })
      } else {
        resolve({ available: true, responding: false })
      }
    })

    req.setTimeout(2000, () => {
      req.destroy()
      resolve({ available: false, responding: false })
    })
  })
}

async function checkNodeVersion() {
  try {
    const { stdout } = await exec('node -v')
    log(`✓ Node.js: ${stdout.trim()}`, 'green')
    return true
  } catch {
    log(`✗ Node.js 未安装`, 'red')
    return false
  }
}

async function checkPnpmVersion() {
  try {
    const { stdout } = await exec('pnpm -v')
    log(`✓ pnpm: v${stdout.trim()}`, 'green')
    return true
  } catch {
    log(`✗ pnpm 未安装`, 'red')
    return false
  }
}

async function checkDependencies() {
  try {
    const nodeModulesPath = path.join(rootDir, 'node_modules')
    await fs.access(nodeModulesPath)
    const criticalDeps = ['next', 'react', 'sharp', '@supabase/supabase-js']
    let allInstalled = true
    for (const dep of criticalDeps) {
      try {
        await fs.access(path.join(nodeModulesPath, dep))
      } catch {
        log(`  ⚠️  缺少依赖: ${dep}`, 'yellow')
        allInstalled = false
      }
    }
    if (allInstalled) {
      log(`✓ 关键依赖已安装`, 'green')
      return true
    }
    log(`⚠️  部分依赖缺失，建议运行 pnpm install`, 'yellow')
    return false
  } catch {
    log(`✗ node_modules 不存在，请运行 pnpm install`, 'red')
    return false
  }
}

async function checkEnvironment() {
  const envPath = path.join(rootDir, '.env.local')
  try {
    await fs.access(envPath)
    log(`✓ .env.local 已存在`, 'green')
    const envContent = await fs.readFile(envPath, 'utf-8')

    const hasSupabase = envContent.includes('NEXT_PUBLIC_SUPABASE_URL')
    const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    const hasPaddle = envContent.includes('PADDLEOCR_SERVICE_URL')
    const hasSentry = envContent.includes('SENTRY_DSN') || envContent.includes('NEXT_PUBLIC_SENTRY_DSN')
    const hasLiveKit = envContent.includes('LIVEKIT_WS_URL')
    const hasR2 = envContent.includes('R2_ENDPOINT') && envContent.includes('R2_ACCESS_KEY_ID')

    if (hasSupabase && hasSupabaseKey) log(`  ✓ Supabase 配置存在`, 'blue')
    else log(`  ⚠️  缺少 Supabase 配置`, 'yellow')

    if (hasPaddle) log(`  ✓ PaddleOCR 地址存在`, 'blue')
    else log(`  ⚠️  缺少 PaddleOCR 地址（默认 http://localhost:8000）`, 'yellow')

    if (hasSentry || SENTRY_DSN) log(`  ✓ Sentry DSN 已配置`, 'blue')
    else log(`  ⚠️  未配置 Sentry DSN（SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN）`, 'yellow')

    if (hasLiveKit) log(`  ✓ LiveKit 配置存在`, 'blue')
    else log(`  ⚠️  缺少 LiveKit 配置（可选）`, 'yellow')

    if (hasR2) log(`  ✓ R2 配置存在`, 'blue')
    else log(`  ⚠️  缺少 R2 配置（R2_ENDPOINT/R2_ACCESS_KEY_ID 等，可选）`, 'yellow')

    return true
  } catch {
    log(`⚠️  .env.local 不存在，请复制 .env.local.example 并配置`, 'yellow')
    return false
  }
}

async function checkSupabaseService() {
  try {
    const { stdout } = await exec('npx supabase status', { cwd: rootDir, timeout: 5000 })
    if (stdout.includes('API URL')) {
      log(`✓ Supabase 本地服务运行中`, 'green')
      return true
    }
  } catch {}
  log(`⚠️  Supabase 本地服务未运行（可选），启动命令: npm run db:start`, 'yellow')
  return false
}

async function checkHttpHealth(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    fetch(url, { signal: controller.signal })
      .then(res => res.text().then(body => resolve({ ok: res.ok, status: res.status, body })))
      .catch(err => resolve({ ok: false, error: err }))
      .finally(() => clearTimeout(id))
  })
}

async function checkPaddle() {
  const url = `${PADDLE_URL}/health`
  const res = await checkHttpHealth(url, 4000)
  if (res.ok) {
    log(`✓ PaddleOCR /health 正常 (${url})`, 'green')
    return true
  }
  log(`⚠️  PaddleOCR 未就绪 (${url})`, 'yellow')
  return false
}

async function checkLiveKit() {
  if (!LIVEKIT_URL) {
    log(`ℹ️  未配置 LIVEKIT_WS_URL，跳过 LiveKit 健康检查`, 'blue')
    return true
  }
  const probe = LIVEKIT_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
  const res = await checkHttpHealth(probe, 4000)
  if (res.ok || res.status === 403) {
    log(`✓ LiveKit 可访问 (${probe})`, 'green')
    return true
  }
  log(`⚠️  LiveKit 健康检查失败 (${probe})`, 'yellow')
  return false
}

async function checkR2() {
  if (!R2_PUBLIC_URL) {
    log(`ℹ️  未配置 R2_PUBLIC_URL，跳过 R2 健康检查`, 'blue')
    return true
  }
  const res = await checkHttpHealth(`${R2_PUBLIC_URL}/`, 4000)
  if (res.ok || res.status === 403) {
    log(`✓ R2/CDN 可访问 (${R2_PUBLIC_URL})`, 'green')
    return true
  }
  log(`⚠️  R2/CDN 无法访问 (${R2_PUBLIC_URL})`, 'yellow')
  return false
}

async function checkNextCache() {
  try {
    const nextDir = path.join(rootDir, '.next')
    await fs.access(nextDir)
    log(`✓ .next 缓存目录存在`, 'green')
    return true
  } catch {
    log(`ℹ️  .next 缓存目录不存在（首次运行正常）`, 'blue')
    return true
  }
}

async function main() {
  console.log('\n' + '='.repeat(60))
  log('🚑 开发环境健康检查', 'cyan')
  console.log('='.repeat(60) + '\n')

  const checks = []

  log('🧭 运行环境...', 'bright')
  checks.push(await checkNodeVersion())
  checks.push(await checkPnpmVersion())
  console.log('')

  log('📦 依赖检查...', 'bright')
  checks.push(await checkDependencies())
  console.log('')

  log('🔐 环境变量...', 'bright')
  checks.push(await checkEnvironment())
  console.log('')

  log('🌐 开发服务端口...', 'bright')
  const portStatus = await checkPort(PORT)
  if (portStatus.responding) {
    log(`✓ 开发服务器运行中 (http://localhost:${PORT})`, 'green')
    log(`  状态码: ${portStatus.status}`, 'blue')
    checks.push(true)
  } else if (!portStatus.available) {
    log(`⚠️  端口 ${PORT} 被占用但无响应`, 'yellow')
    log(`  建议: npm run dev:clean`, 'blue')
    checks.push(false)
  } else {
    log(`ℹ️  端口 ${PORT} 可用（服务器未运行）`, 'blue')
    checks.push(true)
  }
  console.log('')

  log('💾 Next.js 缓存...', 'bright')
  checks.push(await checkNextCache())
  console.log('')

  log('🏗️ Supabase 本地...', 'bright')
  await checkSupabaseService()
  console.log('')

  log('🩺 外部服务...', 'bright')
  await checkPaddle()
  await checkLiveKit()
  await checkR2()
  console.log('')

  console.log('='.repeat(60))
  const passed = checks.filter(Boolean).length
  const total = checks.length
  if (passed === total) {
    log(`✓ 健康检查通过 (${passed}/${total})`, 'green')
    log(`\n🚀 可以启动开发服务器: npm run dev`, 'bright')
  } else {
    log(`⚠️  部分检查未通过 (${passed}/${total})`, 'yellow')
    log(`\n💡 建议：`)
    log(`   pnpm install           # 安装依赖`, 'blue')
    log(`   npm run dev:reset      # 重置开发环境`, 'blue')
    log(`   npm run db:start       # 启动 Supabase（可选）`, 'blue')
  }
  console.log('='.repeat(60) + '\n')
}

main().catch((error) => {
  log(`\n✗ 健康检查失败 ${error.message}`, 'red')
  process.exit(1)
})
