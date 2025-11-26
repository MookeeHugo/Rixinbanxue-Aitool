#!/usr/bin/env node

/**
 * 开发环境健康检查
 * 功能：
 * 1. 检查端口状态
 * 2. 检查依赖安装情况
 * 3. 检查环境变量配置
 * 4. 检查必要的服务（如Supabase）
 */

import { promisify } from 'util';
import { exec } from 'child_process';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3002;
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

/**
 * 检查端口状态
 */
async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve({ available: false, responding: true, status: res.statusCode });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        resolve({ available: true, responding: false });
      } else {
        resolve({ available: true, responding: false });
      }
    });

    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ available: false, responding: false });
    });
  });
}

/**
 * 检查Node.js版本
 */
async function checkNodeVersion() {
  try {
    const { stdout } = await execAsync('node -v');
    const version = stdout.trim();
    log(`✅ Node.js: ${version}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Node.js未安装`, 'red');
    return false;
  }
}

/**
 * 检查pnpm版本
 */
async function checkPnpmVersion() {
  try {
    const { stdout } = await execAsync('pnpm -v');
    const version = stdout.trim();
    log(`✅ pnpm: v${version}`, 'green');
    return true;
  } catch (error) {
    log(`❌ pnpm未安装`, 'red');
    return false;
  }
}

/**
 * 检查依赖是否安装
 */
async function checkDependencies() {
  try {
    const nodeModulesPath = path.join(rootDir, 'node_modules');
    await fs.access(nodeModulesPath);

    // 检查关键依赖
    const criticalDeps = ['next', 'react', 'sharp', '@supabase/supabase-js'];
    let allInstalled = true;

    for (const dep of criticalDeps) {
      try {
        await fs.access(path.join(nodeModulesPath, dep));
      } catch {
        log(`  ⚠️  缺少依赖: ${dep}`, 'yellow');
        allInstalled = false;
      }
    }

    if (allInstalled) {
      log(`✅ 依赖已安装（${criticalDeps.length} 个关键依赖检查通过）`, 'green');
      return true;
    } else {
      log(`⚠️  部分依赖缺失，建议运行: npm run dev:reset`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ node_modules 不存在，请运行: pnpm install`, 'red');
    return false;
  }
}

/**
 * 检查环境变量
 */
async function checkEnvironment() {
  try {
    const envPath = path.join(rootDir, '.env.local');

    try {
      await fs.access(envPath);
      log(`✅ .env.local 文件存在`, 'green');

      // 读取并检查关键环境变量
      const envContent = await fs.readFile(envPath, 'utf-8');
      const hasSupabase = envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
      const hasAliyun = envContent.includes('ALIYUN_ACCESS_KEY_ID');

      if (hasSupabase) {
        log(`  ✓ Supabase 配置存在`, 'blue');
      } else {
        log(`  ⚠️  缺少 Supabase 配置`, 'yellow');
      }

      if (hasAliyun) {
        log(`  ✓ 阿里云OCR 配置存在`, 'blue');
      } else {
        log(`  ⚠️  缺少阿里云OCR配置（可选）`, 'yellow');
      }

      return true;
    } catch {
      log(`⚠️  .env.local 文件不存在`, 'yellow');
      log(`  请复制 .env.local.example 并配置环境变量`, 'blue');
      return false;
    }
  } catch (error) {
    log(`❌ 环境变量检查失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 检查Supabase服务
 */
async function checkSupabaseService() {
  try {
    const { stdout } = await execAsync('npx supabase status', {
      cwd: rootDir,
      timeout: 5000,
    });

    if (stdout.includes('API URL')) {
      log(`✅ Supabase 本地服务运行中`, 'green');
      return true;
    } else {
      log(`⚠️  Supabase 本地服务未运行`, 'yellow');
      log(`  启动命令: npm run db:start`, 'blue');
      return false;
    }
  } catch (error) {
    log(`⚠️  Supabase 本地服务未运行`, 'yellow');
    log(`  启动命令: npm run db:start`, 'blue');
    return false;
  }
}

/**
 * 检查.next构建缓存
 */
async function checkNextCache() {
  try {
    const nextDir = path.join(rootDir, '.next');
    await fs.access(nextDir);
    log(`✅ .next 缓存目录存在`, 'green');
    return true;
  } catch {
    log(`ℹ️  .next 缓存目录不存在（首次运行时正常）`, 'blue');
    return true;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  log('🏥 开发环境健康检查', 'cyan');
  console.log('='.repeat(60) + '\n');

  const checks = [];

  // 1. 检查运行环境
  log('📦 检查运行环境...', 'bright');
  checks.push(await checkNodeVersion());
  checks.push(await checkPnpmVersion());

  console.log('');

  // 2. 检查依赖
  log('📚 检查项目依赖...', 'bright');
  checks.push(await checkDependencies());

  console.log('');

  // 3. 检查环境变量
  log('🔐 检查环境配置...', 'bright');
  checks.push(await checkEnvironment());

  console.log('');

  // 4. 检查端口
  log('🌐 检查开发服务器端口...', 'bright');
  const portStatus = await checkPort(PORT);

  if (portStatus.responding) {
    log(`✅ 开发服务器运行中 (http://localhost:${PORT})`, 'green');
    log(`  状态码: ${portStatus.status}`, 'blue');
    checks.push(true);
  } else if (!portStatus.available) {
    log(`⚠️  端口 ${PORT} 被占用但无响应`, 'yellow');
    log(`  建议运行: npm run dev:clean`, 'blue');
    checks.push(false);
  } else {
    log(`ℹ️  端口 ${PORT} 可用（服务器未运行）`, 'blue');
    checks.push(true);
  }

  console.log('');

  // 5. 检查Next.js缓存
  log('💾 检查Next.js缓存...', 'bright');
  checks.push(await checkNextCache());

  console.log('');

  // 6. 检查Supabase服务（可选）
  log('🗄️  检查Supabase服务...', 'bright');
  await checkSupabaseService(); // 不影响总体健康状态

  console.log('');

  // 总结
  console.log('='.repeat(60));
  const passedChecks = checks.filter(Boolean).length;
  const totalChecks = checks.length;

  if (passedChecks === totalChecks) {
    log(`✅ 健康检查通过 (${passedChecks}/${totalChecks})`, 'green');
    log(`\n🚀 可以启动开发服务器: npm run dev`, 'bright');
  } else {
    log(`⚠️  健康检查部分通过 (${passedChecks}/${totalChecks})`, 'yellow');
    log(`\n💡 建议运行以下命令修复问题:`, 'bright');
    log(`   npm run dev:reset   # 完全重置开发环境`, 'blue');
    log(`   npm run dev:clean   # 清理缓存并启动`, 'blue');
  }
  console.log('='.repeat(60) + '\n');
}

// 运行主函数
main().catch((error) => {
  log(`\n❌ 健康检查失败: ${error.message}`, 'red');
  process.exit(1);
});
