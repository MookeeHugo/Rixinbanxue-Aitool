/**
 * SVG安全净化
 *
 * 功能：
 * - 使用DOMPurify净化SVG内容，防止XSS攻击
 * - 移除危险标签和属性
 * - 保留数学图形必要的SVG元素
 *
 * 安全策略（Codex建议）：
 * - 禁止：script、iframe、object、embed、foreignObject
 * - 禁止：onerror、onload、onclick、onmouseover等事件属性
 * - 允许：SVG核心标签、滤镜、渐变
 */

import DOMPurify from 'isomorphic-dompurify';

// ============================================================================
// 配置
// ============================================================================

/**
 * DOMPurify配置（针对SVG优化）
 */
const PURIFY_CONFIG = {
  // 使用SVG配置文件
  USE_PROFILES: { svg: true, svgFilters: true },

  // 允许的标签（SVG核心元素）
  ADD_TAGS: [
    'use',
    'defs',
    'pattern',
    'linearGradient',
    'radialGradient',
    'stop',
    'marker',
    'clipPath',
    'mask',
  ],

  // 禁止的标签（安全风险）
  FORBID_TAGS: [
    'script',
    'iframe',
    'object',
    'embed',
    'foreignObject',
    'audio',
    'video',
    'link',
    'style', // 防止CSS注入
  ],

  // 禁止的属性（事件处理器）
  FORBID_ATTR: [
    'onerror',
    'onload',
    'onclick',
    'onmouseover',
    'onmouseout',
    'onmousemove',
    'onmousedown',
    'onmouseup',
    'onkeydown',
    'onkeyup',
    'onkeypress',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit',
    'href', // 防止javascript:协议
    'xlink:href',
    'style',
  ],

  // 保持安全的自定义属性
  KEEP_CONTENT: false,

  // 返回DOM而不是字符串（更安全）
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,

  // 强制属性（可选）
  FORCE_BODY: false,
};

// ============================================================================
// 净化函数
// ============================================================================

/**
 * 净化SVG内容
 *
 * @param svgContent - 原始SVG内容（字符串）
 * @returns 净化后的安全SVG内容
 *
 * @example
 * const safeSVG = sanitizeSVG('<svg>...</svg>');
 */
export function sanitizeSVG(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') {
    throw new Error('SVG内容必须是非空字符串');
  }

  // 使用DOMPurify净化
  const cleaned = DOMPurify.sanitize(svgContent, PURIFY_CONFIG);

  // 验证净化后的内容不为空
  if (!cleaned || cleaned.trim().length === 0) {
    throw new Error('SVG净化后内容为空，可能包含危险元素');
  }

  // 验证仍然是有效的SVG
  if (!cleaned.includes('<svg')) {
    throw new Error('净化后的内容不是有效的SVG');
  }

  return cleaned;
}

/**
 * 净化base64编码的SVG
 *
 * @param svgBase64 - base64编码的SVG
 * @returns 净化后的base64编码SVG
 */
export function sanitizeSVGBase64(svgBase64: string): string {
  try {
    // 解码base64
    const svgContent = Buffer.from(svgBase64, 'base64').toString('utf-8');

    // 净化
    const cleaned = sanitizeSVG(svgContent);

    // 重新编码
    return Buffer.from(cleaned, 'utf-8').toString('base64');
  } catch (error) {
    throw new Error(
      `SVG Base64净化失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ============================================================================
// 验证函数
// ============================================================================

/**
 * 验证SVG大小
 */
export function validateSVGSize(
  svgContent: string,
  maxSizeBytes: number = 1 * 1024 * 1024 // 1MB
): { valid: boolean; size: number; error?: string } {
  const size = Buffer.byteLength(svgContent, 'utf-8');

  if (size > maxSizeBytes) {
    return {
      valid: false,
      size,
      error: `SVG大小超过限制（${size} > ${maxSizeBytes} bytes）`,
    };
  }

  return { valid: true, size };
}

/**
 * 验证SVG节点数（防止过于复杂的SVG）
 */
export function validateSVGComplexity(
  svgContent: string,
  maxNodes: number = 1000
): { valid: boolean; nodeCount: number; error?: string } {
  // 简单估算：统计标签数量
  const tagMatches = svgContent.match(/<[^>]+>/g);
  const nodeCount = tagMatches ? tagMatches.length : 0;

  if (nodeCount > maxNodes) {
    return {
      valid: false,
      nodeCount,
      error: `SVG节点数超过限制（${nodeCount} > ${maxNodes}）`,
    };
  }

  return { valid: true, nodeCount };
}

/**
 * 检查SVG中是否包含危险模式
 */
export function checkDangerousPatterns(svgContent: string): {
  safe: boolean;
  patterns: string[];
} {
  const dangerousPatterns = [
    /javascript:/i,
    /data:text\/html/i,
    /<script/i,
    /onerror=/i,
    /onload=/i,
    /onclick=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<foreignObject/i,
  ];

  const foundPatterns: string[] = [];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(svgContent)) {
      foundPatterns.push(pattern.source);
    }
  }

  return {
    safe: foundPatterns.length === 0,
    patterns: foundPatterns,
  };
}

// ============================================================================
// 综合净化与验证
// ============================================================================

/**
 * 综合净化与验证SVG
 *
 * 流程：
 * 1. 检查危险模式
 * 2. 验证大小
 * 3. 验证复杂度
 * 4. DOMPurify净化
 * 5. 再次验证结果
 */
export function sanitizeAndValidateSVG(
  svgContent: string,
  options?: {
    maxSizeBytes?: number;
    maxNodes?: number;
  }
): {
  success: boolean;
  cleaned?: string;
  errors: string[];
  warnings: string[];
  metadata: {
    originalSize: number;
    cleanedSize?: number;
    nodeCount: number;
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const originalSize = Buffer.byteLength(svgContent, 'utf-8');

  try {
    // 1. 检查危险模式
    const dangerousCheck = checkDangerousPatterns(svgContent);
    if (!dangerousCheck.safe) {
      errors.push(
        `SVG包含危险模式：${dangerousCheck.patterns.join(', ')}`
      );
      return {
        success: false,
        errors,
        warnings,
        metadata: { originalSize, nodeCount: 0 },
      };
    }

    // 2. 验证大小
    const sizeCheck = validateSVGSize(
      svgContent,
      options?.maxSizeBytes
    );
    if (!sizeCheck.valid) {
      errors.push(sizeCheck.error!);
    }

    // 3. 验证复杂度
    const complexityCheck = validateSVGComplexity(
      svgContent,
      options?.maxNodes
    );
    if (!complexityCheck.valid) {
      warnings.push(complexityCheck.error!);
    }

    // 如果有严重错误，停止
    if (errors.length > 0) {
      return {
        success: false,
        errors,
        warnings,
        metadata: {
          originalSize,
          nodeCount: complexityCheck.nodeCount,
        },
      };
    }

    // 4. DOMPurify净化
    const cleaned = sanitizeSVG(svgContent);
    const cleanedSize = Buffer.byteLength(cleaned, 'utf-8');

    // 5. 检查净化前后大小差异
    const sizeDiff = originalSize - cleanedSize;
    if (sizeDiff > originalSize * 0.1) {
      // 如果减少超过10%，可能删除了重要内容
      warnings.push(
        `SVG净化后大小减少${((sizeDiff / originalSize) * 100).toFixed(1)}%，请检查是否影响显示`
      );
    }

    return {
      success: true,
      cleaned,
      errors,
      warnings,
      metadata: {
        originalSize,
        cleanedSize,
        nodeCount: complexityCheck.nodeCount,
      },
    };
  } catch (error) {
    errors.push(
      `SVG净化过程出错: ${error instanceof Error ? error.message : String(error)}`
    );

    return {
      success: false,
      errors,
      warnings,
      metadata: { originalSize, nodeCount: 0 },
    };
  }
}

// ============================================================================
// CSP (Content Security Policy) 建议
// ============================================================================

/**
 * 推荐的CSP策略（用于HTML页面）
 *
 * 在Next.js中配置：
 * ```typescript
 * // next.config.js
 * const cspHeader = `
 *   default-src 'self';
 *   script-src 'self' 'unsafe-eval' 'unsafe-inline';
 *   style-src 'self' 'unsafe-inline';
 *   img-src 'self' blob: data:;
 *   object-src 'none';
 *   base-uri 'self';
 *   form-action 'self';
 *   frame-ancestors 'none';
 *   upgrade-insecure-requests;
 * `;
 * ```
 */
export const RECOMMENDED_CSP_FOR_SVG = `
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`.replace(/\s+/g, ' ').trim();
