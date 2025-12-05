# Codex体验分析报告（教师端导航与组卷流程）

- **时间**: 2025-11-14
- **环境**: 本地代码库 (`Rixindemo-codex-m1`)，通过代码审查+UI 结构验证（未运行浏览器自动化，聚焦 Next.js App Router 下的主要页面）。
- **角色视角**: 教师（题库→组卷→布置作业→批改），兼顾学生/家长导航体验。

## 测试范围
1. 题库管理：`src/app/questions/page.tsx`、`create/page.tsx`。
2. 组卷：`src/app/papers/create/page.tsx`、`[id]/page.tsx`。
3. 作业：`src/app/assignments/[id]/page.tsx`。
4. 首页仪表盘/语言呈现：`src/app/page.tsx`。

## 主要问题

### 1. 组卷过程只能“盲抽题”，无法手动挑题或预览（需彻底改造）
- 文件：`src/app/papers/create/page.tsx:80-147`
- 逻辑直接按要求随机抽题 (`data.sort(() => Math.random() - 0.5)`)；教师看不到原题，也无法在生成前剔除/替换。
- 体验影响：用户必须“先抽后看”，如果抽中的题不合适，只能退回重新抽，缺少自由组合能力。
- 建议：在生成前引入“题库列表 + 勾选”或“抽题后允许调序/替换”面板；至少提供“查看题目全文”链接。

### 2. 知识点列表硬编码且全部是乱码，筛选几乎不可用
- 文件：`src/app/papers/create/page.tsx:9-25`
- `KNOWLEDGE_POINTS` 直接写死中文字符串，但编码被破坏（显示为 `????`），导致老师无法识别任何知识点。
- 建议：从数据库加载知识点并存储为 UTF-8，或引入 `knowledge_points` 表/字典；同时提供搜索框而非纯列表。

### 3. 作业详情页“查看/批改”按钮跳到不存在的路由（根本性缺页）
- 文件：`src/app/assignments/[id]/page.tsx:150-173`
- 点击 `router.push(/assignments/${assignmentId}/grade/${sub.id})`，但 `src/app/assignments` 目录下没有 `grade` 子路由（只有 `page.tsx` 与 `create/page.tsx`）。
- 结果：教师在浏览器中必定看到 404，批改流程中断。
- 建议：
  1. 新增 `app/assignments/[id]/grade/[submissionId]/page.tsx`；
  2. 或改为跳转到已有批改入口（例如弹出抽屉、或在当前页面展开答案对比）。

### 4. 退出登录后首页卡死，所有 `_next` 资源 404（需排查部署流程）
- 复现：点击导航栏“退出登录”→回到登录页→重新访问 `/` → 浏览器控制台连续报错 `Failed to load resource: the server responded with a status of 404 (Not Found)`，涉及 `/_next/static/chunks/app/page.js`、`main-app.js`、`app-pages-internals.js`、`/_next/static/css/app/layout.css`。
- 表现：整个页面只剩 SSR 输出的文本（顶部蓝色链接 + “加载中...” 占位 + 页脚），因为对应的 JS/CSS chunk 都加载失败，React 无法再 hydrate，首页永远停在 loading 状态。
- 推断原因：
  - `Navbar` 的退出逻辑只做了 `router.push('/login')`，但并不会重启 Next 服务；按理说刷新首页应命中已有的 `/_next` 静态文件。
  - 查看 `.next/static/chunks/app` 可确认 `page.js` 等文件实际存在（本地 `npm run dev` 时输出在 `.next/static/chunks/app/page.js`），说明 404 并非“文件缺失”，而是 **Next 服务没有把 `.next/static` 暴露出来** ——典型场景是：`npm run start` 并未运行、端口 3002 上的进程不是 Next，或构建产物被清理后未重新 `next build`。
  - 浏览器截图中 CSS 也完全丢失，佐证静态目录整体不可访问。
- 建议检查/修复步骤：
  1. 确认在同一个终端里执行 `npm run dev -- -p 3002` 或 `npm run build && npm run start -p 3002`，不要在构建后删除 `.next` 目录。
  2. 若通过其它工具（例如代理服务器）转发 3002 端口，需要显式允许 `/_next/static/*` — 目前 404 即来自代理层。
  3. 在浏览器端可暂时 `Ctrl+Shift+R` 强制刷新，但根因仍需保证 Next 服务正确托管静态资源。

### 5. 全站中文呈现大面积乱码，角色/按钮难以辨认（应做一次性修复并纳入检测）
- 文件：`src/app/page.tsx:27-79` 以及 `questions`、`papers`、`assignments` 等多处。
- 由于文件以 UTF-8 保存但内容在早期被错误转码，目前渲染出的所有汉字均变成 `????`。用户在浏览器中看到的就是不可读字符，难以区分“题库”“作业”等模块。
- 建议：统一编码（UTF-8），重新录入关键文案；必要时引入 i18n 文件管理，避免在源码中混杂损坏字符。

# 主要问题（续）

### 6. 开发模式下首页反复报 500（`webpack.js`/`main.js` 等 chunk 全部失效）
- 复现：运行 `npm run dev -- -p 3002` → 访问 `/` → 浏览器控制台报 `webpack.js`, `main.js`, `_app.js`, `react-refresh.js`, `_error.js` 均返回 500。
- 影响：开发环境无法加载任何资源，页面完全空白，热更新也失效。
- 分析：
  - 500 说明 Next.js dev server 自身报错，可通过终端日志捕捉具体异常（比如 Supabase 环境变量缺失、TS 报错、编码问题等）。
  - 由于所有核心 chunk 都 500，推测 dev server 在启动时就失败，导致 `/webpack-hmr` 等接口也报错。
- 建议排查项：
  1. 重新运行 `npm run dev` 并在终端观察首个报错；若是环境变量缺失，应在 `.env.local` 中补齐。
  2. 确认没有挂残的 3002 端口进程；可 `Get-Process -Id (Get-NetTCPConnection -LocalPort 3002).OwningProcess` 结束旧进程后重启 dev server。
  3. 若热更新在 Windows 上因长路径或 watch 限制导致失败，考虑切换到 WSL 或 Node 18/20 LTS。

### 7. 题库筛选维度不足，无法按关键字搜索或在组卷界面复用
- 文件：`src/app/questions/page.tsx:3-210`
- 仅支持按类型/难度筛选，缺少关键字搜索与题目预览链接；题干也被 `substring(0, 60)` 截断。
- 影响：当老师想找特定题目加入试卷时，必须记住 ID 或复制题目内容，且与组卷页面完全脱节。
- 建议：
  - 增加搜索框（content/knowledge_points/creator）并允许展开全文；
  - 在组卷页面嵌入题库抽屉或“从题库选题”按钮，共享同一过滤器。

### 8. `.env.local` 连同真实 Supabase 证书被提交到仓库
- 证据：根目录 `.env.local:1-7` 直接包含 `NEXT_PUBLIC_SUPABASE_URL=https://byccgjdynwwlsrdvtpky.supabase.co` 和完整 anon key。
- 风险：任何人 clone 仓库即可拿到线上 Supabase 项目地址与匿名密钥，能读写公开表，甚至通过调 Supabase REST API 获取敏感数据；这也意味着密钥会被搜索引擎收录。
- 建议：立即撤销该密钥（Supabase 控制台 → reset anon key），并把 `.env.local` 加入 `.gitignore`；改用 `.env.local.example` 提示占位符，在 CI/部署中通过环境变量注入。

### 9. 注册流程允许用户自行选择 “teacher”，没有审核／白名单
- 证据：`src/app/register/page.tsx:19-71` 的表单默认 `role=teacher`，提交时直接把 `role` 传给 `signUp`；`src/lib/auth.ts:6-40` 会把该值写入 `profiles` 表，完全没有后台审批或白名单校验。
- 风险：任何访客都能注册成老师账号；RLS 策略中大量“teacher can manage own classes/papers/assignments”将失效——恶意用户可创建班级、布置作业、访问其他学生数据。
- 建议：注册流程只允许生成 `student`，教师账号由管理员在后台创建；或至少引入邀请码/邮箱后缀白名单，并在 `signUp` 处忽略前端传入的 `role`。

### 10. 智能组卷可能重复抽中同一道题且无法去重
- 证据：`src/app/papers/create/page.tsx:96-135` 对每个 requirement 都独立 `selected.push(...picked)`，既没有排除之前选过的题，也没有按 question_id 去重。
- 影响：当老师配置“2 道 medium 选择题 + 2 道 medium 填空题”但题库中只有 2 道题时，最后会出现重复题目，占用题号，影响学生答题体验。
- 建议：维护 `Set` 记录已使用的 `question.id`，在抽题时过滤掉重复；若题库无法满足需求，要把缺少的数量提示出来，并允许老师手动补填。

### 8. `.env.local` 连同真实 Supabase 证书被提交到仓库
- 证据：根目录 `.env.local:1-7` 直接包含 `NEXT_PUBLIC_SUPABASE_URL=https://byccgjdynwwlsrdvtpky.supabase.co` 和完整 anon key。
- 风险：任何人 clone 仓库即可拿到线上 Supabase 项目地址与匿名密钥，能读写公开表，甚至通过 REST API 获取敏感数据；密钥还会被搜索引擎收录。
- 建议：立即在 Supabase 控制台重置 anon key，并把 `.env.local` 加入 `.gitignore`；演示用例放在 `.env.local.example`，部署阶段通过环境变量注入。

### 9. 注册流程允许用户自行选择 “teacher”，没有审核／白名单
- 证据：`src/app/register/page.tsx:19-71` 默认 role=`teacher`，提交后 `signUp` 直接把 role 写入 `profiles` (`src/lib/auth.ts:6-40`)。
- 风险：任何访客都能注册成老师账号，继而创建班级/作业、访问学生数据，RLS 也无法阻止“伪教师”破坏数据。
- 建议：注册流程应强制 role=`student`，教师账号由后台创建或使用邀请码/邮箱后缀白名单；`signUp` 处忽略前端传入的 role。

### 10. 智能组卷可能重复抽中同一道题且无法去重
- 证据：`src/app/papers/create/page.tsx:96-135` 每个 requirement 随机抽题后直接 `selected.push(...picked)`，没有排除之前已选的 question_id。
- 风险：同一道题会出现在试卷多处，不仅影响体验，还会造成错题本/分析数据不准确。
- 建议：维护一个 `Set` 记录已使用的 question_id，抽题时过滤掉重复；若题库不足，要提示“缺少 X 道题”并允许老师手动补齐。

### 11. Webhook nonce 校验完全未实现，易被重放攻击
- 证据：`src/lib/server/webhook.ts:58-74` 的 `verifyWebhookNonce` 直接 `console.warn('Nonce verification not implemented')` 后返回 `true`。
- 风险：攻击者可以抓取一次 LiveKit/ZEGO 的 webhook 请求并无限重放，使课堂状态被反复切换，或伪造录制完成事件；即便签名正确，也应校验 nonce/timestamp。
- 建议：按注释所说接入 Redis/Memcached，把 `nonce` 写入 `webhook:nonce:<value>`，TTL ≥ 5 分钟；若已存在则拒绝请求。

### 12. Supabase RLS 政策缺少 `WITH CHECK`，INSERT 无法限制所有权
- 证据：`db/schema.sql:102-141` 中 `classes/papers/assignments` 的政策均写成 `FOR ALL USING (teacher_id = auth.uid())`（或 `created_by = auth.uid()`），没有 `WITH CHECK`。
- 在 Postgres RLS 中 INSERT 只检查 `WITH CHECK` 表达式；未提供时默认 `TRUE`，因此任何登录用户都可以伪造 `teacher_id`/`created_by` 字段插入记录。
- 影响：学生可调用 Supabase REST 直接创建班级/试卷/作业，把 `teacher_id` 设置为别人的 ID，破坏数据甚至覆盖老师资源。
- 建议：为这些表新增 `WITH CHECK (teacher_id = auth.uid())`／`WITH CHECK (created_by = auth.uid())` 的插入策略；并在后台 API 层校验传入字段，避免信任前端。

### 13. 学情分析存在严重 N+1 查询，容易触发 Supabase 速率限制
- 证据：`src/app/analytics/page.tsx:66-120` 遍历每份提交时都 `await supabase.from('questions').select('*').in('id', questionIds)`，即使 50 份作业也会发出 50 次 HTTP 请求，还是串行的。
- 影响：学生数据一旦增多，页面会长时间卡在“加载中”，还容易触发 Supabase 行数限制、导致 429/Rate Limit；移动端更易崩溃。
- 建议：先合并所有 `question_ids` 去重后批量查询一次，或把统计移到服务端 API；另外对 `Promise.all` 做并发控制，并缓存常用的题目详情。

## 体验总结
- 目前教师在真实浏览器中的“构题→组卷→布置→批改”路径会多次卡壳：看不懂菜单（乱码）、抽题完全随机、批改按钮直达 404、退出登录后甚至无法重新进入首页。
- 短期 patch 不足以解决问题，需要“功能 + 流程 + 发布”三方面的根治策略：
  1. **题库增强**：支持搜索/预览/批量选择，并允许直接将题目加入当前试卷；
  2. **组卷分步化**：提供“智能推荐”和“手动挑选”两种模式，最后一步才生成试卷；
  3. **批改闭环**：补全 `/grade` 页面或嵌入式批改区，确保老师能完整走完流程；
  4. **构建/部署守护**：把 `npm run build && npm run start`、`.next` 静态资源校验、主要路由 smoke test 纳入发布前脚本。

## 防止复发的稳定性措施
1. **新增 UI/路由回归脚本**：使用 Playwright 或 Cypress 覆盖“登录→题库→组卷→作业→批改→退出登录→首页”全路径，如果任意步骤失败则 CI 阻断。
2. **静态资源健康检查**：在启动脚本中验证 `/.next/static/chunks/app/page.js` 等关键资源存在并能被访问；若失败立即报警。
3. **文案编码检测**：在 pre-commit/CI 中加入 UTF-8 检查（例如 `python -m ftfy` 或 `iconv` 验证）防止再次出现乱码。
4. **Spec Kit / codex 报告同步**：每次修复后更新 Spec Kit tasks，执行 `codex测试分析报告.md` 的检查项并记录结果，确保问题闭环。

## 术语映射（课堂 / 题库域）

| 英文术语 | 中文含义 | 文档中的语境 |
| --- | --- | --- |
| Blind draw | 盲抽题/纯随机抽题 | Issue 1 所述流程，强调老师无法预览题目。 |
| Knowledge points | 知识点标签 | Issue 2 中提到的 `KNOWLEDGE_POINTS`，需要 UTF-8 正确展示。 |
| Hydration | SSR 再水合 | Issue 4 对 `_next` 静态资源 404 的分析，说明 React 无法 hydrate。 |
| Smoke test | 冒烟测试/基础验证 | 根治策略第 4 条引用的 `smoke test`，指构建后的关键路由巡检。 |
| Spec Kit | 规格任务包 | “防止复发”第 4 点中提及的 Spec Kit tasks，对齐 Codex 报告条目。 |
| Hook (pre-commit) | Git 提交前钩子 | “文案编码检测”条目强调的自动化，把 UTF-8 巡检纳入提交流程。 |
