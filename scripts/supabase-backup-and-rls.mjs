#!/usr/bin/env node

/**
 * Supabase 备份 + RLS 审计
 *
 * - 备份：使用 `npx supabase db dump` 输出到 tmp/archive/supabase-backups/YYYYMMDD-hhmm.sql
 * - RLS 审计：使用 psql 查询 pg_policies，输出到 tmp/archive/supabase-backups/rls-audit-YYYYMMDD-hhmm.txt
 *
 * 环境变量：
 * - SUPABASE_DB_URL（可选，默认 postgresql://postgres:postgres@localhost:5432/postgres）
 * - PG_BIN（可选，指定 psql 所在目录）
 */

import { mkdir } from 'fs/promises'
import { exec as execCb } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const exec = promisify(execCb)
const now = new Date()
const ts = now.toISOString().replace(/[-:]/g, '').slice(0, 13) // YYYYMMDDTHH

const root = path.resolve(process.cwd())
const outDir = path.join(root, 'tmp', 'archive', 'supabase-backups')
const dumpFile = path.join(outDir, `supabase-${ts}.sql`)
const rlsFile = path.join(outDir, `rls-audit-${ts}.txt`)

const DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
const PSQL = process.env.PG_BIN ? path.join(process.env.PG_BIN, 'psql') : 'psql'

async function run(cmd) {
  const { stdout, stderr } = await exec(cmd, { env: process.env })
  if (stdout) console.log(stdout.trim())
  if (stderr) console.error(stderr.trim())
}

async function backup() {
  console.log(`\n=== 备份到 ${dumpFile} ===`)
  await mkdir(outDir, { recursive: true })
  await run(`npx supabase db dump -f "${dumpFile}" --db-url "${DB_URL}"`)
}

async function auditRls() {
  console.log(`\n=== 导出 RLS 策略到 ${rlsFile} ===`)
  const sql = [
    "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check",
    "FROM pg_policies",
    "ORDER BY schemaname, tablename, policyname;"
  ].join(' ')
  await run(`"${PSQL}" "${DB_URL}" -c "${sql}" > "${rlsFile}"`)
}

async function main() {
  await backup()
  await auditRls()
  console.log('\nSupabase 备份与 RLS 审计完成')
}

main().catch((err) => {
  console.error('执行失败:', err.message)
  process.exit(1)
})
