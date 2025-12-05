from pathlib import Path
path = Path('src/lib/ai-question-bank/process-upload.ts')
text = path.read_text(encoding='utf-8')
old = "    console.log('开始下载文�?', { fileUrl });\n    const fileBuffer = await downloadFile(fileUrl, FileAccessLevel.PRIVATE);\n    console.log('文件下载完成', { size: fileBuffer.length });\n\n    let imageWidth: number | null = null;\n"
if old not in text:
    raise SystemExit('pattern not found for download block')
new = "    console.log('开始下载文�?', { fileUrl });\n    const fileBuffer = await downloadFile(fileUrl, FileAccessLevel.PRIVATE);\n    downloadCompletedAt = Date.now();\n    downloadedFileBytes = fileBuffer.length;\n    console.log('文件下载完成', { size: fileBuffer.length });\n\n    let imageWidth: number | null = null;\n"
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
