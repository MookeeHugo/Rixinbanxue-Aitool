#!/usr/bin/env node

/**
 * 清理测试数据
 * 用途：删除测试帖子和最近生成的测试草稿
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                     清理测试数据                               ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function cleanup() {
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
    // 1. 清理最近10分钟的测试草稿
    // ========================================================================

    console.log('📋 步骤1：清理最近10分钟的测试草稿');
    console.log('─'.repeat(70));

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // 先查询要删除的草稿
    const { data: draftsToDelete, error: draftsQueryError } = await supabase
      .from('xhs_ai_drafts')
      .select('id, generated_title, created_at')
      .gte('created_at', tenMinutesAgo);

    if (draftsQueryError) {
      console.error('❌ 查询草稿失败:', draftsQueryError.message);
    } else if (draftsToDelete && draftsToDelete.length > 0) {
      console.log(`找到 ${draftsToDelete.length} 个最近的草稿：\n`);

      for (const draft of draftsToDelete) {
        console.log(`   📄 ${draft.generated_title || '(无标题)'}`);
        console.log(`      - ID: ${draft.id}`);
        console.log(`      - 创建时间: ${draft.created_at}`);
      }

      console.log('');

      // 删除草稿
      const { error: deleteDraftsError } = await supabase
        .from('xhs_ai_drafts')
        .delete()
        .gte('created_at', tenMinutesAgo);

      if (deleteDraftsError) {
        console.error('❌ 删除草稿失败:', deleteDraftsError.message);
      } else {
        console.log(`✅ 成功删除 ${draftsToDelete.length} 个草稿\n`);
      }
    } else {
      console.log('ℹ️  未找到最近10分钟的草稿\n');
    }

    // ========================================================================
    // 2. 清理测试帖子
    // ========================================================================

    console.log('📋 步骤2：清理测试帖子');
    console.log('─'.repeat(70));

    // 先查询要删除的测试帖子
    const { data: postsToDelete, error: postsQueryError } = await supabase
      .from('xhs_raw_posts')
      .select('id, post_id, title')
      .like('post_id', 'test_%');

    if (postsQueryError) {
      console.error('❌ 查询测试帖子失败:', postsQueryError.message);
    } else if (postsToDelete && postsToDelete.length > 0) {
      console.log(`找到 ${postsToDelete.length} 个测试帖子：\n`);

      for (const post of postsToDelete) {
        console.log(`   📝 ${post.title}`);
        console.log(`      - ID: ${post.id}`);
        console.log(`      - 帖子ID: ${post.post_id}`);
      }

      console.log('');

      // 删除测试帖子
      const { error: deletePostsError } = await supabase
        .from('xhs_raw_posts')
        .delete()
        .like('post_id', 'test_%');

      if (deletePostsError) {
        console.error('❌ 删除测试帖子失败:', deletePostsError.message);
      } else {
        console.log(`✅ 成功删除 ${postsToDelete.length} 个测试帖子\n`);
      }
    } else {
      console.log('ℹ️  未找到测试帖子\n');
    }

    // ========================================================================
    // 总结
    // ========================================================================

    console.log('═'.repeat(70));
    console.log('✅ 清理完成！');
    console.log('═'.repeat(70) + '\n');

    console.log('清理结果：');
    console.log(
      `   - 草稿：${draftsToDelete?.length || 0} 个`
    );
    console.log(
      `   - 测试帖子：${postsToDelete?.length || 0} 个`
    );
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  🎉 测试数据已清理完成！数据库已恢复到干净状态                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 清理失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 运行清理
cleanup();
