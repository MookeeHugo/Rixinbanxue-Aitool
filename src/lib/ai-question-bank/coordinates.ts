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

  const clampValue = (value: number) => Math.min(1000, Math.max(0, value));
  const safeYmin = clampValue(ymin);
  const safeXmin = clampValue(xmin);
  const safeYmax = clampValue(ymax);
  const safeXmax = clampValue(xmax);

  let top = Math.round((safeYmin / 1000) * meta.height);
  let left = Math.round((safeXmin / 1000) * meta.width);
  let bottom = Math.round((safeYmax / 1000) * meta.height);
  let right = Math.round((safeXmax / 1000) * meta.width);

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
  if (rect.width < 50 || rect.height < 50) {
    return false;
  }

  const ratio = rect.width / rect.height;
  if (ratio > 4 || ratio < 0.25) {
    return false;
  }

  if (meta.width > 0 && meta.height > 0) {
    if (rect.width > meta.width * 0.9 && rect.height > meta.height * 0.9) {
      return false;
    }
  }

  return true;
}
