#!/usr/bin/env node

/**
 * 敏感词过滤功能 - 即时测试脚本
 * 测试时间：2025-12-10
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// 配置
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║          敏感词过滤功能 - 即时测试                               ║');
console.log('║          测试时间：' + new Date().toLocaleString('zh-CN').padEnd(40) + '║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// 测试步骤
// ============================================================================

async function runTest() {
  try {
    console.log('📋 第一步：验证数据库连接和表结构\n');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 登录测试用户
    console.log('🔐 正在登录测试用户...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'teacher@test.com',
      password: 'test123456',
    });

    if (authError) {
      console.error('❌ 登录失败:', authError.message);
      console.log('\n💡 提示：请确保测试用户已创建（teacher@test.com / test123456）');
      process.exit(1);
    }

    console.log('✅ 登录成功！用户ID:', authData.user.id);

    // 验证新字段是否存在
    console.log('\n📊 正在检查表结构...');
    const { data: testQuery, error: testError } = await supabase
      .from('xhs_ai_drafts')
      .select('id, sensitive_words_detected, auto_replaced, risk_level')
      .limit(1);

    if (testError) {
      console.error('❌ 查询失败:', testError.message);
      console.log('\n💡 提示：可能是迁移未应用，请运行: npx supabase migration up');
      process.exit(1);
    }

    console.log('✅ 表结构验证通过！新字段已创建：');
    console.log('   - sensitive_words_detected (JSONB)');
    console.log('   - auto_replaced (BOOLEAN)');
    console.log('   - risk_level (TEXT)');

    // ========================================================================
    // 测试用例1: 创建包含广告词的测试帖子
    // ========================================================================

    console.log('\n' + '='.repeat(70));
    console.log('📝 测试用例1：广告营销词（应自动替换）');
    console.log('='.repeat(70) + '\n');

    const testPostId = 'test_ad_' + Date.now();

    console.log('正在创建测试帖子...');
    const { data: post, error: postError } = await supabase
      .from('xhs_raw_posts')
      .insert({
        crawled_by: authData.user.id,
        author_id: 'test_author_001',
        author_name: '数学老师小王',
        post_id: testPostId,
        title: '数学学习资料分享',
        content: '大家好！我整理了完整的数学资料。需要的可以加微信领取，也可以私信我。购买后永久使用！',
        tags: ['数学', '学习资料'],
        likes: 5000,
        comments: 200,
        shares: 100,
        crawl_keyword: '数学教学',
        ai_analysis: {
          title_strategy: '实用干货',
          content_structure: '分步讲解',
          engagement_drivers: ['实用性强', '步骤清晰', '免费资源'],
          target_audience: '初中生',
          emotional_appeal: '学习焦虑',
          call_to_action: '关注收藏'
        }
      })
      .select()
      .single();

    if (postError) {
      console.error('❌ 创建帖子失败:', postError.message);
      process.exit(1);
    }

    console.log('✅ 测试帖子已创建！');
    console.log('   帖子ID:', post.id);
    console.log('   标题:', post.title);
    console.log('   原始内容包含敏感词:');
    console.log('   - "加微信" → 应替换为 "留言咨询"');
    console.log('   - "私信" → 应替换为 "评论区交流"');
    console.log('   - "购买" → 应替换为 "了解"');

    console.log('\n📊 测试结果预测：');
    console.log('   风险等级: ⚡ medium（中风险）');
    console.log('   自动替换: 🔄 是（3处）');
    console.log('   最终状态: draft（可发布）');

    // ========================================================================
    // 测试用例2: 创建高风险测试帖子
    // ========================================================================

    console.log('\n' + '='.repeat(70));
    console.log('📝 测试用例2：高风险敏感词（应被拒绝）');
    console.log('='.repeat(70) + '\n');

    const testPostId2 = 'test_high_' + Date.now();

    console.log('正在创建高风险测试帖子...');
    const { data: post2, error: postError2 } = await supabase
      .from('xhs_raw_posts')
      .insert({
        crawled_by: authData.user.id,
        author_id: 'test_author_002',
        author_name: '测试作者',
        post_id: testPostId2,
        title: '特殊话题讨论',
        content: '今天讨论一些政治相关的观点和看法...',
        tags: ['讨论'],
        likes: 3000,
        comments: 150,
        shares: 50,
        crawl_keyword: '数学教学',
        ai_analysis: {
          title_strategy: '测试',
          content_structure: '测试',
          engagement_drivers: ['测试1', '测试2', '测试3'],
          target_audience: '测试',
          emotional_appeal: '测试',
          call_to_action: '测试'
        }
      })
      .select()
      .single();

    if (postError2) {
      console.error('❌ 创建高风险帖子失败:', postError2.message);
    } else {
      console.log('✅ 高风险测试帖子已创建！');
      console.log('   帖子ID:', post2.id);
      console.log('   包含敏感词: "政治"');

      console.log('\n📊 测试结果预测：');
      console.log('   风险等级: ⚠️ high（高风险）');
      console.log('   自动替换: ✗ 否（高风险不替换）');
      console.log('   最终状态: rejected（拒绝）');
    }

    // ========================================================================
    // 生成草稿提示
    // ========================================================================

    console.log('\n' + '='.repeat(70));
    console.log('🎯 下一步操作指南');
    console.log('='.repeat(70) + '\n');

    console.log('测试数据已准备完成！现在请按以下步骤手动测试：\n');

    console.log('1️⃣  访问小红书页面：');
    console.log('   http://localhost:3002/xiaohongshu\n');

    console.log('2️⃣  找到测试帖子并生成草稿：');
    console.log('   - 标题：数学学习资料分享');
    console.log('   - 标题：特殊话题讨论\n');

    console.log('3️⃣  点击"生成草稿"按钮\n');

    console.log('4️⃣  切换到"草稿列表"标签，观察：');
    console.log('   ✅ 风险等级Badge（⚡ 中风险 / ⚠️ 高风险）');
    console.log('   ✅ 自动替换标记（🔄 已自动替换）');
    console.log('   ✅ 敏感词检测详情面板');
    console.log('   ✅ 替换详情（展开查看）\n');

    console.log('5️⃣  验证数据库（Supabase Studio）：');
    console.log('   访问：http://localhost:54323');
    console.log('   执行SQL：\n');
    console.log('   SELECT');
    console.log('     generated_title,');
    console.log('     risk_level,');
    console.log('     auto_replaced,');
    console.log('     status,');
    console.log('     sensitive_words_detected');
    console.log('   FROM xhs_ai_drafts');
    console.log('   WHERE created_at > NOW() - INTERVAL \'5 minutes\'');
    console.log('   ORDER BY created_at DESC;\n');

    console.log('6️⃣  检查控制台日志（F12）：');
    console.log('   应显示：');
    console.log('   [XHS生成] 敏感词检测: 检测到 X 个敏感词 (风险等级: medium/high)');
    console.log('   [XHS生成] 执行自动替换...');
    console.log('   [XHS生成] 自动替换完成，共替换 X 处\n');

    // ========================================================================
    // 自动化验证（如果开发服务器在运行）
    // ========================================================================

    console.log('\n' + '='.repeat(70));
    console.log('🤖 尝试自动调用API进行测试');
    console.log('='.repeat(70) + '\n');

    console.log('⚠️  注意：此步骤需要开发服务器正在运行（pnpm dev）\n');

    try {
      console.log('正在测试API连接...');
      const apiResponse = await fetch('http://localhost:3002/api/health', {
        method: 'GET',
      });

      if (apiResponse.ok) {
        console.log('✅ 开发服务器正在运行！');
        console.log('\n💡 提示：可以直接在浏览器中测试，或等待自动化测试脚本完成');
      } else {
        console.log('⚠️  开发服务器可能未启动');
        console.log('   请运行：pnpm dev');
      }
    } catch (error) {
      console.log('⚠️  无法连接到开发服务器');
      console.log('   请在新终端窗口运行：pnpm dev');
      console.log('   然后按照上述步骤手动测试');
    }

    // ========================================================================
    // 测试总结
    // ========================================================================

    console.log('\n' + '='.repeat(70));
    console.log('📊 测试数据汇总');
    console.log('='.repeat(70) + '\n');

    console.log('已创建测试帖子数：2 个\n');

    console.log('测试用例1（广告词）：');
    console.log('  - 帖子ID: ' + post.id);
    console.log('  - 预期风险: ⚡ medium');
    console.log('  - 预期替换: ✅ 是（3处）\n');

    if (post2) {
      console.log('测试用例2（高风险）：');
      console.log('  - 帖子ID: ' + post2.id);
      console.log('  - 预期风险: ⚠️ high');
      console.log('  - 预期替换: ✗ 否\n');
    }

    console.log('测试完成后，可以执行以下SQL清理测试数据：\n');
    console.log('DELETE FROM xhs_ai_drafts WHERE created_at > NOW() - INTERVAL \'10 minutes\';');
    console.log('DELETE FROM xhs_raw_posts WHERE post_id LIKE \'test_%\';\n');

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ 测试准备完成！请按照上述步骤在浏览器中验证功能           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 运行测试
runTest();
