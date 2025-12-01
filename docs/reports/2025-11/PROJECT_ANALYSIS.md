# 项目分析 - 日新教学平台 (rixindemo-codex-m1)

## 项目概览
- **技术栈**：Next.js 14（App Router + RSC）、React 18、TypeScript 5、Zustand、Ant Design + shadcn/ui、Supabase（Postgres/Auth/Storage）、Cloudflare R2、LiveKit。
- **运行脚本**：`npm run dev`（3002 端口，含 Supabase 本地联动脚本）、`npm run build`、`npm run test`（Jest + Playwright placeholder）。
- **目标业务**：智能题库、组卷、作业流转、实时课堂/录制与学情分析。

## 代码结构速览
- `src/app`：Next.js 路由（questions、papers、classes、live-sessions APIs 等）。
- `src/components`：UI 组件库（Navbar、live/whiteboard、question basket 等）。
- `src/lib`：核心库（Supabase、Storage、LiveKit provider、logger、performance monitor 等）。
- `src/hooks` / `src/stores`：业务 Hook 与 Zustand 状态。
- `scripts`：自动化（console.log 替换、logger import 修复等）（当前脚本存在破坏性影响，见关键问题 1）。

> 注：未执行 `npm run build/test`，因此构建/测试状态未知；本分析依赖静态审查。

## 关键问题与风险

### 1. 日志自动替换脚本破坏了大量模块
- 示例：`src/components/live/Whiteboard.tsx:3`、`src/components/live/LiveKitRoom.tsx:3`、`src/lib/logger.ts:6` 的 import 行被插入 `reimport { logger }...`，导致 TypeScript 无法解析；核心 logger 文件甚至自引用成死循环。
- `scripts/replace-console-logs.mjs` 会在“第一个 import 块”后盲插 `import { logger }...`，但对多行 import、双引号或无换行情况处理不当，从而把 `logger` 代码插入到现有语句中间。
- 影响：Next.js / tsc 构建直接失败，live 相关 UI、logger、storage 等模块均不可用，CI 也无法运行；logger.ts 失效意味着全局日志框架不可用。
- 建议：回滚/恢复受影响文件、修复脚本（使用 AST 或更可靠的插入逻辑），再重新跑脚本；并为脚本增加测试或 dry-run。

### 2. `createServerClient` 被大量引用但缺少实现
- 多个 API（如 `src/app/api/admin/performance/route.ts:12`、`src/app/api/live-sessions/[id]/recordings/route.ts:8`、`src/app/api/storage/stats/route.ts:8`）import `@/lib/server/supabase`，但仓库内不存在 `src/lib/server/supabase.ts`（`Test-Path` 为 false）。
- 构建阶段会报 “Cannot find module '@/lib/server/supabase'”；即便忽略类型检查，运行时也无法认证用户（这些路由全依赖该 helper）。
- 建议：补齐 `createServerClient`（封装 `createServerSupabaseClient` + cookie 读取），并统一复用；为 API 增加单元/集成测试确保 helper 存在。

### 3. 客户端直接加载 R2/AWS 凭证与 Node API
- `src/app/questions/_components/question-form.tsx:20` 在 `"use client"` 组件中导入 `uploadFile/deleteFile`（`src/lib/storage.ts`），并在 `handleImageUpload` 中调用 `Buffer.from`/`S3Client`（`src/app/questions/_components/question-form.tsx:167-177`）。
- React 客户端 Bundle 因此会打入 `@aws-sdk/*`、`crypto` 等 Node 依赖，并暴露 `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` 等敏感变量；同时浏览器没有 `Buffer`，上传流程会在运行时崩溃。
- 建议：将上传/删除封装到 Server Action 或 `/api/files` 路由，客户端只获取签名 URL；R2/service-role 秘钥必须保留在 server side。

### 4. SSE 推送写入对象类型错误，实时状态失效
- `src/app/api/live-sessions/[id]/recording-status/stream/route.ts:20` 将连接存成 `WritableStreamDefaultWriter`，并在 `broadcastRecordingStatus` 中调用 `writer.write(...)`。
- 但 `ReadableStream` 的 `controller` 并非 writer（`src/app/api/live-sessions/[id]/recording-status/stream/route.ts:73` 强制 cast 为 writer）；在 Node 18/Edge Runtime 下该对象根本没有 `write`，导致广播 promise 直接 reject，所有监听端收不到状态更新。
- 建议：存储 `ReadableStreamDefaultController` 并调用 `controller.enqueue(...)`；或改用 `TransformStream`/`WritableStream` 正确写入；同时在 `req.signal.abort` 时清理 controller。

### 5. LiveKit 录制生命周期状态丢失 & 默认凭证硬编码
- `start-recording` / `stop-recording` 路由都 `new LiveKitAdapter()`（`src/app/api/live-sessions/[id]/start-recording/route.ts:106`、`stop-recording/route.ts:78`），而 `LiveKitAdapter` 的 `activeRecordings` Map 是实例级别。每次请求都会得到一个全新的实例，Map 永远空，`stop-recording` 几乎无法找到 `egressId`。
- `src/lib/live/providers/livekit.ts:24-26` 还把 `LIVEKIT_API_KEY/SECRET/URL` fallback 到 `"devkey" / "secret" / http://localhost`，意味着配置缺失时会悄悄使用无意义的默认值，不会告警。
- 风险：录制状态无法正确停止/同步；可能把测试密钥部署到生产；同时 `startRecording` 未把 egressId 持久化到 DB，server 重启就丢失。
- 建议：通过 `getProviderInstance` 共享单例（或写入 Redis/DB）；在 `LiveKitAdapter` 构造时如果 env 缺失直接抛错；将 `egressId` 写入 `live_recordings`，stop 时读取 DB fallback。

### 6. 存储清理脚本与实际 bucket 不一致
- Web 端录制上传走 Supabase Storage bucket `live-recordings`（`src/hooks/useMediaRecorder.ts:171-197`）。
- 定时任务 `/api/cron/cleanup-recordings` 在删除时针对 `recordings` bucket（`src/app/api/cron/cleanup-recordings/route.ts:147`）——名称不同，导致定时清理永远找不到真实文件，S3/R2 成本持续增长。
- 建议：统一 bucket 名称（或通过 env 配置）；补充统计/报警，避免滞留对象。

### 7. 设计文档引用的 `/api/files/download` 尚未实现
- `src/lib/storage.ts:421` 的注释要求前端调用 `/api/files/download` 生成签名 URL，但 `src/app/api/files/download/` 目录空置，无 `route.ts`。
- 结果：私有文件（papers、exports 等）无法通过安全接口下载；R2 私有桶等同不可用。
- 建议：补充下载 Route（校验用户 + 调用 `generateSignedUrl`），并在问题表单/作业模块中统一使用。

## 其他可优化点
- LiveKit SSE/performance monitor 默认使用进程内内存，部署在 serverless 场景下无效，可考虑 Redis/R2 event log。
- `scripts/replace-console-logs.mjs`、`scripts/fix-logger-imports.mjs` 缺少 dry-run/备份机制，应先在 CI 检查后再落盘。
- 目前缺少端到端用例覆盖 LiveKit/R2 流程，建议为关键 API 添加 Playwright 或契约测试。

## 建议的任务清单
1. **恢复 & 保护 logger import**：定位全部受损文件（至少 live 组件 + logger + storage 等），写脚本或手动修复，并为 `scripts/replace-console-logs.mjs` 添加 AST 方案或撤除该脚本。
2. **实现 `src/lib/server/supabase.ts`**：封装 cookie/JWT 认证，统一给所有 API 使用；补充单元测试验证 helper 存在。
3. **重构文件上传/删除链路**：移除客户端对 `@/lib/storage` 的直接引用，改为 server action/API（含签名 URL、大小校验、异常回滚）。
4. **修复 SSE 广播实现**：改用 `ReadableStreamDefaultController` 写入，并加入断线回收逻辑；为 `broadcastRecordingStatus` 编写集成测试。
5. **LiveKit 录制持久化**：使用单例 adapter、落盘 egressId、去掉默认 dev key，同时 stop 时从 DB/缓存读取状态。
6. **对齐存储 bucket & 下载 API**：统一 `live-recordings`/`recordings`，实现 `/api/files/download` route，定时任务对齐同一桶。
7. **运行/恢复测试**：在修复构建错误后跑 `npm run test` / `npm run build`，并补充回归脚本覆盖 LiveKit & Storage 核心流程。

---
如需进一步深入（性能、数据模型、测试矩阵等），请明确优先级，可在上述任务完成后继续扩展。 
