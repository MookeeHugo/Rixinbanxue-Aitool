#!/usr/bin/env node
/**
 * Test coordinate conversion logic to diagnose cropping failures
 */

const NORMALIZED_SCALE = 1000;
const MIN_PADDING = 20;
const PADDING_RATIO = 0.02;

function convertBoxToPixelRect(box, meta, padding) {
  if (!meta.width || !meta.height) {
    return null;
  }

  const [ymin, xmin, ymax, xmax] = box;
  if (![ymin, xmin, ymax, xmax].every(value => Number.isFinite(value))) {
    return null;
  }

  const clampValue = (value) => Math.min(NORMALIZED_SCALE, Math.max(0, value));
  const safeYmin = clampValue(ymin);
  const safeXmin = clampValue(xmin);
  const safeYmax = clampValue(ymax);
  const safeXmax = clampValue(xmax);

  let top = Math.round((safeYmin / NORMALIZED_SCALE) * meta.height);
  let left = Math.round((safeXmin / NORMALIZED_SCALE) * meta.width);
  let bottom = Math.round((safeYmax / NORMALIZED_SCALE) * meta.height);
  let right = Math.round((safeXmax / NORMALIZED_SCALE) * meta.width);

  const effectivePadding =
    typeof padding === 'number'
      ? padding
      : Math.max(MIN_PADDING, Math.round(Math.min(meta.width, meta.height) * PADDING_RATIO));

  console.log(`  Before padding: top=${top}, left=${left}, bottom=${bottom}, right=${right}`);
  console.log(`  Effective padding: ${effectivePadding}px`);

  top = Math.max(0, top - effectivePadding);
  left = Math.max(0, left - effectivePadding);
  bottom = Math.min(meta.height, bottom + effectivePadding);
  right = Math.min(meta.width, right + effectivePadding);

  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) {
    console.log(`  ❌ REJECTED: width=${width}, height=${height} (must be > 0)`);
    return null;
  }

  const result = { left, top, width, height };
  console.log(`  ✅ VALID: left=${left}, top=${top}, width=${width}, height=${height}`);
  return result;
}

function isValidImageBox(rect, meta) {
  const hasMeta = meta.width > 0 && meta.height > 0;
  const minDimension = hasMeta
    ? Math.max(24, Math.round(Math.min(meta.width, meta.height) * 0.025))
    : 24;

  if (rect.width < minDimension || rect.height < minDimension) {
    console.log(`  ❌ FILTER: Too small (width=${rect.width}, height=${rect.height}, min=${minDimension})`);
    return false;
  }

  const ratio = rect.width / Math.max(1, rect.height);
  const MAX_RATIO = 6;
  const MIN_RATIO = 1 / MAX_RATIO;
  if (ratio > MAX_RATIO || ratio < MIN_RATIO) {
    console.log(`  ❌ FILTER: Aspect ratio too extreme (ratio=${ratio.toFixed(2)}, must be ${MIN_RATIO.toFixed(2)}-${MAX_RATIO})`);
    return false;
  }

  if (hasMeta) {
    const almostFullWidth = rect.width >= meta.width * 0.98;
    const almostFullHeight = rect.height >= meta.height * 0.98;

    if (almostFullWidth && almostFullHeight) {
      console.log(`  ❌ FILTER: Almost full image (width=${rect.width}/${meta.width}, height=${rect.height}/${meta.height})`);
      return false;
    }
  }

  console.log(`  ✅ FILTER PASSED`);
  return true;
}

// Test cases
const testCases = [
  {
    name: 'Normal case (0-1000 scale)',
    box: [100, 100, 300, 500],
    meta: { width: 1133, height: 1594 }
  },
  {
    name: 'Small box (potential rounding issue)',
    box: [50, 50, 100, 150],
    meta: { width: 1133, height: 1594 }
  },
  {
    name: 'Inverted coordinates (ymax < ymin)',
    box: [300, 100, 100, 500],
    meta: { width: 1133, height: 1594 }
  },
  {
    name: 'Zero-sized box',
    box: [100, 100, 100, 100],
    meta: { width: 1133, height: 1594 }
  },
  {
    name: 'Old 0-100 scale (not upgraded)',
    box: [10, 10, 30, 50],
    meta: { width: 1133, height: 1594 }
  },
  {
    name: 'Old 0-100 scale upgraded to 0-1000',
    box: [100, 100, 300, 500],
    meta: { width: 1133, height: 1594 }
  }
];

console.log('========== Coordinate Conversion Test ==========\n');

testCases.forEach((testCase, idx) => {
  console.log(`\n[Test ${idx + 1}] ${testCase.name}`);
  console.log(`Input box: [${testCase.box.join(', ')}]`);
  console.log(`Image meta: ${testCase.meta.width}x${testCase.meta.height}`);

  const rect = convertBoxToPixelRect(testCase.box, testCase.meta);

  if (rect) {
    isValidImageBox(rect, testCase.meta);
  }
});

console.log('\n========== Testing AUTO_SCALE_LEGACY_BOX Logic ==========\n');

function upgradeLegacyBox(box) {
  const max = Math.max(...box);
  const AUTO_SCALE_LEGACY_BOX = true;

  if (max <= 120 && AUTO_SCALE_LEGACY_BOX) {
    const scaled = box.map((v) => Math.round(v * 10));
    console.log(`  🔧 UPGRADED: [${box.join(', ')}] → [${scaled.join(', ')}]`);
    return scaled;
  } else {
    console.log(`  ℹ️  NO UPGRADE NEEDED (max=${max})`);
    return box;
  }
}

console.log('[Legacy Box 1] Old 0-100 format:');
upgradeLegacyBox([10.5, 10.5, 30.2, 50.1]);

console.log('\n[Legacy Box 2] Already 0-1000 format:');
upgradeLegacyBox([105, 105, 302, 501]);
