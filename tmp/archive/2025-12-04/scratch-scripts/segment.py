from pathlib import Path
text = Path('src/lib/ai-question-bank/process-upload.ts').read_text(encoding='utf-8')
segment = "export async function processUploadTask" + text.split('export async function processUploadTask',1)[1][:120]
print(segment)
