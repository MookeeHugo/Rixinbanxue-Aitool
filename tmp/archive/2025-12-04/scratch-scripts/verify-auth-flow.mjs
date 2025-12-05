import { chromium } from 'playwright'

const baseURL = 'http://localhost:3014'
const credentials = { email: 'teacher@test.com', password: 'test123456' }
const uploadFilePath = 'tmp/test-upload.png'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

const authRequests = []
let requestCursor = 0

page.on('requestfinished', async (request) => {
  const url = request.url()
  if (!url.includes('/api/auth/')) return
  const response = await request.response()
  authRequests.push({
    url,
    method: request.method(),
    status: response ? response.status() : null,
    timestamp: new Date().toISOString(),
  })
})

function collectNewRequests() {
  const slice = authRequests.slice(requestCursor)
  requestCursor = authRequests.length
  return slice
}

async function ensureWebpackRequire() {
  const hasReq = await page.evaluate(() => typeof window.__webpack_require__ === 'function')
  if (hasReq) {
    return
  }
  await page.evaluate(() => new Promise((resolve) => {
    const chunkId = Math.random()
    ;(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[chunkId], {}, function (__webpack_require__) {
      window.__webpack_require__ = __webpack_require__
      resolve()
    }])
  }))
}

let supabaseModuleId = null
async function getSupabaseModuleId() {
  if (supabaseModuleId) return supabaseModuleId
  await ensureWebpackRequire()
  supabaseModuleId = await page.evaluate(() => {
    const req = window.__webpack_require__
    const modules = req.m
    for (const id in modules) {
      try {
        const exp = req(id)
        if (exp?.supabase?.auth?.refreshSession) {
          return id
        }
      } catch (err) {
        // ignore
      }
    }
    return null
  })
  if (!supabaseModuleId) throw new Error('无法定位 Supabase 模块')
  return supabaseModuleId
}

async function login() {
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })
  await page.fill('input#email', credentials.email)
  await page.fill('input#password', credentials.password)
  requestCursor = authRequests.length
  await Promise.all([
    page.waitForURL(`${baseURL}/`, { waitUntil: 'networkidle' }),
    page.getByRole('button', { name: /登录|Sign in|鐧诲綍/i }).click(),
  ])
  await page.waitForTimeout(1000)
  return collectNewRequests()
}

async function refreshSessionViaClient() {
  const moduleId = await getSupabaseModuleId()
  requestCursor = authRequests.length
  await page.evaluate((id) => {
    return window.__webpack_require__(id).supabase.auth.refreshSession()
  }, moduleId)
  await page.waitForTimeout(1500)
  return collectNewRequests()
}

async function signOutViaClient() {
  const moduleId = await getSupabaseModuleId()
  requestCursor = authRequests.length
  await page.evaluate((id) => {
    return window.__webpack_require__(id).supabase.auth.signOut()
  }, moduleId)
  await page.waitForTimeout(500)
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })
  return collectNewRequests()
}

async function goToIngest() {
  await page.goto(`${baseURL}/tools/ingest`, { waitUntil: 'networkidle' })
}

async function uploadTestFile() {
  await page.setInputFiles('input#file-input', uploadFilePath)
  await page.waitForTimeout(500)
  const uploadButton = await page.getByRole('button', { name: /上传|寮�濮嬩笂浼?/ })
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/tools/ingest') && response.request().method() === 'POST', { timeout: 15000 }),
    uploadButton.click(),
  ])
  await page.waitForSelector('text=test-upload.png', { timeout: 20000 })
}

const results = {}

results.login = await login()
results.refresh = await refreshSessionViaClient()
results.logout = await signOutViaClient()
results.loginAfterLogout = await login()
await goToIngest()
await uploadTestFile()

console.log('AUTH_REQUESTS', JSON.stringify(results, null, 2))
console.log('UPLOAD_DONE')

await browser.close()
