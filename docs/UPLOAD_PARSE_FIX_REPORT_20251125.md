## AI题库上传&解析修复报告（2025-11-25）

### 一、背景
- 老版本 `upload_tasks → Inngest → Qwen → parsed_questions` 流程在 2025-11-24 出现 `base64 decode fail`，阻断蓝图。
- 前端 `/tools/ingest/<taskId>/review` 无页面，导致“查看结果”按钮 404。

### 二、修复步骤
1. **重新连接 Next & Inngest**
   - 重启 `npx next dev -p 3014` 与 `npx inngest-cli dev -u http://localhost:3014/api/inngest`，确保函数成功注册（Functions 控制台出现 `Process PDF Upload`）。
2. **排查 Base64 失败**
   - 在 `process-pdf-upload.ts` 和 `qwen-flash.ts` 添加 Base64 调试日志，定位 Supabase 下载后的 `Uint8Array` 被 `Buffer#toString` 直接转成 `[object Object]`。
   - 将 `bufferToBase64` 改为兼容 `Buffer/TypedArray/ArrayBuffer`，再转为真正的 Base64 字符串。
   - `qwen-flash.ts` 改为 `axios` 发送 DashScope 请求，并在错误日志中打印状态码、请求体、前 32/后 32 字符。
3. **验证解析流程**
   - 通过 `scripts/test-qwen-parse.mjs tmp/failed.png` 验证 Qwen 模型无误。
   - 在 Inngest 控制台复现并观察 `base64Length ≈ 216312`，确认已恢复。
   - Supabase `upload_tasks` 状态从 `pending`→`completed`，`parsed_questions` 新增题目。
4. **补齐前端查看能力**
   - 新增 `src/app/tools/ingest/[taskId]/review/page.tsx`：服务端读取任务与 `parsed_questions`，渲染题目卡片、选项、答案、AI 步骤、知识点，并提供返回按钮。
   - `TaskListSection` “查看结果”按钮跳转到新页面，不再 404。

### 三、结果
- Inngest Run `01KAVCTT2QT0VJSQ656H5YEV9R` 成功：共解析 5 道题，`parsed_questions` 表可查到记录。
- 前端上传历史展示 “已完成”，点击“查看结果”进入 `<taskId>/review`，题目详情与置信度、标签均可正常显示。

### 四、后续建议
1. 在 `review` 页面新增批量编辑/提交的交互，与 `submitQuestions` Server Action 打通。
2. 给 `parsed_questions` 添加分页/筛选（例如置信度 <0.8）和照片预览，方便教师复核。
3. 将 Base64 日志保留在调试开关下（例如 `DEBUG_QWEN_REQUEST`），避免生产环境噪音。
