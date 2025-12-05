# 发布作业失败调试记录

## 背景

- 环境：本地 DevServer（`npm run dev`），账号 `teacher@test.com / test123456`
- 页面：`/assignments/create`（发布作业）
- 现象：完成班级/试卷/截止时间选择后点击“发布作业”提示“操作失败，发布作业时发生未知错误”，DevTools 日志仅显示 `[ERROR] 发布作业失败: [object Object]`，未见具体 Supabase 错误码。

## 复现步骤

1. 启动 Supabase 栈与 `npm run dev`
2. 登录教师账号并进入 `/assignments/create`
3. 选择班级 `初一(1)班` 与试卷 `数学基础练习`
4. 通过自动化脚本或直接在输入框中粘贴日期，造成 `datetime-local` 值变成 `202512-02-01T20:00`（注意年份与月份之间缺少连字符）
5. 点击发布作业后立刻触发 `RangeError: Invalid time value`，被 `catch` 捕捉并展示“未知错误”
6. 由于异常发生在调用 Supabase 之前，/rest/v1/assignments 并未收到请求，因而无法在网络面板看到错误响应

## 调试记录

| 时间 | 操作 | 结果 |
| --- | --- | --- |
| 2025-12-04 13:05 | 使用 Puppeteer `fill` 向 `datetime-local` 写入 `2025-12-20T12:00` | 元素的实际值变为 `202512-02-01T20:00`，`new Date(value)` 抛出 `Invalid time value` |
| 2025-12-04 13:10 | 运行 Node 脚本（携带教师账号）直接向 `assignments` 插入记录 | 返回 `insert ok [...]`，确认 Supabase RLS 正常 |
| 2025-12-04 13:20 | 为 `window.fetch` 注入日志 | 发布失败场景下未记录任何 `/rest/v1/assignments` 请求，进一步印证异常发生在请求之前 |

## 原因分析

`handleSubmit` 直接调用 `new Date(deadline).toISOString()`，当 `deadline` 值不是合法的 `YYYY-MM-DDTHH:mm` 格式时会抛出 `RangeError`。在实机输入中几乎不会出现，但自动化测试或部分旧浏览器粘贴字符串时可能导致格式缺少连字符，从而触发异常。

## 已采取措施

- 在 `src/app/assignments/create/page.tsx` 中增加了截止时间格式校验：`Number.isNaN(parsedDeadline.getTime())` 时阻止提交，并提示“截止时间格式不正确，请重新选择时间”。这样可以避免老师看到“未知错误”，同时为后续调试保留明确的入口。

## 后续建议

1. 若仍出现真实 Supabase 错误，可在 `catch` 分支中将 `err.message` 透出到 UI，并在 `logger.error` 里附带 `stack`。
2. 在 `/api/logs` 或 Supabase 日志中增加对 assignments 插入的审计，方便快速对照。
3. 未来可考虑将发布作业迁移至 Server Action，统一处理参数校验与 Supabase RLS，避免每个客户端重复实现逻辑。
