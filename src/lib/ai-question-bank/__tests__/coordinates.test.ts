import { convertBoxToPixelRect } from '../coordinates';

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
