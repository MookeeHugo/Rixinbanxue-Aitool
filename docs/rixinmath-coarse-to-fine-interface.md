# RixinMath 粗到精流水线接口

> 责任人：AI 平台负责人（总体架构） + 前端主程（Next.js 上传管线） + 后端主程（Python/CV 服务）

## 1. 三路图像流

| 流类型 | 产生模块 | 生成逻辑 | 存储/命名 | 下游用途 |
| --- | --- | --- | --- | --- |
| 原图 `original` | 上传接入层（Next.js） | 仅做格式验证，保持原始尺寸/色彩 | Supabase `ai-question-bank/{taskId}/raw/{filename}` | 最终裁剪、锚点 OCR、展示 |
| 网格图 `grid` | Python `ImagePreprocessor.add_grid_overlay` | 在高清副本上叠加 20×20 红色网格线与 0-100 刻度（步长 5），写入 EXIF 记录原图尺寸 | Supabase `ai-question-bank/{taskId}/grid/{filename}` | Gemini 语义解析输入（视觉坐标尺） |
| 二值化图 `binary` | Python `ImagePreprocessor.preprocess_for_cv` | RGB → 灰度 → Otsu 二值化，保持原始尺寸，同步写 `processing.json` 记录转换参数 | Supabase `ai-question-bank/{taskId}/binary/{filename}` | CV 轮廓检测、ROI 放大 |

> 读写均使用 UTF-8，新增/修改脚本后需使用 `rg "\\uFFFD" -n` 检查避免乱码。

### 1.1 未来形态：Python 直连上传（待评审）

- **目标**：由 Python 预处理服务直接接收前端上传的文件流（多表单字段），完成三路图像生成后再写入 Supabase，并返回 URL/meta 给 Next.js，减少一次“Next.js 下载 → Python 写入 → Node 再下载”的 Ping-Pong。  
- **基线监控**：在现状方案中记录 `ingest_upload_latency_ms`、`supabase_bandwidth_mb`、`python_processing_ms` 等指标，为直连方案上线后提供对比；当图片 >5 MB 时需单独采样。  
- **权限与降级**：若未来启用直连，需要最小化 Supabase/R2 写权限，仅允许 Python 服务写入 `ai-question-bank/{taskId}` 前缀，并保留回退路径（Next.js 仍可走旧流程）。

## 2. 坐标规范（统一 0-100，保留 1 位小数）

- 所有归一化坐标（Gemini 粗框、CV 精框、锚点延展）统一为 `[ymin, xmin, ymax, xmax]`，数值范围 `0.0 ≤ value ≤ 100.0`。
- 小数分辨率为 0.1，可传入 `12.3`、`45.0` 等；Zod/TypeScript 类型会校验最多一位小数。
- 像素转换采用 `value / 100 * width/height`，所有 `NormalizedBox` ↔ `PixelRect` 工具已同步更新。
- 历史 0-1000 数据在入库时需执行一次 `value / 10` 迁移（详见迁移脚本 PR）。

## 3. JSON 类型与数据库字段

### 3.1 TypeScript (`src/lib/ai-question-bank/types.ts`)

- `NormalizedBox` 注释更新为 “0-100 范围，1 位小数”。
- `GeminiImageRegion` 增加：
  - `rough_bbox: NormalizedBox`（LLM 原始坐标）
  - `anchor_text_prev` / `anchor_text_next`（上下各 10 个字符）
  - `confidence?: number`、`source?: 'llm' | 'cv'`
  - `padding` 中保留 `px`/`ratio`，`rough_padding` 记录 LLM 偏移。
- `QuestionImageAsset` 增加 `final_image_path: string | null`、`anchor_verification?: { matched: boolean; ocr_text?: string }`。

### 3.2 Gemini Structured Output

```json
{
  "page_id": "uuid",
  "questions": [
    {
      "id": 1,
      "content_latex": "string",
      "type": "choice/fill/solution",
      "has_image": true,
      "image_info": {
        "rough_bbox": [12.5, 30.0, 28.7, 55.6],
        "anchor_text_prev": "……题干末尾10个字符",
        "anchor_text_next": "题干之后10个字符……"
      }
    }
  ]
}
```

Zod Schema (`gemini-vision-client.ts`) 保证：  
`rough_bbox`/`box_2d` 范围 0-100；`anchor_text_*` 长度 0-40；`rough_bbox` 与 `box_2d` 默认一致，CV 纠偏后写入 `box_2d/padded_box_2d`。

### 3.3 数据库（Supabase JSON 列）

- `upload_tasks.parsed_questions` 中的每题 `image_regions[].normalized_bbox` 改为 0-100。
- `question_images` 表新增 `final_image_path`、`anchor_verified`、`anchor_ocr_text` 字段，用于裁剪成品与锚点审计。

## 4. 服务接口

### 4.1 Python 图像预处理（新增模块）

- `POST /api/preprocess`  
  请求：`taskId`, `file_url`  
  响应：`{ original_url, grid_url, binary_url, meta: { width, height } }`

### 4.2 Gemini Proxy（现有 Node 服务）

- 读取 `grid` 图像送入 `gemini-2.5-flash`，`prompt` 明确 “参考网格坐标，输出 0-100（含 0.1）”。
- 输出 `rough_bbox`、`anchor_text_prev/next`，并保留与任务 ID、页面 ID 的映射。

### 4.3 CV 精修 (`CoordinateRefiner`)

- FastAPI 端点 `POST /api/refine-bbox`：参数 `binary_url`, `rough_bbox`, `image_meta`。  
  返回 `refined_bbox`, `confidence`, `status`, `reason?`。  
  ROI 默认扩展 2%（`padding_x/y = image_dim * 0.02`），形态学核 `5x5`，最大轮廓回映射失败时返回原框并记录 `status: "fallback"`.

### 4.4 锚点 OCR

- 利用 `paddleocr-service`，新增 `POST /api/check-anchor`，传入最终裁剪图 + `anchor_text_prev/next`，检测上下 20px 区域出现位置；失败则返回建议收缩比例 & OCR snippet。

## 5. 流程总览

1. Next.js 上传文件 → 保存原图，调用 Python 预处理生成网格/二值图。
2. Gemini 调用（输入网格图）→ 返回题目 JSON + `rough_bbox` + 锚点文本。
3. Node 任务并发调用 CV Refiner（输入二值图 + 粗框）→ 得到 `refined_bbox`。
4. 若 CV 失败则使用 `rough_bbox`；随后使用原图裁剪 → `question-images`。
5. 对裁剪结果调用锚点 OCR，若检测到锚点文本则自动缩框、更新 `anchor_verification`，否则标记人工审核。
6. 最终 JSON 写入数据库，`final_image_path` 指向原图裁剪结果，保留 refine/anchor 日志。

## 6. 交付与后续

1. **设计文档**（本文件）并入 `docs/`，供团队评审。  
2. **类型定义 PR**：同步 `src/lib/ai-question-bank/types.ts`、`gemini-vision-client.ts`、`schemas.ts`。  
3. **数据库迁移**：增补新列、历史数据 scale-down。  
4. **模块实现顺序**：图像预处理 → Gemini Prompt & schema → CV Refiner → 裁剪/锚点校验改造。  
5. **质量门槛**：每步引入 `rg "\\uFFFD" -n` 检查 UTF-8，新增单元测试覆盖 0-100 坐标转换与锚点字段。

## 7. 模块实施路线

### 7.1 图像预处理模块落地
- Python 仓库（沿用 `paddleocr-service` 或新建 `rixinmath-pipeline`）新增 `ImagePreprocessor` 类：  
  1. `add_grid_overlay(image_path)`：Pillow 绘制 20×20 网格、5/10 刻度，并写入 `meta.json`。  
  2. `preprocess_for_cv(image_path)`：灰度化 → Otsu 二值化，保持分辨率与 DPI。  
- Next.js 上传流程：下载一次原图后缓存 `original/grid/binary` 三份文件再上传 Supabase；函数执行完运行 `rg "\\uFFFD" -n` 确认日志无乱码。
- **Addendum（并发）**：预处理 API handler 使用 `def` 或 `fastapi.concurrency.run_in_executor` 将 Pillow/Otsu 阶段放入线程池，避免阻塞事件循环；当未来切换到 Python 直连上传时亦沿用相同机制。  
- **Prompt Snippet**：`When implementing preprocess_for_cv, ensure heavy image processing runs via fastapi.concurrency.run_in_executor (or a background thread) so the FastAPI event loop is never blocked.`

### 7.2 Gemini 语义解析升级
- Prompt 调整为“参考 20×20 网格，输出 0-100（含 0.1）归一化坐标，并回传 anchor_text_prev/next”。  
- 保持 `gemini-2.5-flash` 单模型。若未来需要 Python 客户端，先实现 REST Proxy，再由 Next.js 调用。  
- `GeminiImageRegion` / `QuestionData` 类型新增锚点文本、`rough_bbox`、`rough_padding`，并在 `enrichImageRegions` 中写入 base64 裁剪数据。  
- **Addendum（粗框策略）**：在 Prompt 中明确“粗框默认额外外扩 ≥10% padding，宁可稍大，后续可依锚点缩剪”，确保不会因切小丢失上下文。  
- **Prompt Snippet**：`Provide generous rough bounding boxes (>=10% padding). Larger is safer because downstream CV + anchor OCR will shrink them—never cut off potential anchor text above/below the figure.`

### 7.3 CV 精修服务实现
- Python `CoordinateRefiner.refine_bbox(binary_image, rough_bbox)`：  
  - ROI 扩张 `padding_y/x = 2% image_dim`。  
  - `cv2.dilate(kernel=5x5)` → `cv2.findContours` → 最大轮廓外接矩形，映射回全图。  
  - 失败兜底：返回 `rough_bbox`，`status=fallback`，记录 `reason`。  
- FastAPI 端点 `POST /api/refine-bbox` 返回 `{ refined_bbox, confidence, status, reason? }`，供 Next.js 调用。
- **Addendum（阻塞治理）**：handler 使用线程池执行 OpenCV 计算；在处理前统计二值图黑/白像素比例，若接近纯白/纯黑直接 `status=fallback`；轮廓筛选时忽略紧贴 ROI 边界的细小噪声，以免 padding 被裁掉。  
- **Prompt Snippet**：`CoordinateRefiner must inspect the binary_image histogram first (fallback if nearly pure white/black) and run cv2.findContours inside run_in_executor/ThreadPool; ignore tiny contours that stick to the ROI edges.`

### 7.4 裁剪与存储通道改造
- `process-upload.ts` 先调用 CV 端点，成功后更新 `image_regions[].box_2d`，原箱写入 `rough_bbox`。  
- `crop-question-images.ts` 写入 `QuestionImageAsset.final_image_path`，并接收锚点验证结构体。  
- Supabase `question_images` 表新增列：`final_image_path text`、`anchor_verified boolean`、`anchor_ocr_text text`、`refine_status jsonb`，便于统计。  
- 增加失败重试机制（Inngest Job），确保裁剪/上传异常可补偿。

### 7.5 锚点校验与 OCR
- 复用 `paddleocr-service`，新增 `POST /api/anchor-verify`：入参为裁剪图 URL + `anchor_text_prev/next`，OCR 对上下各 20px 区域做模糊匹配。  
- 若命中锚点，返回 `{ matched: true, ocr_text }`；若过大则返回 `{ matched: false, suggested_shrink: { top: 0.05, bottom: 0.03 } }`，由 Node 端自动缩框。  
- 仍失败时，将 `anchor_verification.matched=false` 并设置人工复核标志。  
- **Addendum（Inclusion Rejection）**：锚点 OCR 以“包含即拒绝”为原则：对裁剪图顶部 10-15% 区域做 OCR，若 `anchor_text_prev` 模糊匹配 >80% 且位于内部，则表明裁剪过宽，记录文本下边界并重新设定裁剪起点；若完全未命中，则标记为“需人工复核”而非自动通过。  
- **Prompt Snippet**：`Anchor OCR uses an inclusion-rejection rule: OCR the top 10-15% strip of the cropped image; if anchor_text_prev is found inside that strip (fuzzy match >80%), shrink the crop to start below the detected text, otherwise flag the region for manual review.`

> 注：上述 Addendum 需同步写入 Codex/Cursor Prompt 模板和代码评审清单，确保所有协作者在实现时自动遵循。
