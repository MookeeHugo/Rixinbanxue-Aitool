# RixinMath 自动化测试执行指南

## 快速开始
前置要求：
- ✅ Next.js 开发服务运行在 `localhost:3002`
- ✅ PaddleOCR 服务运行在 `localhost:8000`
- ✅ 测试账号：`teacher@test.com` / `test123456`
- ✅ `.env.local` 配置完整（至少包含 Supabase URL/Anon Key）

---

## 一、执行完整测试流程
### 第 1 步：批量上传测试（L1 可用性）
```bash
# 测试所有数据集
node scripts/auto-test-batch-upload.mjs \
  --dataset tests/dataset \
  --email teacher@test.com \
  --password test123456 \
  --output logs/test-reports/$(date +%Y%m%d)/batch-results.json

# 仅测试标准场景
node scripts/auto-test-batch-upload.mjs \
  --dataset tests/dataset/01_standard \
  --output logs/test-reports/$(date +%Y%m%d)/std-batch.json

# 并发执行（视服务性能调节并发数）
node scripts/auto-test-batch-upload.mjs \
  --dataset tests/dataset \
  --concurrent 3 \
  --output logs/test-reports/$(date +%Y%m%d)/batch-concurrent.json
```

### 第 2 步：结果验证（L2/L3/L4）
```bash
node scripts/auto-validate-results.mjs \
  --input logs/test-reports/<目录>/batch-results.json \
  --level ALL \
  --metadata tests/dataset
```

### 第 3 步：生成 HTML 报告
```bash
node scripts/auto-generate-report.mjs \
  --input logs/test-reports/<目录> \
  --output logs/test-reports/<目录>/report.html
```

### 第 4 步：查看报告
```bash
start logs/test-reports/<目录>/report.html
```

---

## 二、结果文件说明
- `batch-*.json / batch-*.csv`：批量上传原始结果
- `batch-*-validation-*.json`：L1-L4 验证结果
- `report.html`：HTML 汇总报告

---

## 三、常见问题排查
- 登录失败：检查 `.env.local` 的 Supabase URL/Anon Key，确认测试账号密码。
- 长时间 pending：脚本会在超时前自动重触发处理；如仍失败，检查后台处理服务日志。
- 验证跳过：如果缺少 `metadata.json` 或预期题量未填写，L3 会跳过，请补齐元数据。

---

## 四、CI/CD 示例（伪代码）
```yaml
env:
  TEST_DATE: $(date +%Y%m%d)
steps:
  - name: 批量上传与处理
    run: node scripts/auto-test-batch-upload.mjs --dataset tests/dataset --output logs/test-reports/${TEST_DATE}/batch.json
  - name: 结果验证（L1-L4）
    run: node scripts/auto-validate-results.mjs --input logs/test-reports/${TEST_DATE}/batch.json --level ALL
  - name: 生成报告
    run: node scripts/auto-generate-report.mjs --input logs/test-reports/${TEST_DATE} --output logs/test-reports/${TEST_DATE}/report.html
  - name: 保存报告工件
    uses: actions/upload-artifact@v3
    with:
      name: test-report-${TEST_DATE}
      path: logs/test-reports/${TEST_DATE}
```

> 基线保留：`logs/test-reports/<日期>/` 作为每日基线输出目录，上传为 CI 工件便于回溯。确保 CI 环境具备 `.env.local`（含 Supabase URL/Anon Key 等）以及依赖服务（Next.js/PaddleOCR）可用。
