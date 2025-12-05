from pathlib import Path
path = Path('src/lib/ai-question-bank/process-upload.ts')
text = path.read_text(encoding='utf-8')
old = "    const fileBuffer = await downloadFile(fileUrl, FileAccessLevel.PRIVATE);\n    console.log('"
if old not in text:
    raise SystemExit('pattern not found for ascii portion')
new = "    const fileBuffer = await downloadFile(fileUrl, FileAccessLevel.PRIVATE);\n    downloadCompletedAt = Date.now();\n    downloadedFileBytes = fileBuffer.length;\n    console.log('"
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
