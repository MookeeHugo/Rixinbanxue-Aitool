from pathlib import Path
text = Path('src/lib/ai-question-bank/process-upload.ts').read_text(encoding='utf-8')
target = "  const { taskId, fileName, fileUrl } = data;\r\n  const supabase = createServiceClient();\r\n\r\n  console.log('"
print(target in text)
