#!/usr/bin/env node

/**
 * 一键启动开发服务器
 * 功能：
 * 1. 自动检查并清理端口
 * 2. 清理缓存（可选）
 * 3. 健康检查
 * 4. 启动开发服务器
 * 5. 自动打开浏览器
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';

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
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

/**
 * 检查端口是否可用
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // 端口被占用
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true); // 端口可用
    });

    server.listen(port);
  });
}

/**
 * 杀死占用端口的进程
 */
async function killPort(port) {
  try {
    log(`🔍 检查端口 ${port}...`, 'yellow');

    const isAvailable = await checkPort(port);
    if (isAvailable) {
      log(`✅ 端口 ${port} 可用`, 'green');
      return;
    }

    log(`⚠️  端口 ${port} 被占用，正在清理...`, 'yellow');

    // Windows: 使用netstat查找并杀死进程
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);

    if (!stdout.trim()) {
      log(`✅ 端口 ${port} 已释放`, 'green');
      return;
    }

    const lines = stdout.trim().split('\n');
    const pids = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      try {
        await execAsync(`taskkill /F /PID ${pid}`);
        log(`✅ 已杀死进程 PID: ${pid}`, 'green');
      } catch (error) {
        // 忽略错误
      }
    }

    // 等待端口释放
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 再次检查
    const isNowAvailable = await checkPort(port);
    if (isNowAvailable) {
      log(`✅ 端口 ${port} 已成功释放`, 'green');
    } else {
      log(`⚠️  端口 ${port} 仍被占用，但将尝试启动`, 'yellow');
    }

  } catch (error) {
    log(`✅ 端口 ${port} 可用`, 'green');
  }
}

/**
 * 快速清理缓存
 */
async function quickClean() {
  try {
    log('🗑️  快速清理缓存...', 'yellow');
    await execAsync('node scripts/dev-reset.mjs --quick', { cwd: rootDir });
    log('✅ 缓存清理完成', 'green');
  } catch (error) {
    log(`⚠️  缓存清理失败，继续启动: ${error.message}`, 'yellow');
  }
}

async function runLogMaintenance() {
  try {
    log('🗂️ 执行 log-maintenance 脚本...', 'yellow');
    await execAsync('node scripts/log-maintenance.mjs', { cwd: rootDir });
    log('✅ log-maintenance 完成', 'green');
  } catch (error) {
    log(`⚠️  log-maintenance 执行失败: ${error.message}`, 'yellow');
  }
}

/**
 * 启动开发服务器
 */
async function startDevServer(useTurbo = false) {
  return new Promise((resolve, reject) => {
    log('\n🚀 启动开发服务器...', 'cyan');
    log(`📡 服务器将在 http://localhost:${PORT} 启动`, 'blue');
    log('', 'reset');

    const command = useTurbo ? 'npm' : 'npm';
    const args = useTurbo ? ['run', 'dev'] : ['run', 'dev:legacy'];

    const devProcess = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });

    devProcess.on('error', (error) => {
      log(`❌ 启动失败: ${error.message}`, 'red');
      reject(error);
    });

    // 监听进程退出
    devProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        log(`\n⚠️  开发服务器异常退出 (代码: ${code})`, 'yellow');
      }
    });

    // 等待一段时间后检查服务器是否启动
    setTimeout(async () => {
      const isRunning = !(await checkPort(PORT));
      if (isRunning) {
        log(`\n✅ 开发服务器已启动！`, 'green');
        log(`🌐 访问: ${COLORS.bright}http://localhost:${PORT}${COLORS.reset}`, 'green');

        // 尝试自动打开浏览器
        try {
          await execAsync(`start http://localhost:${PORT}`);
        } catch (error) {
          // 忽略浏览器打开失败
        }
      }
      resolve();
    }, 5000);

    // 捕获Ctrl+C信号
    process.on('SIGINT', () => {
      log('\n\n⏹️  正在关闭开发服务器...', 'yellow');
      devProcess.kill('SIGINT');
      process.exit(0);
    });
  });
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldClean = args.includes('--clean') || args.includes('-c');
  const noTurbo = args.includes('--no-turbo') || args.includes('-nt');

  console.log('\n' + '='.repeat(60));
  log('🚀 开发服务器启动工具', 'cyan');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. 检查并清理端口
    await killPort(PORT);

    // 2. 清理缓存（可选）
    if (shouldClean) {
      await quickClean();
      await runLogMaintenance();
    }

    // 3. 启动开发服务器
    await startDevServer(!noTurbo);

  } catch (error) {
    log(`\n❌ 启动失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 显示帮助信息
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${COLORS.bright}开发服务器启动工具${COLORS.reset}

${COLORS.cyan}用法:${COLORS.reset}
  node scripts/dev-start.mjs [选项]

${COLORS.cyan}选项:${COLORS.reset}
  -c, --clean       启动前清理缓存
  -nt, --no-turbo   不使用Turbo模式
  -h, --help        显示帮助信息

${COLORS.cyan}示例:${COLORS.reset}
  node scripts/dev-start.mjs              # 快速启动
  node scripts/dev-start.mjs --clean      # 清理后启动
  node scripts/dev-start.mjs --no-turbo   # 使用传统模式启动

${COLORS.cyan}推荐的npm命令:${COLORS.reset}
  npm run dev:clean   # 清理缓存后启动（推荐）
  npm run dev:quick   # 仅检查端口后快速启动
`);
  process.exit(0);
}

// 运行主函数
main();
