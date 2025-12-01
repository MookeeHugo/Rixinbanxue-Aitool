# RixinMate 题库黄金数据集（Phase 0 基线）

本说明用于同步 Phase 0 交付成果：明确项目当前运行环境、完成数据集目录骨架、约定命名与元数据规范，并细化回归测试成功判定与手工核对模板。所有内容默认 UTF-8 存储，如需自检可执行 `rg '? ? ?'` 检查潜在乱码。

## 1. 运行环境与关键目录
- Node.js：`v24.11.0`（`node -v`），使用 `ts-node`/`next` 生态，保持 `npm`/`pnpm` 锁文件一致。
- 主要依赖：`next@14`、`sharp`、`zod`、`ts-node`、`jest`、`playwright` 等，后续测试脚本直接复用 `ts-node`。
- 目录要点：
  - `src/lib/gemini-vision-client.ts`：主解析逻辑与未来黑匣子日志插入点。
  - `tests/dataset`：黄金数据集根目录（本文件所在位置）。
  - `tests/output` & `tests/report.html`：预留给回归报告与可视化调试产物。
  - `scripts/`：放置 CLI 工具（回归跑分、视觉验证等）。

## 2. 数据集目录结构

```
tests/
└── dataset/
    ├── 01_standard/
    │   ├── STD-01-linear-equations.jpg      # 线性方程基础题
    │   ├── STD-02-triangle-geometry.jpg     # 三角几何入门
    │   ├── STD-03-quadratic-functions.jpg   # 二次函数图像
    │   ├── STD-04-probability-stats.jpg     # 概率统计读表
    │   ├── STD-05-mixed-calculation.jpg     # 混合计算综合
    │   └── STD-06-perfect-a4-scan.jpg       # A4 扫描无噪声
    │
    ├── 02_complex/
    │   ├── CPLX-01-two-column-layout.jpg    # 双栏密集排版
    │   ├── CPLX-02-dense-small-figures.jpg  # 多小图并列
    │   ├── CPLX-03-embedded-in-text.jpg     # 图文环绕排版
    │   ├── CPLX-04-composite-diagrams.jpg   # 组合图像题
    │   ├── CPLX-05-proof-heavy-text.jpg     # 证明题大段文字
    │   └── CPLX-06-crowded-references.jpg   # 多引用脚注
    │
    ├── 03_handwritten/
    │   ├── HAND-01-red-pen-marks.jpg        # 红笔批注干扰
    │   ├── HAND-02-student-answers.jpg      # 学生手写答题
    │   ├── HAND-03-margin-notes.jpg         # 页边草稿
    │   ├── HAND-04-scribbled-out.jpg        # 大面积涂抹
    │   ├── HAND-05-pencil-sketches.jpg      # 铅笔作图
    │   └── HAND-06-student-annotations.jpg  # 自由批注页
    │
    ├── 04_bad_quality/
    │   ├── BAD-01-low-resolution.jpg        # 低分辨率模糊
    │   ├── BAD-02-camera-shadow.jpg         # 拍照阴影
    │   ├── BAD-03-skewed-angle.jpg          # 斜拍透视
    │   ├── BAD-04-folded-paper.jpg          # 折痕遮挡
    │   ├── BAD-05-poor-lighting.jpg         # 光线不足
    │   └── BAD-06-low-contrast-photo.jpg    # 对比度极低
    │
    ├── 05_edge_cases/
    │   ├── EDGE-01-pure-text-only.jpg       # 全文本无图片
    │   ├── EDGE-02-cross-page-top.png       # 跨页上半张
    │   ├── EDGE-03-cross-page-btm.png       # 跨页下半张
    │   ├── EDGE-04-huge-single-fig.jpg      # 超大独立图
    │   ├── EDGE-05-vertical-text.jpg        # 竖排文字
    │   └── EDGE-06-borderless-diagram.jpg   # 无边框图示
    │
    └── 06_bugs/
        ├── BUG-01-clip-issue.jpg            # 【回归】顶点裁剪
        ├── BUG-02-timeout.jpg               # 【回归】请求超时
        └── BUG-03-json-parse-regression.jpg # 【回归】JSON 异常
```


### 2.1 命名规范
- 文件命名：`{场景缩写}-{序号两位}-{简述}.{ext}`，示例 `STD-01-basic-algebra.jpg`。
  - 场景缩写：`STD`、`CPLX`、`HAND`、`BAD`、`EDGE`、`BUG`.
  - 序号从 `01` 起，紧随三、四个英文单词描述关键特征。
  - 扩展名使用原图格式（推荐 `.jpg` / `.png`）。
- 同一原件多页：在序号后追加 `-p{页码}`，示例 `CPLX-03-p2-geometry.png`。

### 2.2 元数据文件
- 每个目录需维护 `metadata.json`，采用数组结构，字段含义如下（详见模板）。
- 元数据记录真实题目数量、来源、特殊标签，供自动回归与人工核对复用。

```jsonc
[
  {
    "fileName": "STD-01-basic-algebra.jpg",
    "scenario": "01_standard",
    "source": "2024-09 mock exam",
    "page": 1,
    "questionCountExpected": 12,
    "hasHandwriting": false,
    "primaryIssues": [],
    "notes": "清晰扫描件，用于 Level3 基准",
    "lastReviewer": "alice",
    "lastReviewedAt": "2025-12-01T02:30:00+08:00"
  }
]
```

> **提示**：若暂未收集完 5 张样例，可填写 `questionCountExpected: null` 并在备注中说明待补齐信息，收集完成后立刻更新。

### 2.3 已落盘样本清单

```
tests/
└── dataset/
    ├── 01_standard/
    │   ├── STD-01-linear-equations.jpg      # 基础代数方程，排版标准
    │   ├── STD-02-triangle-geometry.jpg     # 基础几何三角形，图形清晰
    │   ├── STD-03-quadratic-functions.jpg   # 二次函数图像，标准坐标系
    │   ├── STD-04-probability-stats.jpg     # 概率统计表格，无干扰
    │   └── STD-05-mixed-calculation.jpg     # 混合四则运算，纯净文本
    │
    ├── 02_complex/
    │   ├── CPLX-01-two-column-layout.jpg    # 双栏排版，测试阅读顺序
    │   ├── CPLX-02-dense-small-figures.jpg  # 密集小图（如选择题每题一图）
    │   ├── CPLX-03-embedded-in-text.jpg     # 图片嵌入文字中间（绕排）
    │   ├── CPLX-04-composite-diagrams.jpg   # 组合图形（多图拼接）
    │   └── CPLX-05-proof-heavy-text.jpg     # 大段证明题文本，长篇幅
    │
    ├── 03_handwritten/
    │   ├── HAND-01-red-pen-marks.jpg        # 含红笔批改痕迹干扰
    │   ├── HAND-02-student-answers.jpg      # 学生填写的黑色手写答案
    │   ├── HAND-03-margin-notes.jpg         # 页边距有草稿涂鸦
    │   ├── HAND-04-scribbled-out.jpg        # 题目上有涂抹痕迹
    │   └── HAND-05-pencil-sketches.jpg      # 铅笔作图痕迹（对比度低）
    │
    ├── 04_bad_quality/
    │   ├── BAD-01-low-resolution.jpg        # 低分辨率模糊图
    │   ├── BAD-02-camera-shadow.jpg         # 拍照阴影遮挡文字
    │   ├── BAD-03-skewed-angle.jpg          # 拍摄角度严重倾斜
    │   ├── BAD-04-folded-paper.jpg          # 试卷折痕导致文字扭曲
    │   └── BAD-05-poor-lighting.jpg         # 光线昏暗，噪点多
    │
    ├── 05_edge_cases/
    │   ├── EDGE-01-pure-text-only.jpg       # 全页无图，测试是否乱框
    │   ├── EDGE-02-cross-page-top.png       # 跨页题的上半部分
    │   ├── EDGE-03-cross-page-btm.png       # 跨页题的下半部分
    │   ├── EDGE-04-huge-single-fig.jpg      # 单个超大图占据全页
    │   └── EDGE-05-vertical-text.jpg        # 竖排文字（古文或特殊排版）
    │
    └── 06_bugs/
        ├── BUG-01-missing-label-a.jpg       # [已修复] 曾导致顶点A被切掉
        ├── BUG-02-json-parse-fail.jpg       # [已修复] 曾导致JSON解析崩溃
        └── BUG-03-timeout-sample.jpg        # [已修复] 曾导致34s超时的原图
```

> 说明：EDGE-02/EDGE-03 收到的原件为 `.png`，已按原格式存放，如需统一扩展名可在工具链完整后再批量转换。
> 提醒：2025-12-01 起 01/02/03/04/05/06 目录必须维护 `metadata.json`，缺失字段会导致回归脚本跳过或标记 `SKIP`。

### 2.4 外部数据集（shijuanceshi）
- 根目录：`shijuanceshi/`（一次性导入 261 张中考专题讲练页）
- 元数据：`shijuanceshi/metadata.json`（自动生成描述，`expected_count` 待人工补齐）
- 回归脚本默认加载 `tests/dataset` + `shijuanceshi`，也可通过环境变量覆盖：

```bash
# 仅使用标准数据集
REGRESSION_DATASET_ROOTS=tests/dataset npm run test:regression

# 指定多个目录（逗号或分号分隔）
REGRESSION_DATASET_ROOTS="tests/dataset,shijuanceshi,../custom-dataset" npm run test:regression
```

> 提示：外部目录与内部目录结构一致即可复用 metadata 与日志机制。

## 3. 成功判定（Level 1/2/3）
| Level | 检查对象 | 自动化标准 | 说明 |
|-------|----------|------------|------|
| Level 1 - 可用性 | API/CLI 调用 | 进程返回 0、HTTP 200、无未捕获异常；`processImageStream` 完成 | 任何报错（超时、网络）即 Fail，黑匣子需落盘 |
| Level 2 - 完整性 | 解析结果结构 | JSON 可被 `JSON.parse` 与 `zod` schema 校验；`questions.length > 0`；每个问题含 `box_2d` | 若 schema 校验失败，记录字段名，并纳入 `06_bugs` |
| Level 3 - 准确性 | 题目/切图质量 | 手工逐张比对题目数、题型；查看可视化红框是否覆盖完整元素；允许 ≤5% 题干截断 | Level3 以人工核对表为准（见下一节） |

## 4. 手工核对模板
将以下模板复制到 `tests/dataset/06_bugs` 或对应目录下的 `manual-review.md` 中逐条维护；也可在回归脚本输出中附上链接。

```markdown
| 图片 | 期望题量 | 实际题量 | 框选偏差 | 语义偏差 | 复核人 | 日期 | 备注 |
|------|----------|----------|----------|----------|--------|------|------|
| STD-01-basic-algebra.jpg | 12 | 12 | OK | OK | Alice | 2025/12/01 | —— |
| BAD-02-shadow-angle.png | 8 | 7 | WARN (题 3 被截) | OK | Bob | 2025/12/02 | 记录至 06_bugs |
```

- **框选偏差**：使用 `OK`、`WARN (描述)`、`FAIL` 三档。
- **语义偏差**：判断解析内容是否漏题、错题，必要时附加 `raw_response.txt` 片段。
- 每次回归后若有新失败，需从日志目录取源图 + 原始响应，补在 `06_bugs` 并更新此表。

## 5. 下一步
1. 按照规范逐类补齐 5 张样本并维护 `metadata.json`。
2. 在线上复现错误时，先放入 `06_bugs` 并记录元数据。
3. 为 Level3 核对准备可视化红框工具，与手工模板联动，确保问题闭环。
