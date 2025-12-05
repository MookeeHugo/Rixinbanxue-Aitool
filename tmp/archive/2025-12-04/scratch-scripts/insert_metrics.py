from pathlib import Path
path = Path('src/lib/ai-question-bank/process-upload.ts')
text = path.read_text(encoding='utf-8')
old = "  const { taskId, fileName, fileUrl } = data;\n  const supabase = createServiceClient();\n\n"
new = "  const { taskId, fileName, fileUrl } = data;\n  const supabase = createServiceClient();\n  const processingStartTime = Date.now();\n  let uploadCreatedAt: Date | null = null;\n  let downloadCompletedAt: number | null = null;\n  let downloadedFileBytes: number | null = null;\n\n"
if old not in text:
    raise SystemExit('pattern not found')
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
