-- 监控表：记录 AI 创作生成的结构化事件

create table if not exists public.ai_creation_monitor_logs (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    user_id uuid references auth.users (id) on delete set null,
    question_id uuid references public.ai_created_questions (id) on delete set null,
    status text not null,
    error_message text,
    extra jsonb
);

create index if not exists idx_ai_creation_monitor_logs_status on public.ai_creation_monitor_logs (status);
create index if not exists idx_ai_creation_monitor_logs_user on public.ai_creation_monitor_logs (user_id);
create index if not exists idx_ai_creation_monitor_logs_created_at on public.ai_creation_monitor_logs (created_at);

comment on table public.ai_creation_monitor_logs is 'AI 创作生成监控事件';
comment on column public.ai_creation_monitor_logs.status is 'success/parse_fail/sandbox_fail/validation_fail/storage_fail/unknown';
