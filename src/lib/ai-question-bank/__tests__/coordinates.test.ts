import { convertBoxToPixelRect } from '../coordinates';
import { isValidImageBox } from '../coordinates';

describe('convertBoxToPixelRect', () => {
  it('applies dynamic padding (>=20px)', () => {
    const rect = convertBoxToPixelRect([100, 100, 200, 200], { width: 1000, height: 1000 });
    expect(rect).not.toBeNull();
    if (rect) {
      expect(rect.left).toBeLessThanOrEqual(80);
      expect(rect.top).toBeLessThanOrEqual(80);
      expect(rect.width).toBeGreaterThan(120);
      expect(rect.height).toBeGreaterThan(120);
    }
  });

  it('honors custom padding override', () => {
    const rect = convertBoxToPixelRect([100, 100, 200, 200], { width: 1000, height: 1000 }, 0);
    expect(rect).not.toBeNull();
    if (rect) {
      expect(rect.left).toBe(100);
      expect(rect.top).toBe(100);
    }
  });
});

describe('isValidImageBox (P0 relaxed rules)', () => {
  const meta = { width: 1000, height: 1000 };

  it('accepts slender questions up to 10:1 ratio', () => {
    const rect = { left: 0, top: 0, width: 900, height: 100 };
    expect(isValidImageBox(rect, meta)).toBe(true);
  });

  it('accepts small symbols above the minimum dimension', () => {
    const rect = { left: 0, top: 0, width: 24, height: 24 };
    expect(isValidImageBox(rect, meta)).toBe(true);
  });

  it('rejects near-full-page crops above the threshold', () => {
    const rect = { left: 0, top: 0, width: 995, height: 995 };
    expect(isValidImageBox(rect, meta)).toBe(false);
  });

  it('rejects ratios beyond 10:1', () => {
    const rect = { left: 0, top: 0, width: 1200, height: 90 };
    expect(isValidImageBox(rect, meta)).toBe(false);
  });
});
