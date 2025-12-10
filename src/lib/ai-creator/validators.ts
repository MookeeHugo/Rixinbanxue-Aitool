/**
 * 7层验证流程
 *
 * 验证层次（按顺序执行）：
 * 1. Python语法检查
 * 2. 安全检查（代码黑名单）
 * 3. 执行结果检查
 * 4. 输出格式检查
 * 5. 图像质量检查（PNG+SVG）
 * 6. 坐标数据检查
 * 7. 数学正确性检查
 *
 * Codex建议的具体阈值已全部实现
 */

import sharp from 'sharp';
import { spawnSync } from 'child_process';
import { checkImageBlankness } from './image-quality-checker';
import type {
  ValidationResult,
  LayerValidationResult,
  E2BExecutionResult,
  CoordinateData,
  QuestionType,
  GenerationParameters,
} from './types';
import { validateCodeSecurity } from './e2b-sandbox';

// ============================================================================
// 验证阈值配置（Codex建议）
// ============================================================================

const VALIDATION_THRESHOLDS = {
  // 图像尺寸
  png: {
    minWidth: 300,
    maxWidth: 2000,
    minHeight: 200,
    maxHeight: 1500,
    minFileSize: 10 * 1024, // 10KB
    maxFileSize: 2 * 1024 * 1024, // 2MB
  },
  svg: {
    maxFileSize: 1 * 1024 * 1024, // 1MB
    maxNodeCount: 1000, // 节点数限制
  },
  // 宽高比
  aspectRatio: {
    min: 0.5,
    max: 2.5,
  },
  // 坐标范围
  coordinate: {
    min: -10000,
    max: 10000,
  },
  // 数学误差容差
  mathTolerance: 0.1,
} as const;

// ============================================================================
// 验证Pipeline类
// ============================================================================

export class ValidationPipeline {
  private layers: LayerValidationResult[] = [];

  /**
   * 执行完整的7层验证
   */
  async validate(context: {
    pythonCode: string;
    executionResult: E2BExecutionResult;
    coordinates?: CoordinateData;
    questionType: QuestionType;
    parameters: GenerationParameters;
  }): Promise<ValidationResult> {
    this.layers = [];

    // Layer 1: Python语法检查
    const syntaxResult = this.validatePythonSyntax(context.pythonCode);
    this.layers.push(syntaxResult);
    if (!syntaxResult.passed && syntaxResult.critical) {
      return this.buildResult();
    }

    // Layer 2: 安全检查
    const securityResult = this.validateSecurity(context.pythonCode);
    this.layers.push(securityResult);
    if (!securityResult.passed && securityResult.critical) {
      return this.buildResult();
    }

    // Layer 3: 执行结果检查
    const executionResult = this.validateExecution(context.executionResult);
    this.layers.push(executionResult);
    if (!executionResult.passed && executionResult.critical) {
      return this.buildResult();
    }

    // Layer 4: 输出格式检查
    const formatResult = this.validateOutputFormat(context.executionResult);
    this.layers.push(formatResult);
    if (!formatResult.passed && formatResult.critical) {
      return this.buildResult();
    }

    // Layer 5: 图像质量检查
    const qualityResult = await this.validateImageQuality(
      context.executionResult
    );
    this.layers.push(qualityResult);
    // 图像质量问题可能不是关键错误，继续

    // Layer 6: 坐标数据检查
    const coordinateResult = this.validateCoordinates(context.coordinates);
    this.layers.push(coordinateResult);
    // 坐标问题可能不是关键错误，继续

    // Layer 7: 数学正确性检查
    const mathResult = this.validateMathCorrectness(
      context.questionType,
      context.parameters,
      context.coordinates
    );
    this.layers.push(mathResult);

    return this.buildResult();
  }

  /**
   * Layer 1: Python语法检查
   */
  private validatePythonSyntax(code: string): LayerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 检查括号匹配
    const brackets = { '(': 0, '[': 0, '{': 0 };
    for (const char of code) {
      if (char === '(') brackets['(']++;
      if (char === ')') brackets['(']--;
      if (char === '[') brackets['[']++;
      if (char === ']') brackets['[']--;
      if (char === '{') brackets['{']++;
      if (char === '}') brackets['{']--;
    }

    if (brackets['('] !== 0) errors.push('括号不匹配');
    if (brackets['['] !== 0) errors.push('方括号不匹配');
    if (brackets['{'] !== 0) errors.push('花括号不匹配');

    // 2. 检查缩进一致性（简单检查：统计空格和tab混用）
    const lines = code.split('\n');
    const hasSpaces = lines.some((line) => /^\s+/.test(line) && line.startsWith(' '));
    const hasTabs = lines.some((line) => /^\s+/.test(line) && line.startsWith('\t'));

    if (hasSpaces && hasTabs) {
      warnings.push('缩进混用空格和Tab（建议统一使用空格）');
    }

    // 3. 检查必需的函数定义
    if (!code.includes('def generate_diagram():')) {
      errors.push('缺少必需的generate_diagram()函数定义');
    }

    // 4. 检查return语句
    if (!code.includes('return')) {
      errors.push('generate_diagram()函数缺少return语句');
    } else if (!code.includes('return {')) {
      warnings.push('return 语句未返回字典字面量，若返回字符串需能解析为JSON');
    }

    // 5. AST 解析（依赖 python，可选）
    // 先清理可能的孤立代理项（surrogate），避免 Windows 下 UTF-8 编码报错
    const sanitizedCode = code.replace(/[\uDC00-\uDFFF]/g, '');
    if (sanitizedCode.length !== code.length) {
      warnings.push('检测到非法Unicode字符，已在AST检查前移除');
    }

    const astResult = spawnSync('python', ['-c', 'import ast,sys; ast.parse(sys.stdin.read())'], {
      input: sanitizedCode,
      encoding: 'utf-8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      timeout: 2000,
    });
    if (astResult.error && (astResult.error as any).code === 'ENOENT') {
      warnings.push('未找到python解释器，跳过AST检查');
    } else if (astResult.status !== 0) {
      const stderr = astResult.stderr || astResult.stdout || '';
      // 遇到编码错误时降级为警告，不阻断流程
      if (/UnicodeEncodeError/i.test(stderr)) {
        warnings.push(`AST检查因编码问题跳过: ${stderr.trim().slice(0, 200)}`);
      } else {
        errors.push(`Python AST 检查失败: ${stderr.trim().slice(0, 200) || '未知错误'}`);
      }
    }

    return {
      layer: 'syntax',
      passed: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      warning: warnings.join('; '),
      critical: errors.some((e) =>
        e.includes('generate_diagram') ||
        e.includes('return')
      ),
    };
  }

  /**
   * Layer 2: 安全检查
   */
  private validateSecurity(code: string): LayerValidationResult {
    const securityCheck = validateCodeSecurity(code);

    return {
      layer: 'security',
      passed: securityCheck.safe,
      error: securityCheck.reason,
      critical: true, // 安全问题是关键错误
    };
  }

  /**
   * Layer 3: 执行结果检查
   */
  private validateExecution(result: E2BExecutionResult): LayerValidationResult {
    const errors: string[] = [];

    // 检查exit code
    if (result.exit_code !== 0) {
      errors.push(`执行失败，退出码: ${result.exit_code}`);
    }

    // 检查stderr（确保是字符串类型）
    const stderr = typeof result.stderr === 'string' ? result.stderr : '';
    if (stderr.trim().length > 0) {
      errors.push(`有错误输出: ${stderr.slice(0, 200)}`);
    }

    // 检查stdout是否有内容（确保是字符串类型）
    const stdout = typeof result.stdout === 'string' ? result.stdout : '';
    if (stdout.trim().length < 100) {
      errors.push('输出内容过少或为空');
    }

    return {
      layer: 'execution',
      passed: errors.length === 0,
      error: errors.join('; '),
      critical: result.exit_code !== 0,
    };
  }

  /**
   * Layer 4: 输出格式检查
   */
  private validateOutputFormat(result: E2BExecutionResult): LayerValidationResult {
    const errors: string[] = [];

    // 检查是否包含PNG或SVG
    const hasPNG = !!result.png_base64;
    const hasSVG = !!result.svg_base64;
    const base64Limit = 3 * 1024 * 1024; // 约3MB的base64上限

    if (!hasPNG && !hasSVG) {
      errors.push('输出中没有PNG或SVG图像数据');
    }

    // 检查base64格式（简单验证）
    if (hasPNG && !/^[A-Za-z0-9+/=]{100,}$/.test(result.png_base64!)) {
      errors.push('PNG base64格式可能不正确');
    }

    if (hasSVG && !/^[A-Za-z0-9+/=]{100,}$/.test(result.svg_base64!)) {
      errors.push('SVG base64格式可能不正确');
    }

    if (hasPNG && result.png_base64!.length > base64Limit) {
      errors.push('PNG base64数据体积过大，疑似异常输出');
    }

    if (hasSVG && result.svg_base64!.length > base64Limit) {
      errors.push('SVG base64数据体积过大，疑似异常输出');
    }

    return {
      layer: 'format',
      passed: errors.length === 0,
      error: errors.join('; '),
      critical: !hasPNG && !hasSVG,
    };
  }

  /**
   * Layer 5: 图像质量检查
   */
  private async validateImageQuality(
    result: E2BExecutionResult
  ): Promise<LayerValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // PNG检查
      if (result.png_base64) {
        const pngBuffer = Buffer.from(result.png_base64, 'base64');
        const pngMeta = await sharp(pngBuffer).metadata();

        // 尺寸检查
        if (
          pngMeta.width &&
          (pngMeta.width < VALIDATION_THRESHOLDS.png.minWidth ||
            pngMeta.width > VALIDATION_THRESHOLDS.png.maxWidth)
        ) {
          errors.push(
            `PNG宽度${pngMeta.width}px不在范围内（${VALIDATION_THRESHOLDS.png.minWidth}-${VALIDATION_THRESHOLDS.png.maxWidth}px）`
          );
        }

        if (
          pngMeta.height &&
          (pngMeta.height < VALIDATION_THRESHOLDS.png.minHeight ||
            pngMeta.height > VALIDATION_THRESHOLDS.png.maxHeight)
        ) {
          errors.push(
            `PNG高度${pngMeta.height}px不在范围内（${VALIDATION_THRESHOLDS.png.minHeight}-${VALIDATION_THRESHOLDS.png.maxHeight}px）`
          );
        }

        // 文件大小检查
        if (pngBuffer.length < VALIDATION_THRESHOLDS.png.minFileSize) {
          warnings.push('PNG文件大小过小（<10KB），可能为空图像');
        }

        if (pngBuffer.length > VALIDATION_THRESHOLDS.png.maxFileSize) {
          errors.push('PNG文件大小超过2MB限制');
        }

        // 空图检测
        const blankCheck = await checkImageBlankness(pngBuffer);
        if (!blankCheck.ok) {
          errors.push(`PNG可疑为空白图像: ${blankCheck.reason}`);
        } else if (blankCheck.warning) {
          warnings.push(blankCheck.warning);
        }

        // 宽高比检查
        if (pngMeta.width && pngMeta.height) {
          const aspectRatio = pngMeta.width / pngMeta.height;
          if (
            aspectRatio < VALIDATION_THRESHOLDS.aspectRatio.min ||
            aspectRatio > VALIDATION_THRESHOLDS.aspectRatio.max
          ) {
            warnings.push(`宽高比${aspectRatio.toFixed(2)}异常（建议0.5-2.5）`);
          }
        }
      }

      // SVG检查
      if (result.svg_base64) {
        const svgBuffer = Buffer.from(result.svg_base64, 'base64');

        if (svgBuffer.length > VALIDATION_THRESHOLDS.svg.maxFileSize) {
          errors.push('SVG文件大小超过1MB限制');
        }

        // 节点数检查（简单估算）
        const svgContent = svgBuffer.toString('utf-8');
        const nodeCount =
          (svgContent.match(/<path/g) || []).length +
          (svgContent.match(/<circle/g) || []).length +
          (svgContent.match(/<rect/g) || []).length +
          (svgContent.match(/<line/g) || []).length;

        if (nodeCount > VALIDATION_THRESHOLDS.svg.maxNodeCount) {
          warnings.push(`SVG节点数${nodeCount}过多，可能影响性能`);
        }
      }
    } catch (error) {
      errors.push(
        `图像质量检查失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      layer: 'quality',
      passed: errors.length === 0,
      error: errors.join('; '),
      warning: warnings.join('; '),
      critical: false, // 质量问题不是关键错误
    };
  }

  /**
   * Layer 6: 坐标数据检查
   */
  private validateCoordinates(
    coordinates?: CoordinateData
  ): LayerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!coordinates || Object.keys(coordinates).length === 0) {
      warnings.push('未提供坐标数据');
      return {
        layer: 'coordinates',
        passed: true, // 坐标是可选的
        warning: warnings.join('; '),
        critical: false,
      };
    }

    // 检查每个坐标点（避免嵌套解构，防止 undefined 导致异常）
    for (const entry of Object.entries(coordinates)) {
      const label = entry[0];
      const value = entry[1];
      if (!Array.isArray(value) || value.length !== 2) {
        errors.push(`坐标${label}格式非法，应为长度为2的数组`);
        continue;
      }

      const x = value[0];
      const y = value[1];

      if (!isFinite(x) || !isFinite(y)) {
        errors.push(`坐标${label}包含无效数值: [${x}, ${y}]`);
        continue;
      }

      if (
        x < VALIDATION_THRESHOLDS.coordinate.min ||
        x > VALIDATION_THRESHOLDS.coordinate.max ||
        y < VALIDATION_THRESHOLDS.coordinate.min ||
        y > VALIDATION_THRESHOLDS.coordinate.max
      ) {
        errors.push(`坐标${label}超出合理范围: [${x}, ${y}]`);
      }
    }

    return {
      layer: 'coordinates',
      passed: errors.length === 0,
      error: errors.join('; '),
      warning: warnings.join('; '),
      critical: false,
    };
  }

  /**
   * Layer 7: 数学正确性检查（轻量级）
   */
  private validateMathCorrectness(
    questionType: QuestionType,
    parameters: GenerationParameters,
    coordinates?: CoordinateData
  ): LayerValidationResult {
    const errors: string[] = [];

    try {
      // 根据题型进行不同的检查
      if (questionType === 'function') {
        this.validateFunctionMath(parameters as any, coordinates || {}, errors);
      } else if (questionType === 'geometry') {
        this.validateGeometryMath(coordinates || {}, errors);
      } else if (questionType === 'statistics') {
        this.validateStatisticsMath(parameters as any, errors);
      }
    } catch (error) {
      errors.push(
        `数学正确性检查异常: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      layer: 'math',
      passed: errors.length === 0,
      error: errors.join('; '),
      critical: false, // 数学正确性问题可能不是关键错误
    };
  }

  /**
   * 验证函数题的数学正确性
   */
  private validateFunctionMath(
    params: any,
    coordinates: CoordinateData,
    errors: string[]
  ): void {
    // 线性函数：y = ax + b
    if (params.diagram_type === 'linear' || params.coef_a !== undefined) {
      const { coef_a, coef_b } = params;

      for (const entry of Object.entries(coordinates)) {
        const label = entry[0];
        const value = entry[1];
        if (!Array.isArray(value) || value.length !== 2) continue;
        const x = value[0];
        const y = value[1];
        const expectedY = coef_a * x + coef_b;
        const diff = Math.abs(y - expectedY);

        if (diff > VALIDATION_THRESHOLDS.mathTolerance) {
          errors.push(
            `坐标${label}(${x}, ${y})不在函数y=${coef_a}x+${coef_b}上（期望y≈${expectedY.toFixed(2)}）`
          );
        }
      }
    }

    // 二次函数：y = ax² + bx + c
    if (params.diagram_type === 'quadratic' && params.coef_a !== undefined) {
      const { coef_a, coef_b, coef_c } = params;

      for (const entry of Object.entries(coordinates)) {
        const label = entry[0];
        const value = entry[1];
        if (!Array.isArray(value) || value.length !== 2) continue;
        const x = value[0];
        const y = value[1];
        const expectedY = coef_a * x * x + coef_b * x + coef_c;
        const diff = Math.abs(y - expectedY);

        if (diff > VALIDATION_THRESHOLDS.mathTolerance) {
          errors.push(
            `坐标${label}(${x}, ${y})不在函数y=${coef_a}x²+${coef_b}x+${coef_c}上（期望y≈${expectedY.toFixed(2)}）`
          );
        }
      }
    }
  }

  /**
   * 验证几何题的数学正确性
   */
  private validateGeometryMath(
    coordinates: CoordinateData,
    errors: string[]
  ): void {
    const points = Object.values(coordinates).filter(
      (p): p is [number, number] => Array.isArray(p) && p.length === 2
    );

    // 三角形三边关系检查
    if (points.length >= 3) {
      const A = points[0];
      const B = points[1];
      const C = points[2];
      const AB = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const BC = Math.hypot(C[0] - B[0], C[1] - B[1]);
      const CA = Math.hypot(A[0] - C[0], A[1] - C[1]);

      // 三角形不等式
      if (AB + BC <= CA || BC + CA <= AB || CA + AB <= BC) {
        errors.push('三角形三边关系不满足（任意两边之和应大于第三边）');
      }
      const area = Math.abs(
        0.5 *
          (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]))
      );
      if (area < 1e-6) {
        errors.push('三角形面积过小或共线，可能无效图形');
      }
    }

    // 圆：如果包含 center 与 radius 点，检查半径与面积
    const center = (coordinates as any).center as [number, number] | undefined;
    const radiusPoint = (coordinates as any).radius as [number, number] | undefined;
    if (
      Array.isArray(center) &&
      center.length === 2 &&
      Array.isArray(radiusPoint) &&
      radiusPoint.length === 2
    ) {
      const r = Math.hypot(radiusPoint[0] - center[0], radiusPoint[1] - center[1]);
      if (!Number.isFinite(r) || r <= 0) {
        errors.push('圆半径无效或非正数');
      } else {
        const circumference = 2 * Math.PI * r;
        const area = Math.PI * r * r;
        if (!Number.isFinite(circumference) || !Number.isFinite(area)) {
          errors.push('圆周长或面积计算失败');
        }
        if (r > 10000) {
          errors.push('圆半径过大，超出合理范围');
        }
      }
    }

    // 多边形：若提供 polygon 顶点数组，检查面积
    const polygon = (coordinates as any).polygon as Array<[number, number]> | undefined;
    if (Array.isArray(polygon) && polygon.length >= 3) {
      let area = 0;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i] || [];
        const [xj, yj] = polygon[j] || [];
        area += (xj + xi) * (yj - yi);
      }
      area = Math.abs(area / 2);
      if (!Number.isFinite(area) || area < 1e-6) {
        errors.push('多边形面积过小或无效');
      }
      if (area > 1e8) {
        errors.push('多边形面积过大，超出合理范围');
      }
    }
  }

  /**
   * 验证统计题的合理性（轻量级）
   */
  private validateStatisticsMath(params: any, errors: string[]): void {
    const size = Number(params.sample_size ?? 0);
    if (size <= 0 || size > 5000) {
      errors.push('统计题样本量不合理，建议 1-5000');
    }

    const dist = params.distribution;
    const distParams = params.distribution_params || {};

    if (dist === 'normal') {
      const mu = Number(distParams.mu ?? distParams.mean ?? 0);
      const sigma = Number(distParams.sigma ?? distParams.std ?? 1);
      if (!Number.isFinite(mu)) errors.push('正态分布均值无效');
      if (!Number.isFinite(sigma) || sigma <= 0) errors.push('正态分布标准差必须为正');
    } else if (dist === 'uniform') {
      const low = Number(distParams.low ?? distParams.min ?? 0);
      const high = Number(distParams.high ?? distParams.max ?? 1);
      if (!Number.isFinite(low) || !Number.isFinite(high) || low >= high) {
        errors.push('均匀分布参数不合法（需 low < high）');
      }
    } else if (dist === 'poisson') {
      const lam = Number(distParams.lam ?? distParams.lambda ?? distParams.rate ?? 1);
      if (!Number.isFinite(lam) || lam <= 0) errors.push('泊松分布 λ 必须为正');
    } else if (dist === 'binomial') {
      const n = Number(distParams.n ?? distParams.trials ?? 1);
      const p = Number(distParams.p ?? distParams.prob ?? 0.5);
      if (!Number.isInteger(n) || n <= 0) errors.push('二项分布 n 需为正整数');
      if (!Number.isFinite(p) || p < 0 || p > 1) errors.push('二项分布 p 需在 [0,1]');
    } else if (dist === 'exponential') {
      const lam = Number(distParams.lambda ?? distParams.rate ?? 1);
      if (!Number.isFinite(lam) || lam <= 0) errors.push('指数分布 λ 必须为正');
    } else if (dist === 'lognormal') {
      const mu = Number(distParams.mu ?? 0);
      const sigma = Number(distParams.sigma ?? 1);
      if (!Number.isFinite(mu)) errors.push('对数正态均值 mu 无效');
      if (!Number.isFinite(sigma) || sigma <= 0) errors.push('对数正态 sigma 必须为正');
    }
  }

  /**
   * 构建最终验证结果
   */
  private buildResult(): ValidationResult {
    const errors = this.layers
      .filter((layer) => !layer.passed)
      .map((layer) => ({
        layer: layer.layer,
        message: layer.error || '未知错误',
        critical: layer.critical,
      }));

    const warnings = this.layers
      .filter((layer) => layer.warning)
      .map((layer) => ({
        layer: layer.layer,
        message: layer.warning!,
      }));

    return {
      passed: this.layers.every((layer) => layer.passed),
      errors,
      warnings,
      layers: this.layers,
    };
  }
}

// ============================================================================
// 导出默认实例
// ============================================================================

export const validationPipeline = new ValidationPipeline();
