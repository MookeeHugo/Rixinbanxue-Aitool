# Codex测试分析报告

- **项目**: 日新教学平台 MVP
- **版本**: 当前工作区 (未提供 git 提交信息)
- **测试日期**: 2025-11-14 11:43
- **执行环境**: Windows + Node 20 (npm run build), Next.js 14.2.7

## 测试范围与方法
1. **构建验收**: 执行 `npm run build`，验证生产构建、TypeScript 检查与 lint。
2. **代码审查**: 聚焦直播课堂、作业管理、学情分析与 API 目录，评估安全性、路由完整性与数据持久化方案。
3. **API & 存储检查**: 对 `/api/live-sessions/*` 和 webhook 端点进行威胁建模，结合 `src/lib/server`、`db/schema.sql` 分析当前实现。
4. **UI 路径巡检**: 复核 `src/app/assignments`, `src/app/analytics`, `src/app/live` 页面，确认路由能否落地到实际实现。

> 浏览器交互未在此环境中执行，但依据组件实现推导用户行为路径，并结合 CLI 截图中的导航入口进行验证。

## 主要发现

### 1. 生产构建无法通过
- **证据**: `npm run build` 在类型检查阶段失败，报错 `src/app/live/[id]/page.tsx:55`，原因是 `session` 可能为 undefined 即调用 `session.id`。
- **影响**: 无法生成生产包，CI/CD 阶段会直接阻塞；等同于全部功能无法上线。
- **建议**: 在 `join()` 内提前返回或抛错（例如 `if (!session) return`），或将 `session!` 赋值放在 `if (!session) { ... }` 分支之后，并为 `updateMock` 与 fetch 调用增加错误处理。

### 2. 直播课堂 API 对任何人开放，且下发老师级别 token
- **证据**: `src/app/api/live-sessions/route.ts:6-35` 与 `src/app/api/live-sessions/[id]/token/route.ts:5-11` 未做任何身份鉴权/鉴权；`issueToken` 强制 `userId: "demo-user"`、`role: "teacher"`。
- **影响**: 任何匿名访问者都能在生产环境创建课堂、获取有效房间 token，并冒充教师进入直播，严重安全漏洞。
- **建议**: 使用 Supabase Auth（或自建 Session）验证请求头中的 JWT；校验角色为教师后才允许创建或获取 token；token 内容必须写入真实 `user.id` 并设置最短 TTL，同时添加速率限制与审计日志。

### 3. Webhook 端点缺少签名校验
- **证据**: `src/app/api/live-webhooks/livekit/route.ts:3-8`、`src/app/api/live-webhooks/zego/route.ts:3-10` 仅 `console.log` 来自第三方的 payload，然后直接返回 202。
- **影响**: 攻击者可伪造任意请求触发“课堂结束”“录制完成”等逻辑，未来若接入业务流程会带来错删数据/提前结束课堂的风险。
- **建议**: 根据 LiveKit/ZEGO 提供的签名算法校验 `Authorization` / `X-Signature`；验证通过后再写库，失败应返回 401 并记录来源 IP；同时建议加入重放保护（timestamp + nonce）。

### 4. 直播课堂数据仅存储在进程内存
- **证据**: `src/lib/server/store.ts:3-31` 使用 `Map` 作为全局变量保存 `sessions`；无持久化/无分布式锁。
- **影响**: 服务重启或水平扩展时课堂列表会被清空，用户无法找到刚创建的直播；多实例部署还会出现数据不一致，导致“创建成功但另一台机器看不到”。
- **建议**: 将 `sessions` 写入 Supabase/Postgres，或至少落地到 Redis。并在 API 层面通过 `created_by` 绑定教师，补充索引与分页，提高列表可靠性。

### 5. 作业详情页指向不存在的批改路由
- **证据**: `src/app/assignments/[id]/page.tsx:168` `router.push(`/assignments/${assignmentId}/grade/${sub.id}`)`；但 `src/app/assignments` 下没有 `grade` 目录（仅 `page.tsx`、`create/page.tsx`）。
- **影响**: 老师在“作业详情 > 查看/批改”按钮会落到 404，批改流程完全不可用。
- **建议**: 补齐 `app/assignments/[id]/grade/[submissionId]/page.tsx` 页面或修改按钮跳转到现有批改入口（例如 `my-assignments` 或弹窗批改）。上线前需配套 e2e 测试覆盖此路径。

### 6. 学情分析存在严重 N+1 查询与性能隐患
- **证据**: `src/app/analytics/page.tsx:66-102` 在遍历每个提交时同步调用 `await supabase.from('questions').select('*').in('id', questionIds)`，对 N 份作业会产生 N 次 HTTP；且未做错误重试，易在网络抖动时得到空白页面。
- **影响**: 学生提交一多（百级）就会触发连环请求，页面长时间转圈甚至触发 Supabase 速率限制；同时 catch 中直接 `return`，用户看不到任何提示。
- **建议**: 预先收集所有 `question_ids` 去重后批量拉取一次，再用 map 还原；同时为 `supabase` 请求添加 `Promise.all` 并捕获错误显示占位提示，必要时转移到 server action 做缓存。

## 其他观察与建议
- **缺少自动化测试**: package.json 中未配置 `test`/`lint` 脚本，建议在 CI 中加入 `next lint`、`vitest` 或 Playwright 覆盖关键教学流程。
- **直播开关易混淆**: `useApiParam` 默认为本地 mock，若忘记添加 `?useApi=1`，老师会误以为真实 API 工作异常。建议在 UI 上提供显式的“数据来源”提示，并把默认值切换为真实 API。
- **UI 文案编码问题**: 多处中文在源码中显示乱码（例如 `src/app/page.tsx` 欢迎语），说明文件经历过错误编码转换。虽然运行时可能正常，但建议统一为 UTF-8 并在 IDE 中修复，避免后续协作冲突。

---
如需进一步验证，可在本地修复 issue#1 后重新执行 `npm run build`，并以教师身份串联“创建班级 → 发布作业 → 查看提交 → 批改”整个链路，以确保 Report 中的问题都得到验证/回归。
