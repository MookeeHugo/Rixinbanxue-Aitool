# API 模式切换（前端→后端）

本原型支持通过 URL 参数切换是否调用后端 API：
- 关闭（默认）：使用前端 localStorage 的模拟数据源
- 开启：调用 Next.js 内的 BFF API（桩实现）

用法
- 在任意页面 URL 追加 `?useApi=1` 开启
- 顶部导航右侧提供“API 模式：开/关”按钮，点击可在当前页面切换
- 切换后页面保持当前路由，其它导航链接会自动携带该参数

当前接入的 API（桩）
- GET /api/live-sessions
- POST /api/live-sessions
- GET /api/live-sessions/{id}
- POST /api/live-sessions/{id}/token
- POST /api/live-webhooks/zego|livekit

后续（M2）
- API 从桩实现切换为 ZEGO/LiveKit 真实对接
- 增加鉴权（Supabase Auth）与数据库持久化
- 录制控制与回调签名校验

