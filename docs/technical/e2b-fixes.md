# E2B 沙箱问题修复方案

## 问题诊断

### 问题1: E2B模板不存在
**错误**: `404: template 'python3-matplotlib-custom' not found`

**原因**: E2B模板名称配置错误或模板未创建

**影响**: 所有AI创作请求失败

### 问题2: 类型错误（已部分修复但仍有风险）
**错误**:
```
result.stderr.trim is not a function
stdout.match is not a function
```

**原因**: 虽然代码中已有类型检查，但在某些边界情况下仍可能出现未定义的字段

**影响**: 验证流程崩溃

---

## 修复方案

### 修复1: E2B模板配置

#### 选项A: 使用默认模板（推荐）
不指定自定义模板，使用E2B官方的Python模板

#### 选项B: 创建自定义模板
如果需要自定义依赖，需要在E2B Dashboard创建模板

**当前配置位置**:
- `.env.local` - E2B_TEMPLATE环境变量
- `src/lib/ai-creator/e2b-sandbox.ts` - DEFAULT_TEMPLATE常量

---

### 修复2: 增强类型安全

虽然 validators.ts 已经做了类型检查，但为了保险起见，应该在所有可能的代码路径都确保字段存在。

---

## 立即执行的修复

### 步骤1: 移除E2B自定义模板配置

**修改文件**: `src/lib/ai-creator/e2b-sandbox.ts`

**当前代码** (第 135-136 行附近):
```typescript
const DEFAULT_TEMPLATE = process.env.E2B_TEMPLATE || 'python3-matplotlib-custom';
```

**修改为**:
```typescript
// 使用E2B官方Python模板（不指定template则使用默认）
const DEFAULT_TEMPLATE = process.env.E2B_TEMPLATE || undefined;
```

或者完全移除template参数：
```typescript
// 不使用自定义模板
const DEFAULT_TEMPLATE = undefined;
```

---

### 步骤2: 确保E2B沙箱创建时不传入无效模板

**修改文件**: `src/lib/ai-creator/e2b-sandbox.ts`

**找到创建沙箱的代码** (约第 215 行):
```typescript
const sandbox = await Sandbox.create({
  template: DEFAULT_TEMPLATE,  // 移除或改为undefined
  timeoutMs: E2B_TIMEOUT_MS,
  // ...
});
```

**修改为**:
```typescript
const sandbox = await Sandbox.create({
  // 移除 template 参数，使用默认Python环境
  timeoutMs: E2B_TIMEOUT_MS,
  // ...
});
```

---

### 步骤3: 更新 .env.local（可选）

**移除或注释掉**:
```bash
# E2B_TEMPLATE=python3-matplotlib-custom
```

---

## 验证修复

修复后，测试用例应该能够：
1. ✅ 成功创建E2B沙箱
2. ✅ 执行Python代码
3. ✅ 返回图像base64数据

---

## 如果仍然失败

如果使用默认模板后仍然失败，可能是E2B账户配置问题：

1. **检查E2B API Key**: 确认 `.env.local` 中的 `E2B_API_KEY` 有效
2. **检查E2B配额**: 登录 https://e2b.dev 查看剩余配额
3. **使用替代方案**: 临时禁用E2B，使用本地Python执行（需要安装matplotlib）

---

## 长期优化

### 建议1: 创建正确的自定义模板

如果需要自定义依赖（如特定版本的matplotlib），应该：

1. 登录 E2B Dashboard
2. 创建新模板
3. 安装依赖：
   ```bash
   pip install matplotlib numpy
   ```
4. 保存模板并获取模板ID
5. 更新 `.env.local`:
   ```bash
   E2B_TEMPLATE=<your-template-id>
   ```

### 建议2: 添加E2B健康检查

在应用启动时检查E2B连接：

```typescript
// src/instrumentation.ts 或类似文件
export async function checkE2BHealth() {
  try {
    const sandbox = await Sandbox.create({ timeoutMs: 10000 });
    await sandbox.close();
    console.log('✅ E2B 连接正常');
    return true;
  } catch (error) {
    console.error('❌ E2B 连接失败:', error);
    return false;
  }
}
```

---

## 总结

**最快的修复方法**：
1. 移除 `template` 参数配置
2. 使用E2B默认Python环境
3. 重启开发服务器
4. 重新测试

**预期结果**：
- ✅ E2B沙箱创建成功
- ✅ Python代码执行成功
- ✅ 图像生成成功
