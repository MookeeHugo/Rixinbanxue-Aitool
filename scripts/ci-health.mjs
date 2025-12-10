#!/usr/bin/env node

/**
 * CI/定时健康检查串行脚本：
 * 1) npm run lint && npm run build && npm run lint:encoding
 * 2) node scripts/log-maintenance.mjs --dry-run
 * 3) rg -n "legacy/" src
 * 4) rg -n "\\uFFFD"
 * 5) curl /health（http://localhost:8000/health）
 */

import { exec as execCb } from 'child_process'
import { promisify } from 'util'

const exec = promisify(execCb)

async function runStep(title, cmd) {
  console.log(`\n=== ${title} ===`)
  try {
    const { stdout, stderr } = await exec(cmd, { env: process.env })
    if (stdout) console.log(stdout.trim())
    if (stderr) console.error(stderr.trim())
    console.log(`✔ ${title} 完成`)
  } catch (err) {
    console.error(`✖ ${title} 失败`)
    if (err.stdout) console.error(err.stdout.trim())
    if (err.stderr) console.error(err.stderr.trim())
    throw err
  }
}

async function runHealthCheck() {
  console.log('\n=== /health ===')
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch('http://localhost:8000/health', { signal: controller.signal })
    const text = await res.text()
    console.log(`状态码: ${res.status}`)
    console.log(text)
    if (!res.ok) {
      throw new Error('/health 返回非 200')
    }
    console.log('✔ /health 检查通过')
  } catch (err) {
    console.error('✖ /health 检查失败', err.message)
    throw err
  } finally {
    clearTimeout(id)
  }
}

async function main() {
  await runStep('Lint/Build/Encoding', 'npm run lint && npm run build && npm run lint:encoding')
  await runStep('Log maintenance (dry-run)', 'node scripts/log-maintenance.mjs --dry-run')
  await runStep('rg legacy', 'rg -n "legacy/" src')
  await runStep('rg \\uFFFD', 'rg -n "\\\\uFFFD"')
  await runHealthCheck()
  console.log('\n全部健康检查通过')
}

main().catch((err) => {
  console.error('\n健康检查失败，退出码 1')
  process.exit(1)
})
