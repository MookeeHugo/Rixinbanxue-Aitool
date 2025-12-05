from pathlib import Path
path = Path('src/lib/ai-question-bank/process-upload.ts')
text = path.read_text(encoding='utf-8')
needle = "    throw error;\n  }\n}"  # end snippet
if needle not in text:
    raise SystemExit('needle not found for finally block')
replacement = "    throw error;\n  } finally {\n    const pythonProcessingMs = Date.now() - processingStartTime;\n    const supabaseBandwidthMb =\n      downloadedFileBytes != null\n        ? Number((downloadedFileBytes / (1024 * 1024)).toFixed(3))\n        : null;\n    const ingestUploadLatencyMs =\n      downloadCompletedAt != null\n        ? uploadCreatedAt\n          ? downloadCompletedAt - uploadCreatedAt.getTime()\n          : downloadCompletedAt - processingStartTime\n        : null;\n\n    recordIngestMetrics({\n      timestamp: new Date().toISOString(),\n      taskId,\n      fileName,\n      ingest_upload_latency_ms: ingestUploadLatencyMs,\n      supabase_bandwidth_mb: supabaseBandwidthMb,\n      python_processing_ms: pythonProcessingMs\n    });\n  }\n}"
text = text.replace(needle, replacement, 1)
path.write_text(text, encoding='utf-8')
