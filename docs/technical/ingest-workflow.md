# “开始录题”模块工作流程与配置说明

## 1. 前置环境
- DevServer：`npm run dev`（默认 http://localhost:3002）。
- Supabase 本地栈：`npx supabase start`；需存在 `question-images` / `ai-question-bank` bucket。
- 登录账号：`teacher@test.com / test123456`。
- PaddleOCR 服务：`http://localhost:8000/ocr`，`/health` 应返回 200；Gemini 配置见 `.env.local` 中模型/密钥。
- 样本文件：`tmp/sample-upload.jpg`（UI/CLI 默认样例，可放更多 strip_ratio/anchor 复现场景在 `tests/dataset/ocr`）。

## 2. UI 流程（/tools/ingest）
1) 打开 `http://localhost:3002/tools/ingest` 并登录教师账号。
2) 上传文件（JPG/PNG/PDF，≤20MB）。拖拽或“选择文件”均可。
3) 任务进入列表（上传记录）。状态包含：解析中/已完成/失败（含 Gemini 返回空响应、裁剪结果为空等文案）。
4) 完成后可点击“查看结果”（跳转题目编辑/详情）。

提示：Puppeteer 自动化登录+上传可参考脚本惯例：解除 `#file-input.hidden` → `uploadFile(tmp/sample-upload.jpg)` → 点击“开始上传”；失败时保存 screenshot + console + network HAR。

## 3. CLI/脚本
- 图像链路自测：`node -r ts-node/register -r tsconfig-paths/register scripts/ingest-test.ts`（默认使用 `tmp/sample-upload.jpg`）。
- OCR 压测：`npm run ocr:benchmark`，可用环境变量覆盖：
  - `OCR_ENDPOINT`（默认 `http://localhost:8000/ocr`）
  - `OCR_CONCURRENCY`（默认 2，可设 4）
  - `DATASET_DIR`（默认 `tests/dataset/ocr`，仅扫描根目录）
  - 输出：`tmp/archive/ocr-benchmark/ocr-benchmark-*.jsonl`

## 4. 资源/配置
- Supabase 环境变量：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` 必填；如有私钥操作另需服务端密钥。
- 存储：`question-images` / `ai-question-bank` bucket 已在脚本中引用；R2/外部存储需保持同名或更新上传逻辑。
- OCR/Gemini：`.env.local` 中模型、区域、密钥需齐全；PaddleOCR 端点默认本地 8000，Gemini 模型默认 `gemini-2.5-flash`。

## 5. 巡检与留痕
- 健康检查：`npm run ci:health`（lint/build/encoding + log-maintenance dry-run + rg 巡检 + `/health`）。
- 图像链路巡检截图：`docs/project-governance/screenshots/2025-12-06-ingest-upload.png`（Puppeteer 上传 sample-upload.jpg，识别 1 题）。
- 日志/轮转：`node scripts/log-maintenance.mjs`（dry-run/执行），`logs/*` 保留 30 天，`tmp/archive/*` 保留 90 天（`tmp/archive/2025-12-04` 长期留痕）。

## 6. 常见问题
- 无法连接 OCR：检查 `curl http://localhost:8000/health` 是否 200；否则重启服务后重试。
- 上传 500（裁剪为空/Gemini 空响应）：使用 strip_ratio/anchor 样本在 `tests/dataset/ocr` 复现，结合 `npm run ocr:benchmark` 记录 request_id。
- Supabase 认证失败：确认 `.env.local` 已同步最新 URL/Anon Key，或重跑 `npm run db:backup:rls` 备份后恢复。

## 7. 一键启动 PaddleOCR（Windows/PowerShell）
### 方案 A：自带 CLI 轻量服务（适用 paddleocr 2.7+）
1) 安装依赖：
   ```bash
   pip install "paddlepaddle==2.6.0" "paddleocr==2.7.0.3"
   ```
   如需 GPU，请安装匹配显卡/驱动的 `paddlepaddle-gpu`。
2) 运行（前台）：
   ```powershell
   python -m paddleocr --use_angle_cls true --use_space_char true --image_dir tmp/sample-upload.jpg
   ```
   说明：paddleocr 2.7 起不再内置 `--serve`，仅提供命令行推理；如需 HTTP 服务请使用方案 B。

### 方案 B：paddleocr-service（FastAPI+uvicorn，推荐）
1) 依赖安装：
   ```powershell
   pip install -r paddleocr-service/requirements.txt
   ```
2) 一键启动：
   ```powershell
   powershell -ExecutionPolicy Bypass -File ./scripts/start-paddleocr-service.ps1   # 默认端口 8000
   ```
3) 健康检查：
   ```bash
   curl http://localhost:8000/health
   ```
   自定义端口：`powershell -ExecutionPolicy Bypass -File ./scripts/start-paddleocr-service.ps1 -Port 8010`，并设置 `OCR_ENDPOINT=http://localhost:8010/ocr`。
