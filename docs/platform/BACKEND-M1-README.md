# 后端（BFF）M1 说明

本阶段实现了最小 API 路由（桩实现），用于验证前端对接与契约：

- GET /api/live-sessions → 返回内存中的会话列表
- POST /api/live-sessions → 创建会话并按策略选择 provider（默认 zego），生成桩 roomId
- POST /api/live-sessions/{id}/token → 返回桩 token（非真实签发）
- POST /api/live-webhooks/zego|livekit → 接收回调（仅 202）

说明：
- 数据存储为进程内存 `src/lib/server/store.ts`，仅开发期演示使用
- 适配层接口：`src/lib/live/interfaces.ts`；ZEGO/LiveKit 桩适配器在 `src/lib/live/providers/*`
- 路由策略：`src/lib/live/router.ts`，按 `LIVE_PROVIDER_DEFAULT` 选择

下一阶段（M2）：
- 将内存存储替换为数据库（Supabase）
- 实现 ZEGO/LiveKit 真实 token 签发与录制控制
- 增加鉴权（Supabase Auth）与 RLS 关联逻辑
- Webhook 回调签名校验与事件入库

