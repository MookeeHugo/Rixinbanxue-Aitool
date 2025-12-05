from pathlib import Path
path = Path('src/lib/ai-question-bank/process-upload.ts')
text = path.read_text(encoding='utf-8')
old = "    await supabase\n      .from('upload_tasks')\n      .update({ status: 'processing', progress: 10, updated_at: new Date().toISOString() })\n      .eq('id', taskId);\n\n    console.log('"
if old not in text:
    raise SystemExit('pattern not found for update block')
new = "    const { data: processingTaskRecord } = await supabase\n      .from('upload_tasks')\n      .update({ status: 'processing', progress: 10, updated_at: new Date().toISOString() })\n      .eq('id', taskId)\n      .select('id, created_at')\n      .single();\n\n    if (processingTaskRecord?.created_at) {\n      uploadCreatedAt = new Date(processingTaskRecord.created_at);\n    }\n\n    console.log('"
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
