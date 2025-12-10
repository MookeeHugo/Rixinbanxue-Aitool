#!/usr/bin/env node

/**
 * PaddleOCR 压测 / 复现脚本
 *
 * 功能：
 * - 指定图片列表（默认 tests/dataset/ocr/*.jpg|png|jpeg）按顺序调用 OCR 接口
 * - 可配置并发、超时、重试，记录 200/500 等返回，提取 request_id
 * - 输出 summary + 详细日志至 tmp/archive/ocr-benchmark/ocr-benchmark-YYYYMMDD-HHMM.jsonl
 *
 * 环境变量：
 * - OCR_ENDPOINT (默认 http://localhost:8000/ocr)
 * - OCR_TIMEOUT_MS (默认 8000)
 * - OCR_CONCURRENCY (默认 2)
 * - OCR_RETRY (默认 1)
 * - DATASET_DIR (默认 tests/dataset/ocr)
 *
 * 样本提示：
 * - 可在 DATASET_DIR 下放置 strip_ratio/anchor 样本以复现 500 场景
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import { setTimeout as wait } from 'timers/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const __filename = fileURLToPath(import.meta.url)
const ROOT = path.resolve(__dirname, '..')
const DEFAULT_DATASET = process.env.DATASET_DIR || path.join(ROOT, 'tests', 'dataset', 'ocr')
const ENDPOINT = process.env.OCR_ENDPOINT || 'http://localhost:8000/ocr'
const TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || 8000)
const CONCURRENCY = Number(process.env.OCR_CONCURRENCY || 2)
const RETRY = Number(process.env.OCR_RETRY || 1)
const USE_MULTIPART =
  process.env.OCR_USE_MULTIPART?.toLowerCase() === 'true' ||
  (!process.env.OCR_USE_MULTIPART && ENDPOINT.includes('/api/'))

const OUT_DIR = path.join(ROOT, 'tmp', 'archive', 'ocr-benchmark')
const OUT_FILE = path.join(
  OUT_DIR,
  `ocr-benchmark-${new Date().toISOString().replace(/[-:]/g, '').slice(0, 13)}.jsonl`
)

async function listImages(dir) {
  const files = await fs.readdir(dir)
  return files
    .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
    .map((f) => path.join(dir, f))
    .sort()
}

async function ensureOutDir() {
  await fs.mkdir(OUT_DIR, { recursive: true })
}

async function runWorkers(tasks) {
  let idx = 0
  let running = 0
  let results = []

  return new Promise((resolve) => {
    const spawn = () => {
      if (idx >= tasks.length) {
        if (running === 0) resolve(results)
        return
      }
      const task = tasks[idx++]
      running++
      const worker = new Worker(__filename, { workerData: task })
      worker.on('message', (msg) => {
        results.push(msg)
      })
      worker.on('exit', () => {
        running--
        spawn()
      })
    }
    for (let i = 0; i < CONCURRENCY; i++) spawn()
  })
}

async function main() {
  if (!isMainThread) {
    await workerJob(workerData)
    process.exit(0)
  }

  const images = await listImages(DEFAULT_DATASET)
  if (images.length === 0) {
    console.error(`未找到样本，请在 ${DEFAULT_DATASET} 放置 jpg/png 文件`)
    process.exit(1)
  }

  await ensureOutDir()
  console.log(`数据集共 ${images.length} 张图片，输出日志：${OUT_FILE}`)

  const tasks = images.map((file) => ({ file }))
  const results = await runWorkers(tasks)

  await fs.writeFile(
    OUT_FILE,
    results.map((r) => JSON.stringify(r)).join('\n'),
    'utf-8'
  )

  const summary = results.reduce(
    (acc, r) => {
      acc.total++
      if (r.status === 200) acc.ok++
      else acc.fail++
      if (r.error) acc.errors.push(r.error)
      return acc
    },
    { total: 0, ok: 0, fail: 0, errors: [] }
  )

  console.log(`完成：${summary.ok}/${summary.total} 成功，失败 ${summary.fail}`)
  if (summary.errors.length) {
    console.log('错误样本：')
    summary.errors.slice(0, 10).forEach((e) => console.log('-', e))
  }
}

async function workerJob(task) {
  const fileBuffer = await fs.readFile(task.file)
  let lastErr = null
  for (let attempt = 0; attempt <= RETRY; attempt++) {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), TIMEOUT_MS)

      let res
      if (USE_MULTIPART) {
        const form = new FormData()
        // 尽量猜测 mime 类型
        const ext = path.extname(task.file).toLowerCase()
        const mime =
          ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream'
        form.append('file', new Blob([fileBuffer], { type: mime }), path.basename(task.file))
        res = await fetch(ENDPOINT, { method: 'POST', body: form, signal: controller.signal })
      } else {
        res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: fileBuffer,
          signal: controller.signal
        })
      }

      const text = await res.text()
      clearTimeout(id)
      return parentPort?.postMessage({
        file: path.basename(task.file),
        status: res.status,
        body: text.slice(0, 5000),
        ok: res.ok,
        requestId: res.headers.get('x-request-id') || null
      })
    } catch (err) {
      lastErr = err
      if (attempt < RETRY) {
        await wait(200 * (attempt + 1))
        continue
      }
      parentPort?.postMessage({
        file: path.basename(task.file),
        status: null,
        ok: false,
        error: err.message
      })
    }
  }
}

main().catch((err) => {
  console.error('执行失败:', err)
  process.exit(1)
})
