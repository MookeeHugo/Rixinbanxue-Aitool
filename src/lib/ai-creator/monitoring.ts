/**
 * 结构化监控（轻量版）
 * 仅做占位，后续可接入外部日志/时序库。
 */

export type GenerationOutcome =
  | 'success'
  | 'parse_fail'
  | 'sandbox_fail'
  | 'validation_fail'
  | 'storage_fail'
  | 'unknown';

export interface MonitorEvent {
  userId?: string;
  questionId?: string;
  status: GenerationOutcome;
  errorMessage?: string;
  extra?: Record<string, any>;
}

export function recordGenerationEvent(event: MonitorEvent) {
  try {
    // 简单写入文件日志；生产可换为DB/外部日志。
    const line = `${new Date().toISOString()} ${JSON.stringify(event)}\n`;
    require('fs').appendFileSync('logs/ai-creator-monitor.log', line, 'utf-8');
    // 同步落库（最佳努力，不阻塞）
    logToSupabase(event).catch(() => {});
  } catch (error) {
    console.info('[Monitor] fallback log', JSON.stringify(event));
  }
}

async function logToSupabase(event: MonitorEvent) {
  try {
    const { createServiceSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = createServiceSupabaseClient();
    await supabase.from('ai_creation_monitor_logs').insert({
      user_id: event.userId || null,
      question_id: event.questionId || null,
      status: event.status,
      error_message: event.errorMessage || null,
      extra: event.extra || null,
    });
  } catch {
    // 忽略落库失败
  }
}
