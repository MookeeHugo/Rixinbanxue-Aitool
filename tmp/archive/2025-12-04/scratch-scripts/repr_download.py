from pathlib import Path
text = Path('src/lib/ai-question-bank/process-upload.ts').read_text(encoding='utf-8')
start = text.index("    console.log('开始下载")
print(repr(text[start:start+160]))
