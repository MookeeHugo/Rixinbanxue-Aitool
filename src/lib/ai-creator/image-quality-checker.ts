/**
 * 简单的空白图检测
 */
import sharp from 'sharp';

export async function checkImageBlankness(buffer: Buffer): Promise<{
  ok: boolean;
  warning?: string;
  reason?: string;
}> {
  try {
    const image = sharp(buffer).removeAlpha();
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 采样计算像素方差
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      sum += v;
      sumSq += v * v;
    }
    const n = data.length || 1;
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;

    // 低方差视为可能空白
    if (variance < 5) {
      return { ok: false, reason: `像素方差过低(${variance.toFixed(2)})，疑似空白图` };
    }

    // 过小尺寸警告
    if (info.width < 200 || info.height < 150) {
      return { ok: true, warning: '图像尺寸较小，可能影响可读性' };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: `空白检查失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
