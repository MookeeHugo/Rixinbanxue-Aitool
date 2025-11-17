import { spawn } from 'child_process'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const envLocalPath = path.join(repoRoot, '.env.local')
const envTemplatePath = path.join(repoRoot, '.env.local.development')

const ensureEnvLocal = () => {
  if (!existsSync(envTemplatePath)) {
    console.warn('.env.local.development 不存在，跳过环境变量同步')
    return
  }

  if (!existsSync(envLocalPath)) {
    copyFileSync(envTemplatePath, envLocalPath)
    console.log('已复制 .env.local.development → .env.local')
    return
  }

  let content = readFileSync(envLocalPath, 'utf-8')
  const template = readFileSync(envTemplatePath, 'utf-8')

  const getValue = (key) => {
    const match = template.match(new RegExp(`^${key}=(.*)$`, 'm'))
    return match ? match[1].trim() : null
  }

  const ensureKey = (key, value) => {
    if (!value) return
    const pattern = new RegExp(`^${key}=.*$`, 'm')
    if (pattern.test(content)) {
      content = content.replace(pattern, `${key}=${value}`)
    } else {
      content = `${content.trim()}\n${key}=${value}\n`
    }
  }

  ensureKey('NEXT_PUBLIC_SUPABASE_URL', getValue('NEXT_PUBLIC_SUPABASE_URL'))
  ensureKey('NEXT_PUBLIC_SUPABASE_ANON_KEY', getValue('NEXT_PUBLIC_SUPABASE_ANON_KEY'))

  writeFileSync(envLocalPath, content)
  console.log('已同步 .env.local 中的本地 Supabase 配置')
}

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} ${args.join(' ')} 退出码 ${code}`))
      }
    })
  })

const main = async () => {
  ensureEnvLocal()
  await run('npx', ['supabase', 'start'])
  await run('npm', ['run', 'dev'])
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
