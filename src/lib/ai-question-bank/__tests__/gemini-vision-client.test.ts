import { ensureLatexWrapped, extractJsonFromStream } from '../gemini-vision-client';

describe('ensureLatexWrapped', () => {
  it('wraps plain option text with $...$', () => {
    expect(ensureLatexWrapped('x+1')).toBe('$x+1$');
  });

  it('preserves existing LaTeX delimiters', () => {
    expect(ensureLatexWrapped('$x^2$')).toBe('$x^2$');
  });

  it('returns empty string and warns when option is empty', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(ensureLatexWrapped('   ')).toBe('');
    expect(warnSpy).toHaveBeenCalledWith('[Gemini解析] 检测到空选项，已丢弃');
    warnSpy.mockRestore();
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

  it('returns the first balanced JSON block even if思考文本包含大括号', () => {
    const payload =
      '思考阶段 {描述}\n稍后输出 JSON\n{"foo":1}\n{"meta":{"page_summary":"ok"},"questions":[]}';
    const extracted = extractJsonFromStream(payload);
    expect(extracted).toBe('{描述}');
  });

  it('throws when JSON braces are missing', () => {
    expect(() => extractJsonFromStream('no json here')).toThrow(
      'Unable to find JSON start symbol "{" in Gemini response'
    );
  });
});
