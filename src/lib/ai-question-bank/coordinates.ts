import type { ImageRegion } from './types';

export type NormalizedBox = [number, number, number, number];

export interface ImageMeta {
  width: number;
  height: number;
}

export interface PixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const MIN_PADDING = 20;
const PADDING_RATIO = 0.02;
const NORMALIZED_SCALE = 1000;

/**
 * 归一化坐标（0-1000）转换为像素裁剪区域，并自动追加 padding
 */
export function convertBoxToPixelRect(
  box: NormalizedBox,
  meta: ImageMeta,
  padding?: number
): PixelRect | null {
  if (!meta.width || !meta.height) {
    return null;
  }

  const [ymin, xmin, ymax, xmax] = box;
  if (![ymin, xmin, ymax, xmax].every(value => Number.isFinite(value))) {
    return null;
  }

  const clampValue = (value: number) => Math.min(NORMALIZED_SCALE, Math.max(0, value));
  const safeYmin = clampValue(ymin);
  const safeXmin = clampValue(xmin);
  const safeYmax = clampValue(ymax);
  const safeXmax = clampValue(xmax);

  // P0修复: 验证坐标逻辑性 (ymax > ymin && xmax > xmin)
  if (safeYmax <= safeYmin || safeXmax <= safeXmin) {
    console.warn('[coordinates] 拒绝逆序或零尺寸坐标', {
      box: [ymin, xmin, ymax, xmax],
      safeBox: [safeYmin, safeXmin, safeYmax, safeXmax],
      reason: safeYmax <= safeYmin ? 'ymax <= ymin' : 'xmax <= xmin'
    });
    return null;
  }

  let top = Math.round((safeYmin / NORMALIZED_SCALE) * meta.height);
  let left = Math.round((safeXmin / NORMALIZED_SCALE) * meta.width);
  let bottom = Math.round((safeYmax / NORMALIZED_SCALE) * meta.height);
  let right = Math.round((safeXmax / NORMALIZED_SCALE) * meta.width);

  const effectivePadding =
    typeof padding === 'number'
      ? padding
      : Math.max(MIN_PADDING, Math.round(Math.min(meta.width, meta.height) * PADDING_RATIO));

  top = Math.max(0, top - effectivePadding);
  left = Math.max(0, left - effectivePadding);
  bottom = Math.min(meta.height, bottom + effectivePadding);
  right = Math.min(meta.width, right + effectivePadding);

  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { left, top, width, height };
}

export function rectFromImageRegion(region: ImageRegion): PixelRect {
  return {
    left: region.x,
    top: region.y,
    width: region.width,
    height: region.height
  };
}

export function isValidImageBox(rect: PixelRect, meta: ImageMeta): boolean {
  const hasMeta = meta.width > 0 && meta.height > 0;
  const minDimensionRatioRaw = Number.parseFloat(process.env.CROP_MIN_DIMENSION_RATIO || '0.006');
  const maxAspectRatioEnv = Number.parseFloat(process.env.CROP_MAX_ASPECT_RATIO || '18');
  const fullImageThresholdEnv = Number.parseFloat(process.env.CROP_FULL_IMAGE_THRESHOLD || '0.97');

  const minDimensionRatio =
    Number.isFinite(minDimensionRatioRaw) && minDimensionRatioRaw > 0
      ? minDimensionRatioRaw
      : 0.015;

  const maxAspectRatio =
    Number.isFinite(maxAspectRatioEnv) && maxAspectRatioEnv > 0 ? maxAspectRatioEnv : 10;
  const fullImageThreshold =
    Number.isFinite(fullImageThresholdEnv) && fullImageThresholdEnv > 0
      ? fullImageThresholdEnv
      : 0.99;

  const minDimension = hasMeta
    ? Math.max(20, Math.round(Math.min(meta.width, meta.height) * minDimensionRatio))
    : 20;

  if (rect.width < minDimension || rect.height < minDimension) {
    return false;
  }

  const ratio = rect.width / Math.max(1, rect.height);
  const minRatio = 1 / maxAspectRatio;
  if (ratio > maxAspectRatio || ratio < minRatio) {
    return false;
  }

  if (hasMeta) {
    const almostFullWidth = rect.width >= meta.width * fullImageThreshold;
    const almostFullHeight = rect.height >= meta.height * fullImageThreshold;

    if (almostFullWidth && almostFullHeight) {
      return false;
    }
  }

  return true;
}
