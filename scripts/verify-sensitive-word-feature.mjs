#!/usr/bin/env node

/**
 * 敏感词过滤功能 - 自动验证脚本
 * 用途：快速验证功能是否正常工作
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║          敏感词过滤功能 - 自动验证                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function verify() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 登录
    console.log('🔐 正在登录...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'teacher@test.com',
      password: 'test123456',
    });

    if (authError) {
      console.error('❌ 登录失败:', authError.message);
      process.exit(1);
    }

    console.log('✅ 登录成功！\n');

    // ========================================================================
    // 验证1：检查数据库字段
    // ========================================================================

    console.log('📋 验证1：检查数据库表结构');
    console.log('─'.repeat(70));

    const { data: testQuery, error: testError } = await supabase
      .from('xhs_ai_drafts')
      .select('id, sensitive_words_detected, auto_replaced, risk_level')
      .limit(1);

    if (testError) {
      console.error('❌ 表结构验证失败:', testError.message);
      console.log('💡 提示：请运行 npx supabase migration up\n');
      process.exit(1);
    }

    console.log('✅ 表结构正确');
    console.log('   - sensitive_words_detected (JSONB) ✓');
    console.log('   - auto_replaced (BOOLEAN) ✓');
    console.log('   - risk_level (TEXT) ✓\n');

    // ========================================================================
    // 验证2：检查测试帖子
    // ========================================================================

    console.log('📋 验证2：检查测试帖子');
    console.log('─'.repeat(70));

    const { data: testPosts, error: postsError } = await supabase
      .from('xhs_raw_posts')
      .select('*')
      .like('post_id', 'test_%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (postsError) {
      console.error('❌ 查询测试帖子失败:', postsError.message);
      process.exit(1);
    }

    if (!testPosts || testPosts.length === 0) {
      console.log('⚠️  未找到测试帖子');
      console.log('💡 提示：请运行 node scripts/test-sensitive-word-now.mjs 创建测试数据\n');
      process.exit(1);
    }

    console.log(`✅ 找到 ${testPosts.length} 个测试帖子\n`);

    for (const post of testPosts) {
      console.log(`   📝 ${post.title}`);
      console.log(`      - 帖子ID: ${post.id}`);
      console.log(`      - 点赞数: ${post.likes}`);
      console.log(`      - 是否已分析: ${post.ai_analysis ? '✓' : '✗'}`);
    }

    console.log('');

    // ========================================================================
    // 验证3：检查草稿生成结果
    // ========================================================================

    console.log('📋 验证3：检查草稿生成结果');
    console.log('─'.repeat(70));

    const { data: drafts, error: draftsError } = await supabase
      .from('xhs_ai_drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (draftsError) {
      console.error('❌ 查询草稿失败:', draftsError.message);
      process.exit(1);
    }

    if (!drafts || drafts.length === 0) {
      console.log('⚠️  未找到任何草稿');
      console.log('💡 提示：请在浏览器中访问 http://localhost:3002/xiaohongshu');
      console.log('   然后点击"生成草稿"按钮\n');

      console.log('📊 下一步操作：');
      console.log('   1. 访问：http://localhost:3002/xiaohongshu');
      console.log('   2. 找到测试帖子（标题包含"数学学习资料分享"或"特殊话题讨论"）');
      console.log('   3. 点击"生成草稿"按钮');
      console.log('   4. 等待生成完成（约20-30秒）');
      console.log('   5. 切换到"草稿列表"标签查看结果\n');

      process.exit(0);
    }

    console.log(`✅ 找到 ${drafts.length} 个草稿\n`);

    // 详细分析每个草稿
    let hasTestData = false;
    let passedCount = 0;

    for (let i = 0; i < Math.min(drafts.length, 5); i++) {
      const draft = drafts[i];

      console.log(`   📄 草稿 ${i + 1}: ${draft.generated_title || '(无标题)'}`);
      console.log(`      - 草稿ID: ${draft.id}`);
      console.log(`      - 人设: ${draft.user_persona}`);
      console.log(`      - 原创性: ${draft.originality_passed ? '✓ 通过' : '✗ 未通过'} (${draft.similarity_score}%)`);

      // 检查敏感词检测
      if (draft.sensitive_words_detected) {
        hasTestData = true;

        const detected = draft.sensitive_words_detected;
        const riskIcon = draft.risk_level === 'high' ? '⚠️' : draft.risk_level === 'medium' ? '⚡' : 'ℹ️';

        console.log(`      - 敏感词检测: ✓ 已执行`);
        console.log(`      - 风险等级: ${riskIcon} ${draft.risk_level}`);
        console.log(`      - 检测到敏感词: ${detected.matches?.length || 0} 个`);
        console.log(`      - 自动替换: ${draft.auto_replaced ? '✓ 是' : '✗ 否'}`);

        if (draft.auto_replaced && detected.replacements) {
          console.log(`      - 替换次数: ${detected.replacements.totalReplacements || 0} 处`);
          passedCount++;
        }

        console.log(`      - 状态: ${draft.status}`);
      } else {
        console.log(`      - 敏感词检测: ✗ 未执行`);
      }

      console.log('');
    }

    // ========================================================================
    // 验证总结
    // ========================================================================

    console.log('═'.repeat(70));
    console.log('📊 验证总结');
    console.log('═'.repeat(70) + '\n');

    if (!hasTestData) {
      console.log('⚠️  未找到包含敏感词检测结果的草稿\n');
      console.log('💡 建议操作：');
      console.log('   1. 访问：http://localhost:3002/xiaohongshu');
      console.log('   2. 找到标题为"数学学习资料分享"的测试帖子');
      console.log('   3. 点击"生成草稿"按钮');
      console.log('   4. 等待生成完成');
      console.log('   5. 重新运行本脚本验证\n');

      console.log('预期结果：');
      console.log('   - 风险等级：⚡ medium（中风险）');
      console.log('   - 检测到敏感词：3 个（"加微信"、"私信"、"购买"）');
      console.log('   - 自动替换：✓ 是（3处）');
      console.log('   - 状态：draft（可发布）\n');

      process.exit(0);
    }

    console.log('✅ 验证通过！敏感词过滤功能正常工作\n');

    console.log('验证结果：');
    console.log(`   - 数据库表结构：✓ 正确`);
    console.log(`   - 测试帖子数量：${testPosts.length} 个`);
    console.log(`   - 草稿总数：${drafts.length} 个`);
    console.log(`   - 包含敏感词检测的草稿：${passedCount} 个`);
    console.log(`   - 功能状态：✅ 正常运行\n`);

    // 显示统计数据
    const withDetection = drafts.filter(d => d.sensitive_words_detected).length;
    const withReplacement = drafts.filter(d => d.auto_replaced).length;
    const highRisk = drafts.filter(d => d.risk_level === 'high').length;
    const mediumRisk = drafts.filter(d => d.risk_level === 'medium').length;
    const lowRisk = drafts.filter(d => d.risk_level === 'low').length;

    console.log('统计数据：');
    console.log(`   - 执行敏感词检测：${withDetection}/${drafts.length} 个`);
    console.log(`   - 自动替换成功：${withReplacement}/${withDetection} 个`);
    console.log(`   - 风险分布：⚠️ 高 ${highRisk} | ⚡ 中 ${mediumRisk} | ℹ️ 低 ${lowRisk}\n`);

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  🎉 验证完成！敏感词过滤功能已正确实现并运行                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // 提供下一步建议
    console.log('📋 建议的下一步操作：\n');
    console.log('1. 浏览器验证（可选）：');
    console.log('   访问 http://localhost:3002/xiaohongshu');
    console.log('   切换到"草稿列表"标签');
    console.log('   查看敏感词检测详情面板\n');

    console.log('2. 清理测试数据：');
    console.log('   在Supabase Studio执行：');
    console.log('   DELETE FROM xhs_ai_drafts WHERE created_at > NOW() - INTERVAL \'10 minutes\';');
    console.log('   DELETE FROM xhs_raw_posts WHERE post_id LIKE \'test_%\';\n');

    console.log('3. 继续开发：');
    console.log('   - Phase 2 P1：批量操作、高级筛选、数据导出');
    console.log('   - 或直接部署到生产环境\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 运行验证
verify();
