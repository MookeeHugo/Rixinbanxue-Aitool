# 前端优先开发说明（M1）

本阶段目标：在无后端依赖的前提下，完成直播相关页面与核心交互的“可点击原型”。

包含内容：
- 首页（入口与导航）
- 直播列表页（基于本地存储的模拟数据）
- 创建课堂页（表单→写入模拟存储→跳转）
- 课堂详情/加入页（视频/白板占位，未来挂载 ZEGO/LiveKit 与 tldraw）

说明：
- 使用 `src/lib/mock/sessions.ts` 提供本地存储（localStorage）数据源，待后端 API 就绪后可无缝替换。
- UI 布局与交互位置已预留，后续仅替换“占位”组件为真实 SDK 即可。

待接入（下一阶段）：
- /api/live-sessions（BFF）与 ProviderRouter（ZEGO/LiveKit）
- token 获取与鉴权、录制控制与回调处理
- 白板 tldraw + Yjs 服务与回放对齐

