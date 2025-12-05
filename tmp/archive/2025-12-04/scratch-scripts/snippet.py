from pathlib import Path
text = Path('src/lib/ai-question-bank/process-upload.ts').read_text(encoding='utf-8')
start = text.index('  const { taskId, fileName, fileUrl }')
print(repr(text[start:start+120]))
