-- 启用 RLS 并添加基础策略、视图

alter table public.ai_creation_monitor_logs enable row level security;

-- 允许 service_role 全量访问
create policy "service_role_full_access" on public.ai_creation_monitor_logs
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 用户仅能查看自己的记录
create policy "user_select_own_monitor_logs" on public.ai_creation_monitor_logs
  for select
  using (auth.uid() = user_id);

-- 插入时强制 user_id = auth.uid()
create policy "user_insert_own_monitor_logs" on public.ai_creation_monitor_logs
  for insert
  with check (auth.uid() = user_id);

-- 视图：最近30天记录
create or replace view public.ai_creation_monitor_logs_recent as
select *
from public.ai_creation_monitor_logs
where created_at > now() - interval '30 days';

comment on view public.ai_creation_monitor_logs_recent is '最近30天的AI创作监控记录';
