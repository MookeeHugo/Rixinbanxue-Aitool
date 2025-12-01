# 日新教育 · 直播 API 契约（M1 草案）

> 本阶段接口仅用于对齐契约与前端接线，返回桩数据。M2 起按 `直播子系统规划 v1` 接入 ZEGO/LiveKit。

## 资源模型（简）
- LiveSession: { id, title, provider, status, scheduledAt?, durationMin?, recordOnStart?, roomId? }
- TokenResponse: { provider, roomId, token, expiresAt }
- Recording: { id, sessionId, provider, status, url?, durationSec?, sizeBytes? }

## Endpoints
- GET /api/live-sessions
  - 200: LiveSession[]
- POST /api/live-sessions
  - body: { title: string, scheduledAt?: ISO, durationMin?: number, provider?: 'zego'|'livekit', recordOnStart?: boolean }
  - 201: LiveSession（已决定 provider 与 roomId）
- POST /api/live-sessions/{id}/token
  - body: { role: 'teacher'|'student' }
  - 200: TokenResponse
- POST /api/live-webhooks/zego
  - body: { event: string, data: any }
  - 202
- POST /api/live-webhooks/livekit
  - body: { event: string, data: any }
  - 202

## 错误码
- 400: 参数错误
- 401: 未授权（M2 加入）
- 404: 资源不存在
- 500: 未预期错误（M1 打印日志，M2 接入 Sentry）

## 备注
- 会前路由默认按 `LIVE_PROVIDER_DEFAULT=zego` 决定；M2 按策略切换。
- Token 为桩值（"stub-token"），M2 替换为真实签发。

