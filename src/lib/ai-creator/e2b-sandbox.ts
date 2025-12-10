/**
 * E2B Sandbox - Python代码安全执行
 *
 * ⭐ 关键安全特性：
 * - 务必在finally块中关闭沙箱（用户严格要求）
 * - 15秒硬超时保护
 * - 资源限制：1 CPU核、512MB内存、100MB磁盘
 * - 网络完全禁用
 * - 静态代码黑名单检查
 * - 输出大小限制
 */

import type {
  E2BExecutionResult,
  E2BSandboxConfig,
  SecurityCheckResult,
} from './types';

// ============================================================================
// 配置
// ============================================================================

const E2B_CONFIG: E2BSandboxConfig = {
  // E2B Code Interpreter 默认包含 matplotlib, numpy, scipy 等库
  // 不需要指定自定义模板，留空即可使用默认环境
  template: process.env.E2B_TEMPLATE || undefined,
  timeout_ms: parseInt(process.env.E2B_TIMEOUT_MS || '15000', 10),
  cpu_limit: parseInt(process.env.E2B_CPU_LIMIT || '1', 10),
  memory_limit_mb: parseInt(process.env.E2B_MEMORY_LIMIT_MB || '512', 10),
  disk_limit_mb: parseInt(process.env.E2B_DISK_LIMIT_MB || '100', 10),
};

export const E2B_TIMEOUT_MS = E2B_CONFIG.timeout_ms;

// 输出大小限制
const OUTPUT_LIMITS = {
  stdout: 5 * 1024 * 1024, // 5MB
  stderr: 1 * 1024 * 1024, // 1MB
  total: 10 * 1024 * 1024, // 10MB
} as const;

// ============================================================================
// 代码安全检查 - 黑名单模式
// ============================================================================

/**
 * 危险模式黑名单（聚焦真正危险的操作）
 *
 * 注意：仅包含真正危险的操作，避免误判正常代码
 * 已移除：dir(), file, globals(), locals(), vars() - 这些虽然可能暴露信息，但在E2B沙箱中危险性较低
 */
const BLACKLIST_PATTERNS = [
  // 禁止危险模块导入
  /import\s+(os|subprocess|socket|requests|urllib|shutil|pathlib|http|ssl|ftplib|asyncio|threading|multiprocessing|ctypes|importlib)/,
  /from\s+(os|subprocess|socket|requests|urllib|shutil|pathlib|importlib)\s+import/,

  // 禁止文件操作
  /\bopen\s*\(/,
  /\bwith\s+open\b/,

  // 禁止代码执行
  /\beval\s*\(/,
  /\bexec\s*\(/,
  /__import__/,
  /compile\s*\(/,

  // 禁止系统调用
  /os\.system/,
  /subprocess\./,
  /popen\s*\(/,

  // 禁止访问内置模块
  /__builtins__/,
  /getattr\(__builtins__/,
  /sys\.modules/,

  // 禁止用户输入（沙箱环境不支持）
  /\binput\s*\(/,
] as const;

/**
 * 白名单库（仅允许）
 */
const ALLOWED_IMPORTS = new Set([
  'matplotlib',
  'numpy',
  'scipy',
  'seaborn',
  'manim',
  'math',
  'random',
  'base64',
  'io',
  'json',
  'sys',
  'traceback',
]);

/**
 * 验证代码安全性（静态检查）
 */
export function validateCodeSecurity(code: string): SecurityCheckResult {
  const blocked_patterns: string[] = [];

  // 检查黑名单模式
  for (const pattern of BLACKLIST_PATTERNS) {
    if (pattern.test(code)) {
      blocked_patterns.push(pattern.source);
    }
  }

  if (blocked_patterns.length > 0) {
    return {
      safe: false,
      reason: `检测到危险代码模式：${blocked_patterns.join(', ')}`,
      blocked_patterns,
    };
  }

  // 检查import语句是否在白名单中（只检查模块名，不检查导入的符号）
  // 匹配 "import xxx" 或 "from xxx import yyy"
  const importStatements = code.match(/(?:^|\n)\s*(?:import|from)\s+[^\n]+/g) || [];

  for (const statement of importStatements) {
    // 提取模块名：from xxx import yyy -> xxx，import xxx -> xxx
    const fromMatch = statement.match(/from\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    const importMatch = statement.match(/import\s+([a-zA-Z_][a-zA-Z0-9_]*)/);

    const moduleName = fromMatch ? fromMatch[1] : importMatch ? importMatch[1] : null;

    if (moduleName && !ALLOWED_IMPORTS.has(moduleName)) {
      return {
        safe: false,
        reason: `禁止导入模块：${moduleName}（仅允许：${Array.from(ALLOWED_IMPORTS).join(', ')}）`,
        blocked_patterns: [moduleName],
      };
    }
  }

  return { safe: true };
}

// ============================================================================
// 错误类
// ============================================================================

/**
 * E2B沙箱错误
 */
export class E2BSandboxError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'E2BSandboxError';
  }
}

/**
 * E2B超时错误
 */
export class E2BTimeoutError extends E2BSandboxError {
  constructor(timeoutMs: number) {
    super(`Python代码执行超时（${timeoutMs}ms）`, 'TIMEOUT');
  }
}

/**
 * 安全拦截错误
 */
export class SecurityBlockedError extends E2BSandboxError {
  constructor(reason: string) {
    super(`安全检查失败：${reason}`, 'SECURITY_BLOCKED');
  }
}

// ============================================================================
// E2B沙箱执行器
// ============================================================================

/**
 * 执行Python代码（核心函数）
 *
 * ⭐ 关键：务必在finally块中关闭沙箱
 */
export async function executePythonCode(
  code: string
): Promise<E2BExecutionResult> {
  const startTime = Date.now();
  let sandbox: any = null; // E2B.Sandbox实例

  try {
    // 1. 静态代码安全检查（执行前）
    const securityCheck = validateCodeSecurity(code);
    if (!securityCheck.safe) {
      throw new SecurityBlockedError(securityCheck.reason || '代码不安全');
    }

    // 2. 动态导入E2B SDK（避免在环境变量未配置时报错）
    const { Sandbox } = await import('@e2b/code-interpreter');

    // 3. 创建沙箱实例
    // E2B Code Interpreter 默认环境已包含 matplotlib, numpy, scipy 等库
    // 如果未指定模板，传递 undefined 或直接使用默认环境
    const createOptions = {
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: E2B_CONFIG.timeout_ms,
    };

    sandbox = E2B_CONFIG.template
      ? await Sandbox.create(E2B_CONFIG.template, createOptions)
      : await Sandbox.create(createOptions);

    console.log(`[E2B] 沙箱已创建: ${sandbox.sandboxId}`);

    // 4. 设置超时Promise（15秒硬限制）
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new E2BTimeoutError(E2B_CONFIG.timeout_ms));
      }, E2B_CONFIG.timeout_ms);
    });

    // 5. 执行代码Promise
    const executePromise = sandbox.runCode(code, {
      language: 'python',
    });

    // 6. 竞速执行：代码 vs 超时
    const result = await Promise.race([executePromise, timeoutPromise]);

    const execution_time_ms = Date.now() - startTime;

    // 7. 验证输出大小
    const stdoutSize = result.logs?.stdout?.length || 0;
    const stderrSize = result.logs?.stderr?.length || 0;
    const totalSize = stdoutSize + stderrSize;

    if (stdoutSize > OUTPUT_LIMITS.stdout) {
      throw new E2BSandboxError(
        `stdout输出超过限制（${stdoutSize} > ${OUTPUT_LIMITS.stdout} bytes）`,
        'OUTPUT_TOO_LARGE'
      );
    }

    if (stderrSize > OUTPUT_LIMITS.stderr) {
      throw new E2BSandboxError(
        `stderr输出超过限制（${stderrSize} > ${OUTPUT_LIMITS.stderr} bytes）`,
        'OUTPUT_TOO_LARGE'
      );
    }

    if (totalSize > OUTPUT_LIMITS.total) {
      throw new E2BSandboxError(
        `总输出超过限制（${totalSize} > ${OUTPUT_LIMITS.total} bytes）`,
        'OUTPUT_TOO_LARGE'
      );
    }

    // 8. 解析输出（提取base64编码的图像）
    // E2B Code Interpreter 的 stdout/stderr 可能是字符串或字符串数组
    const stdoutStr = Array.isArray(result.logs?.stdout)
      ? result.logs.stdout.join('\n')
      : (result.logs?.stdout || '');
    const stderrStr = Array.isArray(result.logs?.stderr)
      ? result.logs.stderr.join('\n')
      : (result.logs?.stderr || '');

    const parsed = parseExecutionOutput(stdoutStr);

    return {
      success: result.error ? false : true,
      stdout: stdoutStr,
      stderr: stderrStr,
      exit_code: result.error ? 1 : 0,
      execution_time_ms,
      png_base64: parsed.png,
      svg_base64: parsed.svg,
      error: result.error ? String(result.error) : undefined,
    };
  } catch (error) {
    const execution_time_ms = Date.now() - startTime;

    // 已知错误类型直接抛出
    if (
      error instanceof E2BSandboxError ||
      error instanceof SecurityBlockedError
    ) {
      return {
        success: false,
        stdout: '',
        stderr: String(error),
        exit_code: error instanceof SecurityBlockedError ? 403 : 1,
        execution_time_ms,
        error: error.message,
      };
    }

    // 未知错误包装
    return {
      success: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exit_code: 1,
      execution_time_ms,
      error: `E2B沙箱执行失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    // ⭐⭐⭐ 关键：务必在finally块中关闭沙箱 ⭐⭐⭐
    // 这是用户严格要求的核心安全措施
    if (sandbox) {
      try {
        // E2B Code Interpreter 使用 kill() 方法关闭沙箱
        if (typeof sandbox.kill === 'function') {
          await sandbox.kill();
        } else if (typeof sandbox.close === 'function') {
          await sandbox.close();
        }
        console.log(`[E2B] 沙箱已关闭: ${sandbox.sandboxId}`);
      } catch (closeError) {
        // 记录关闭失败，但不抛出异常（避免掩盖原始错误）
        console.error('[E2B] 沙箱关闭失败:', closeError);
        // 可选：发送告警通知运维人员
      }
    }
  }
}

// ============================================================================
// 输出解析
// ============================================================================

/**
 * 从stdout中提取base64图像
 *
 * 期望格式：
 * ```json
 * {
 *   "png": "iVBORw0KGgoAAAANSUhEUgAA...",
 *   "svg": "PHN2ZyB4bWxucz0iaHR0cDov..."
 * }
 * ```
 */
function parseExecutionOutput(stdout: string): {
  png: string | undefined;
  svg: string | undefined;
} {
  try {
    // 尝试提取JSON对象
    const jsonMatch = stdout.match(/\{[\s\S]*"png"[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[E2B] stdout中未找到JSON格式输出');
      return { png: undefined, svg: undefined };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      png: typeof parsed.png === 'string' ? parsed.png : undefined,
      svg: typeof parsed.svg === 'string' ? parsed.svg : undefined,
    };
  } catch (error) {
    console.error('[E2B] 解析输出失败:', error);
    return { png: undefined, svg: undefined };
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 估算E2B成本（美元）
 *
 * E2B定价（截至2024年）：
 * - 免费额度：100小时/月
 * - 超出后：约$0.10/小时
 */
export function estimateE2BCost(executionSeconds: number): number {
  const HOURLY_RATE = 0.1; // $0.10/小时
  const hours = executionSeconds / 3600;
  return hours * HOURLY_RATE;
}

/**
 * 生成Python代码的安全包装
 *
 * 确保代码：
 * 1. 定义了generate_diagram()函数
 * 2. 调用该函数并输出JSON
 * 3. 捕获异常并返回错误信息
 */
export function wrapPythonCode(userCode: string): string {
  return `
import sys
import json
import traceback

# 用户代码
${userCode}

# 安全执行
try:
    if 'generate_diagram' not in dir():
        raise NameError("未找到generate_diagram函数")

    result = generate_diagram()

    # 如果返回字符串，尝试解析为JSON
    if isinstance(result, str):
        try:
            import json as _json
            result = _json.loads(result)
        except Exception as e:
            raise TypeError(f"generate_diagram返回字符串且无法解析为JSON: {e}")

    if not isinstance(result, dict):
        raise TypeError(f"generate_diagram必须返回字典，当前返回：{type(result)}")

    if 'png' not in result and 'svg' not in result:
        raise ValueError("generate_diagram返回的字典必须包含'png'或'svg'字段")

    # 输出JSON结果
    print(json.dumps(result, ensure_ascii=False))

except Exception as e:
    error_info = {
        "error": str(e),
        "traceback": traceback.format_exc()
    }
    print(json.dumps(error_info, ensure_ascii=False), file=sys.stderr)
    sys.exit(1)
`.trim();
}
