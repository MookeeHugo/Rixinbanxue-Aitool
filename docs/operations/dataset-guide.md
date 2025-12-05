# 测试数据集管理指南（tests/dataset）

> 本文整理了 Phase 0 期间积累的题库图片数据集结构、命名规范、metadata 需求以及回归脚本的使用方式。

## 1. 环境与依赖

- Node.js ≥ 18（推荐 v20+），与仓库 `package.json` 保持一致。
- 关键依赖：`next@14`、`sharp`、`zod`、`ts-node`、`jest`、`playwright`。
- 目录关注点：
  - `tests/dataset`：主数据集。
  - `tests/output`：回归脚本输出。
  - `scripts/`：CLI 工具（如回归检测）。

## 2. 目录结构

```
tests/
├─ dataset/
│  ├─ 01_standard/
│  │  ├─ STD-01-linear-equations.jpg
│  │  ├─ …
│  ├─ 02_complex/
│  ├─ 03_handwritten/
│  ├─ 04_bad_quality/
│  ├─ 05_edge_cases/
│  └─ 06_bugs/
```

### 2.1 命名规范

`{场景缩写}-{两位序号}-{描述}.{ext}`，示例：`STD-01-basic-algebra.jpg`
- 场景缩写：`STD`（标准）、`CPLX`（复杂）、`HAND`（手写）、`BAD`（低质量）、`EDGE`（边界）、`BUG`（已知问题）等。
- 多页文件：在描述后追加 `-p{页码}`，如 `CPLX-03-p2-geometry.png`。
- 建议使用 `.jpg`/`.png`。

### 2.2 metadata.json

每个目录需包含 `metadata.json`，字段示例：

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
    "notes": "高清扫描，用于 Level3 基线",
    "lastReviewer": "alice",
    "lastReviewedAt": "2025-12-01T02:30:00+08:00"
  }
]
```

### 2.3 目录说明

- `01_standard`：基础题型/排版。
- `02_complex`：多列、长图、混合排版。
- `03_handwritten`：学生答案、批注。
- `04_bad_quality`：低清晰度、折痕、遮挡。
- `05_edge_cases`：纯文字/跨页/竖排等。
- `06_bugs`：已知问题样例，需保留原始响应供复现。

## 3. 外部数据集（legacy/shijuanceshi）

- 位置：`legacy/shijuanceshi/`，包括 261 份中考专题试卷扫描件。
- `metadata.json` 由脚本生成，`expected_count` 需人工校正。
- 回归脚本可通过环境变量同时加载多个根目录：

```bash
REGRESSION_DATASET_ROOTS="tests/dataset,legacy/shijuanceshi" npm run test:regression
```

## 4. 回归等级定义

| Level | 核查对象 | 自动判定 | 说明 |
| --- | --- | --- | --- |
| Level1 可用性 | API/CLI 调用 | 需返回 HTTP 200、`processImageStream` 完成 | 任意错误（超时/网络）即 Fail。 |
| Level2 结构完整 | JSON 结构 | 通过 `JSON.parse` + `zod` 校验，每题含 `box_2d` | 若 schema 失败，样本移入 `06_bugs`。 |
| Level3 识别准确 | 题目/切图质量 | 人工比对题目数量、切图完整性，要求 ≥90% | 使用 `manual-review.md` 模板记录结果。 |

示例模板：

```markdown
| 图片 | 预期题量 | 实际题量 | 切图质量 | 差异描述 | 复核人 | 日期 | 备注 |
| STD-01-basic-algebra.jpg | 12 | 12 | OK | OK | Alice | 2025/12/01 | - |
```

## 5. 常见问题

| 问题 | 解决建议 |
| --- | --- |
| 未收集到 5 份样本 | 可先写入 `questionCountExpected: null`，在备注说明待补充。 |
| metadata 缺失 | 回归脚本将跳过，CI 需要补全后才能通过。 |
| 需要忽略某目录 | 通过 `REGRESSION_DATASET_ROOTS` 指定，只加载所需目录。 |

## 6. 下一步

1. 新增样本时，务必同步 `metadata.json`。
2. 发现新的失败模式时，将原始输入/响应放入 `06_bugs` 并更新模板。
3. 若外部数据集需要常态化使用，考虑写入 `docs/project-governance/file-archive-log.md`，确保索引一致。
