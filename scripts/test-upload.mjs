/**
 * 自动化测试脚本 - 测试题库图文混排功能
 * 使用方式：node scripts/test-upload.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 测试图片列表
const testImages = [
  '测试试卷1.png',  // 最佳测试用例：5道圆形几何题，每题1图
  '测试试卷2.png',  // 混合：2题有图（多图+函数图），2题无图
  '测试试卷3.png',  // 实际应用：6道仰角题，每题1图
  '测试试卷4.png',  // 复杂几何：6道折叠题，每题1图
  '测试试卷5.png',  // 多样几何：5道求线段题，每题1图
];

console.log('🚀 开始自动化测试\n');
console.log('测试目标：验证双流并行架构修复效果');
console.log('修复内容：Prompt编码 + Qwen兜底 + 调试日志\n');
console.log('═══════════════════════════════════════\n');

// 检查测试图片是否存在
for (const imageName of testImages) {
  const imagePath = path.join(rootDir, imageName);
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ 测试图片不存在: ${imageName}`);
    process.exit(1);
  }
  const stats = fs.statSync(imagePath);
  console.log(`✅ ${imageName} (${(stats.size / 1024).toFixed(1)} KB)`);
}

console.log('\n═══════════════════════════════════════\n');
console.log('📌 测试说明：\n');
console.log('由于上传需要用户身份验证，自动化脚本无法直接调用API。');
console.log('请按照以下步骤手动测试：\n');
console.log('1. 打开浏览器访问：http://localhost:3002');
console.log('2. 登录后进入题库上传页面');
console.log('3. 依次上传以下图片并观察日志：\n');

testImages.forEach((name, index) => {
  console.log(`   ${index + 1}. ${name}`);
});

console.log('\n4. 观察控制台日志，验证以下关键点：\n');
console.log('   ✓ [Qwen] 成功解析题目数量');
console.log('   ✓ [占位符合并] placeholdersCount > 0');
console.log('   ✓ [占位符合并] assetsCount 匹配 placeholdersCount');
console.log('   ✓ 没有 [Qwen兜底] 警告（说明Prompt生效）');
console.log('   ✓ content 中包含 [图片:ID] 而非原始占位符\n');

console.log('5. 访问审核页面，验证：\n');
console.log('   ✓ 图片显示在正确位置（"如图"附近）');
console.log('   ✓ 图片可以点击放大');
console.log('   ✓ 多图题的图片顺序正确\n');

console.log('═══════════════════════════════════════\n');
console.log('💡 快速测试建议：\n');
console.log('先上传 测试试卷1.png，这是最佳测试用例：');
console.log('- 5道题全部有配图（题8-12）');
console.log('- 图片位置清晰（右侧）');
console.log('- 题目都包含"如图"关键词');
console.log('- 适合验证占位符智能插入功能\n');

console.log('如果测试成功，您应该看到：');
console.log('题8的content类似：');
console.log('"如图，AB为⊙O的直径，[图片:ai-question-bank/...] AC，AD为⊙O的弦..."');
console.log('\n而非：');
console.log('"如图，AB为⊙O的直径，<<IMG_8_1>> AC，AD为⊙O的弦..."');
console.log('或末尾追加：');
console.log('"...若AB=10，AC=√10，则AD的长是() [图片:...]"\n');

console.log('═══════════════════════════════════════\n');
console.log('🎯 成功标准（根据实施计划）：\n');
console.log('- Qwen占位符输出率 ≥ 90%');
console.log('- 占位符资源匹配率 ≥ 85%');
console.log('- 端到端成功率 ≥ 90%\n');

console.log('📊 测试完成后，请分享：');
console.log('1. 控制台日志（重点关注占位符合并部分）');
console.log('2. 数据库中某一题的完整记录');
console.log('3. 前端截图（图片显示位置）\n');

console.log('准备就绪！开始测试吧 🚀\n');
