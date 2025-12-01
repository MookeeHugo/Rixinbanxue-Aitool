import { ensureLatexWrapped, extractJsonFromStream } from '../gemini-vision-client';

describe('ensureLatexWrapped', () => {
  it('wraps plain option text with $...$', () => {
    expect(ensureLatexWrapped('x+1')).toBe('$x+1$');
  });

  it('preserves existing LaTeX delimiters', () => {
    expect(ensureLatexWrapped('$x^2$')).toBe('$x^2$');
  });

  it('throws when option is empty', () => {
    expect(() => ensureLatexWrapped('   ')).toThrow(/选项内容为空/);
  });

  it('keeps mixed text that already contains inline LaTeX', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const option = 'x 的值是 $5$';
    expect(ensureLatexWrapped(option)).toBe(option);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('extractJsonFromStream', () => {
  it('strips markdown fences and trims text', () => {
    const payload =
      '```json\n{"meta":{"page_summary":"ok","reasoning":[]},"questions":[{"number":"1","content":"c","options":[]}]}\\n```';
    const extracted = extractJsonFromStream(payload);
    expect(extracted).toContain('"page_summary":"ok"');
  });

  it('picks last JSON block when thinking text contains braces', () => {
    const payload =
      '思考阶段 {描述}\n稍后输出 JSON\n{"foo":1}\n{"meta":{"page_summary":"ok"},"questions":[]}';
    const extracted = extractJsonFromStream(payload);
    expect(extracted).toBe('{"meta":{"page_summary":"ok"},"questions":[]}');
  });

  it('throws when JSON braces are missing', () => {
    expect(() => extractJsonFromStream('no json here')).toThrow('未能在 Gemini 响应中定位 JSON');
  });
});
