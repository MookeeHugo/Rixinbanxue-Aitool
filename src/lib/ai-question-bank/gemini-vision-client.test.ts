import { validateParseResult } from './gemini-vision-client';

describe('validateParseResult', () => {
  const baseQuestion = {
    number: '1',
    content: '测试题干',
    image_regions: [
      {
        box_2d: [100, 200, 300, 400] as [number, number, number, number]
      }
    ]
  };

  it('应当通过 0-1000 正常坐标的校验', () => {
    const result = validateParseResult({
      meta: {},
      questions: [baseQuestion]
    });

    expect(result.passed).toBe(true);
    expect(result.hasValidCoordinates).toBe(true);
    expect(result.reasons).not.toContain('存在非法坐标或越界的 box_2d');
  });

  it('应当拒绝越界或不合法的 box_2d 坐标', () => {
    const result = validateParseResult({
      meta: {},
      questions: [
        {
          ...baseQuestion,
          image_regions: [
            {
              box_2d: [0, 0, 1200, 50] as [number, number, number, number]
            }
          ]
        }
      ]
    });

    expect(result.passed).toBe(false);
    expect(result.hasValidCoordinates).toBe(false);
    expect(result.reasons).toContain('存在非法坐标或越界的 box_2d');
  });
});
