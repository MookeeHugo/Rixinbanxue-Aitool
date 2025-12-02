import { convertBoxToPixelRect } from '../coordinates';

describe('convertBoxToPixelRect', () => {
  it('applies dynamic padding (>=20px)', () => {
    const rect = convertBoxToPixelRect([10, 10, 20, 20], { width: 1000, height: 1000 });
    expect(rect).not.toBeNull();
    if (rect) {
      expect(rect.left).toBeLessThanOrEqual(80);
      expect(rect.top).toBeLessThanOrEqual(80);
      expect(rect.width).toBeGreaterThan(120);
      expect(rect.height).toBeGreaterThan(120);
    }
  });

  it('honors custom padding override', () => {
    const rect = convertBoxToPixelRect([10, 10, 20, 20], { width: 1000, height: 1000 }, 0);
    expect(rect).not.toBeNull();
    if (rect) {
      expect(rect.left).toBe(100);
      expect(rect.top).toBe(100);
    }
  });
});
