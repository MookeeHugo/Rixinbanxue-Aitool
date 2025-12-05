# start-dev 运行与日志指引

为了减少「先启动后排查」的往返，本指引汇总 `start-dev.ps1`/`npm run dev:*` 所依赖的日志输出位置，并定义 Phase D 约定的 logrotate/清理策略。所有文字均采用 UTF-8 编码。

## 常用启动命令

- `npm run dev:clean`：推荐指令，先调用 `scripts/dev-start.mjs --clean` 清扫端口和缓存，再启动 Next DevServer。
- `npm run dev`：快速验证，适合已确认本地状态干净的场景。
- `npm run health` / `npm run dev:fix`：当登录、上传卡住时，先运行 `health` 诊断，再用 `dev:fix` 重建依赖，最后回到 `npm run dev`。
- `npx supabase start`：若 `start-dev.ps1` 检测到本地 Supabase 未运行，将自动执行；也可在调试 CLI 流程时手动调用。

## 日志写入拓扑

| 目录 / 文件 | 写入来源 | 说明 |
| --- | --- | --- |
| `logs/failures/<YYYY-MM-DD>/<traceId>/` | `src/lib/ai-question-bank/gemini-vision-client.ts`，在 `ENABLE_BLACKBOX_LOGGING=true` 时落盘 | 每个 trace 保存 `source_image.jpg / raw_response.txt / error.log`，用于还原 Gemini Vision 的失败上下文。 |
| `logs/metrics/ingest-baseline.log` | `src/lib/ai-question-bank/process-upload.ts::recordIngestMetrics` | 记录 `upload_tasks` 的延迟、Python 侧耗时等指标，供 `/docs/rixinmath-coarse-to-fine-interface.md` 中的基线对账。 |
| `paddleocr-service/logs/{error,out}.log` | `paddleocr-service/pm2.config.cjs` | PaddleOCR/预处理服务的 PM2 日志；当 CLI 复现上传链路时需同步查看。 |
| `tmp/image-pipeline/<taskId>-*.png` | `paddleocr-service/preprocess_service.py` | FastAPI preprocessing 的产物（原图、网格图、二值图），排查裁剪失败时需要保留最近一批。 |
| `tmp/gemini-debug/*.txt` | `src/lib/ai-question-bank/gemini-vision-client.ts::writeDebugFile` | JSON 解析失败时保存的原始流日志，配合 `logs/failures` 交叉查看。 |
| `tmp/sample-upload.jpg` | `scripts/ingest-test.ts` | UI/CLI 双线验证所用的标准样例，勿删除。 |

## logrotate / 清理策略

1. **失败黑匣子 (`logs/failures`)**
   - 活跃窗口：保留最近 2 天目录，其余自动移动到 `logs/archive/failures`。
   - 指令：运行 `node scripts/log-maintenance.mjs`（可通过 `FAILURE_ACTIVE_DAYS` 环境变量修改窗口）。
   - 若需要进一步压缩，可对 `logs/archive/failures/<date>` 使用 `Compress-Archive` 或 `tar -czf` 再上传对象存储。
2. **指标日志 (`logs/metrics/ingest-baseline.log`)**
   - 单文件超过 512KB 或手动指定 `METRICS_ROTATE_BYTES` 时，由 `log-maintenance` 重命名为 `logs/archive/metrics/ingest-baseline-YYYYMMDD-HHmmss.log` 并新建空文件。
   - 便于一线对账：archive 中的文件名自带时间戳，可与 `upload_tasks.created_at` 对照。
3. **PaddleOCR/预处理日志**
   - `paddleocr-service/logs` 目前仅做 PM2 持久化；每周执行一次 `Compress-Archive paddleocr-service/logs paddleocr-service/logs-<date>.zip && Remove-Item paddleocr-service/logs/*.log`。
   - 归档后的 ZIP 连同 `tmp/image-pipeline/<taskId>-*.png` 的快照一并上传到对象存储或 `docs/archive/logs/`。
4. **tmp 目录**
   - `tmp/baseline`, `tmp/gemini-debug`, `tmp/image-pipeline` 保留最近 7 天；更早的数据移动到 `tmp/archive/<date>/` 并在 `docs/project-governance/file-archive-log.md` 登记。
   - 早期一次性脚本（如 `tmp-console-*.json`, `tmp-pricing-*.json`）全部归档到 `tmp/archive/<date>/legacy-console-dumps/`，避免 Next DevServer 意外扫描。
> 说明：`npm run dev:clean`（即 `scripts/dev-start.mjs --clean`）已内嵌 `node scripts/log-maintenance.mjs`，日常启动即可顺带执行上述 logrotate。

## 每日巡检 Checklist

1. 确认 `tmp/sample-upload.jpg` / `tmp/image-pipeline` / `logs/metrics/ingest-baseline.log` 读写权限正常。
2. 执行 `node scripts/log-maintenance.mjs`，观察输出中 `failuresArchived`、`metricsRotated` 的数量是否符合预期。
3. 对 `tmp/` 中新增的调试文件（如 Puppeteer 截图、脚本输出）按日期移动至 `tmp/archive/`，并更新 `docs/project-governance/file-archive-log.md`。
4. 如需 DevServer 观测，使用 `server-puppeteer` 的登录脚本（账号 `teacher@test.com` / `test123456`）完成 UI 验证，并将截图同步到 `docs/project-governance/project-status-tracker.md`。

严格按照以上策略可确保 Phase C/D 线程在日志清理、可追溯性方面保持一致，避免 legacy 目录再次被 DevServer/构建流程误读。
