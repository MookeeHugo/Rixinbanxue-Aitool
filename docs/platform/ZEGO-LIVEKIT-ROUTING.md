# ZEGO / LiveKit 路由与切换（前端阶段说明）

前端仅做展示与声明性路由（选择器与占位 UI），不包含任何密钥或令牌逻辑。

后端将提供：
- `POST /api/live-sessions` 创建并确定 provider 与 roomId
- `POST /api/live-sessions/{id}/token` 签发加入令牌（ZEGO token / LiveKit AccessToken）
- 录制控制与回调 `/api/live-webhooks/{provider}`

在前端阶段，我们：
- 使用本地存储模拟 `live_sessions` 列表与状态
- 进入课堂时展示“提供商占位”
- 预留控制按钮与状态显示位置

等后端就绪后：
- 将创建与加入流程切换为真实 API 调用
- 在课堂页面挂载对应 SDK（ZEGO / LiveKit）并实现事件上报

