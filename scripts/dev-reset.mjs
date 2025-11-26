#!/usr/bin/env node

/**
 * 开发环境重置脚本
 * 功能：
 * 1. 杀死占用端口的进程
 * 2. 清理Next.js缓存
 * 3. 清理node_modules/.cache
 * 4. 可选：重新安装依赖
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 配置
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

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

/**
 * 检测端口占用并杀死进程（Windows）
 */
async function killPortWindows(port) {
  try {
    log(`🔍 检查端口 ${port} 是否被占用...`, 'yellow');

    // 查找占用端口的进程
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);

    if (!stdout.trim()) {
      log(`✅ 端口 ${port} 未被占用`, 'green');
      return;
    }

    // 提取PID（最后一列）
    const lines = stdout.trim().split('\n');
    const pids = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        pids.add(pid);
      }
    }

    if (pids.size === 0) {
      log(`✅ 端口 ${port} 未被占用`, 'green');
      return;
    }

    log(`⚠️  发现 ${pids.size} 个进程占用端口 ${port}`, 'yellow');

    // 杀死所有占用端口的进程
    for (const pid of pids) {
      try {
        await execAsync(`taskkill /F /PID ${pid}`);
        log(`✅ 已杀死进程 PID: ${pid}`, 'green');
      } catch (error) {
        log(`⚠️  无法杀死进程 PID: ${pid} (可能需要管理员权限)`, 'yellow');
      }
    }

    // 等待端口释放
    await new Promise(resolve => setTimeout(resolve, 1000));
    log(`✅ 端口 ${port} 已释放`, 'green');

  } catch (error) {
    // 如果命令失败，说明端口未被占用
    log(`✅ 端口 ${port} 未被占用`, 'green');
  }
}

/**
 * 清理Next.js缓存
 */
async function cleanNextCache() {
  const cacheDir = path.join(rootDir, '.next');

  try {
    log('🗑️  清理 .next 缓存目录...', 'yellow');
    await fs.rm(cacheDir, { recursive: true, force: true });
    log('✅ .next 缓存已清理', 'green');
  } catch (error) {
    if (error.code === 'ENOENT') {
      log('ℹ️  .next 目录不存在，跳过', 'blue');
    } else {
      log(`⚠️  清理 .next 失败: ${error.message}`, 'yellow');
    }
  }
}

/**
 * 清理node_modules缓存
 */
async function cleanNodeModulesCache() {
  const cacheDir = path.join(rootDir, 'node_modules', '.cache');

  try {
    log('🗑️  清理 node_modules/.cache...', 'yellow');
    await fs.rm(cacheDir, { recursive: true, force: true });
    log('✅ node_modules/.cache 已清理', 'green');
  } catch (error) {
    if (error.code === 'ENOENT') {
      log('ℹ️  node_modules/.cache 目录不存在，跳过', 'blue');
    } else {
      log(`⚠️  清理缓存失败: ${error.message}`, 'yellow');
    }
  }
}

/**
 * 清理Turbopack缓存
 */
async function cleanTurbopackCache() {
  const cacheDir = path.join(rootDir, '.next', 'cache');

  try {
    log('🗑️  清理 Turbopack 缓存...', 'yellow');
    await fs.rm(cacheDir, { recursive: true, force: true });
    log('✅ Turbopack 缓存已清理', 'green');
  } catch (error) {
    if (error.code === 'ENOENT') {
      log('ℹ️  Turbopack 缓存不存在，跳过', 'blue');
    } else {
      log(`⚠️  清理 Turbopack 缓存失败: ${error.message}`, 'yellow');
    }
  }
}

/**
 * 重新安装依赖（可选）
 */
async function reinstallDependencies() {
  try {
    log('📦 重新安装依赖...', 'yellow');
    log('ℹ️  使用 pnpm install --force', 'blue');

    const { stdout, stderr } = await execAsync('pnpm install --force', {
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (stderr && !stderr.includes('WARN')) {
      log(`⚠️  安装警告: ${stderr}`, 'yellow');
    }

    log('✅ 依赖安装完成', 'green');
  } catch (error) {
    log(`❌ 依赖安装失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldReinstall = args.includes('--reinstall') || args.includes('-r');
  const quickMode = args.includes('--quick') || args.includes('-q');

  logSection('🔄 开发环境重置工具');
  log(`当前目录: ${rootDir}`, 'blue');
  log(`目标端口: ${PORT}`, 'blue');
  log(`模式: ${quickMode ? '快速模式' : shouldReinstall ? '完全重置' : '标准清理'}`, 'blue');

  try {
    // 1. 杀死占用端口的进程
    if (!quickMode) {
      logSection('📍 步骤 1/4: 检查并释放端口');
      await killPortWindows(PORT);
    }

    // 2. 清理Next.js缓存
    logSection(`📍 步骤 ${quickMode ? '1/2' : '2/4'}: 清理Next.js缓存`);
    await cleanNextCache();

    if (!quickMode) {
      // 3. 清理node_modules缓存
      logSection('📍 步骤 3/4: 清理node_modules缓存');
      await cleanNodeModulesCache();
      await cleanTurbopackCache();
    }

    // 4. 重新安装依赖（可选）
    if (shouldReinstall) {
      logSection('📍 步骤 4/4: 重新安装依赖');
      await reinstallDependencies();
    }

    // 完成
    logSection('✅ 重置完成！');
    log('', 'green');
    log('现在可以运行以下命令启动开发服务器:', 'green');
    log('  npm run dev', 'bright');
    log('  或者使用: npm run dev:clean (自动清理+启动)', 'bright');
    log('', 'green');

  } catch (error) {
    logSection('❌ 重置失败');
    log(error.message, 'red');
    process.exit(1);
  }
}

// 显示帮助信息
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${COLORS.bright}开发环境重置工具${COLORS.reset}

${COLORS.cyan}用法:${COLORS.reset}
  node scripts/dev-reset.mjs [选项]

${COLORS.cyan}选项:${COLORS.reset}
  -q, --quick       快速模式（仅清理.next，跳过端口检查和node_modules缓存）
  -r, --reinstall   完全重置（清理后重新安装依赖）
  -h, --help        显示帮助信息

${COLORS.cyan}示例:${COLORS.reset}
  node scripts/dev-reset.mjs              # 标准清理
  node scripts/dev-reset.mjs --quick      # 快速清理
  node scripts/dev-reset.mjs --reinstall  # 完全重置

${COLORS.cyan}推荐的npm命令:${COLORS.reset}
  npm run dev:clean   # 清理后启动开发服务器
  npm run dev:reset   # 完全重置开发环境
`);
  process.exit(0);
}

// 运行主函数
main();
