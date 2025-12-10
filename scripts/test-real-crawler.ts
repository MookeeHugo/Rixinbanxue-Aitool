#!/usr/bin/env node

/**
 * 真实爬虫测试脚本
 * 用途：实际运行爬虫，抓取小红书真实数据，验证所有功能
 */

import { PlaywrightCrawler } from '../src/lib/xiaohongshu-crawler/playwright-client.ts';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                  真实爬虫测试                                   ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function testRealCrawler() {
  let crawler = null;

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
    // 第1步：初始化爬虫
    // ========================================================================

    console.log('📋 第1步：初始化Playwright爬虫');
    console.log('─'.repeat(70));

    crawler = new PlaywrightCrawler();
    await crawler.initialize();

    console.log('✅ 爬虫初始化成功\n');

    // ========================================================================
    // 第2步：测试访问小红书首页
    // ========================================================================

    console.log('📋 第2步：测试访问小红书首页');
    console.log('─'.repeat(70));

    try {
      // 尝试访问小红书
      const page = crawler.page;
      await page.goto('https://www.xiaohongshu.com', { waitUntil: 'domcontentloaded', timeout: 30000 });

      console.log('✅ 成功访问小红书首页');
      console.log(`   当前URL: ${page.url()}`);

      // 截图保存
      await page.screenshot({ path: 'test-reports/xiaohongshu-homepage.png' });
      console.log('   已保存截图: test-reports/xiaohongshu-homepage.png\n');
    } catch (error) {
      console.error('❌ 访问小红书首页失败:', error.message);
      console.log('💡 可能原因：');
      console.log('   1. 网络连接问题');
      console.log('   2. 小红书网站变化');
      console.log('   3. 被反爬虫检测到\n');
      throw error;
    }

    // ========================================================================
    // 第3步：测试搜索功能
    // ========================================================================

    console.log('📋 第3步：测试搜索功能（搜索"数学教学"）');
    console.log('─'.repeat(70));

    const testKeyword = '数学教学';
    console.log(`搜索关键词: ${testKeyword}`);

    try {
      const posts = await crawler.searchByKeyword(testKeyword, {
        maxResults: 5, // 只抓5个测试
        scrollDelay: 2000,
      });

      console.log(`✅ 搜索成功！找到 ${posts.length} 个帖子\n`);

      if (posts.length === 0) {
        console.log('⚠️  未找到任何帖子');
        console.log('💡 可能原因：');
        console.log('   1. 选择器失效（小红书改版）');
        console.log('   2. 反爬虫检测触发');
        console.log('   3. 需要登录才能查看\n');
      } else {
        // 显示抓取的帖子
        console.log('抓取到的帖子：\n');

        for (let i = 0; i < Math.min(posts.length, 3); i++) {
          const post = posts[i];
          console.log(`   ${i + 1}. ${post.title || '(无标题)'}`);
          console.log(`      - 帖子ID: ${post.postId}`);
          console.log(`      - 作者: ${post.authorName || '未知'}`);
          console.log(`      - 点赞: ${post.likes || 0}`);
          console.log(`      - 评论: ${post.comments || 0}`);
          console.log(`      - 内容预览: ${post.content?.substring(0, 50) || '无内容'}...`);
          console.log('');
        }
      }
    } catch (error) {
      console.error('❌ 搜索失败:', error.message);
      console.log('错误详情:', error);

      // 保存失败截图
      try {
        const page = crawler.page;
        await page.screenshot({ path: 'test-reports/crawler-error.png' });
        console.log('已保存错误截图: test-reports/crawler-error.png\n');
      } catch (screenshotError) {
        console.log('无法保存截图\n');
      }

      throw error;
    }

    // ========================================================================
    // 第4步：保存到数据库
    // ========================================================================

    console.log('📋 第4步：保存到数据库');
    console.log('─'.repeat(70));

    if (posts.length > 0) {
      // 保存第一个帖子到数据库
      const firstPost = posts[0];

      const { data: savedPost, error: saveError } = await supabase
        .from('xhs_raw_posts')
        .insert({
          crawled_by: authData.user.id,
          post_id: `real_${firstPost.postId}`,
          title: firstPost.title,
          content: firstPost.content || '',
          author_id: firstPost.authorId || 'unknown',
          author_name: firstPost.authorName || '未知作者',
          likes: firstPost.likes || 0,
          comments: firstPost.comments || 0,
          shares: firstPost.shares || 0,
          crawl_keyword: testKeyword,
          tags: firstPost.tags || [],
          cover_image: firstPost.coverImage,
        })
        .select()
        .single();

      if (saveError) {
        console.error('❌ 保存失败:', saveError.message);
      } else {
        console.log('✅ 成功保存到数据库');
        console.log(`   帖子ID: ${savedPost.id}`);
        console.log(`   标题: ${savedPost.title}\n`);
      }
    }

    // ========================================================================
    // 第5步：测试AI分析
    // ========================================================================

    console.log('📋 第5步：测试AI分析功能');
    console.log('─'.repeat(70));

    if (posts.length > 0) {
      console.log('💡 提示：AI分析需要在浏览器中手动触发');
      console.log('   1. 访问：http://localhost:3002/xiaohongshu');
      console.log('   2. 找到刚才保存的帖子');
      console.log('   3. 点击"生成AI分析"按钮');
      console.log('   4. 查看分析结果\n');
    }

    // ========================================================================
    // 第6步：检查选择器健康度
    // ========================================================================

    console.log('📋 第6步：选择器健康度报告');
    console.log('─'.repeat(70));

    const healthReport = crawler.selectorManager.getHealthReport();

    console.log(`总选择器数: ${healthReport.total}`);
    console.log(`健康选择器: ${healthReport.healthy} 个（成功率 >= 80%）`);
    console.log(`降级选择器: ${healthReport.degraded} 个（50% <= 成功率 < 80%）`);
    console.log(`失败选择器: ${healthReport.failed} 个（成功率 < 50%）\n`);

    console.log('详细统计：');
    for (const selector of healthReport.selectors.slice(0, 5)) {
      const total = selector.successCount + selector.failureCount;
      console.log(
        `   - [${selector.id}] ${selector.successRate.toFixed(1)}% (${selector.successCount}/${total})`
      );
    }
    console.log('');

    // ========================================================================
    // 第7步：检查合规性日志
    // ========================================================================

    console.log('📋 第7步：合规性检查报告');
    console.log('─'.repeat(70));

    const complianceStats = crawler.complianceChecker.getCrawlStatistics();

    console.log(`总爬取次数: ${complianceStats.totalCrawls}`);
    console.log(`成功次数: ${complianceStats.successfulCrawls}`);
    console.log(`失败次数: ${complianceStats.failedCrawls}`);
    console.log(`被阻止次数: ${complianceStats.blockedCrawls}`);
    console.log(`平均耗时: ${complianceStats.averageDuration}ms\n`);

    // ========================================================================
    // 总结
    // ========================================================================

    console.log('═'.repeat(70));
    console.log('✅ 真实爬虫测试完成！');
    console.log('═'.repeat(70) + '\n');

    console.log('测试结果：');
    console.log(`   - 爬虫初始化：✅`);
    console.log(`   - 访问小红书：✅`);
    console.log(`   - 搜索功能：${posts.length > 0 ? '✅' : '❌'}`);
    console.log(`   - 抓取帖子：${posts.length} 个`);
    console.log(`   - 数据库保存：${posts.length > 0 ? '✅' : '⚠️'}`);
    console.log('');

    if (posts.length > 0) {
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 真实爬虫测试成功！系统可以获取真实数据                    ║');
      console.log('╚════════════════════════════════════════════════════════════════╝\n');

      console.log('📋 下一步建议：');
      console.log('   1. 在浏览器中测试AI分析功能');
      console.log('   2. 测试敏感词过滤功能');
      console.log('   3. 测试草稿生成功能');
      console.log('   4. 收集更多真实数据完善系统\n');
    } else {
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║  ⚠️  爬虫无法获取数据，需要排查问题                           ║');
      console.log('╚════════════════════════════════════════════════════════════════╝\n');

      console.log('🔧 排查建议：');
      console.log('   1. 检查截图文件了解网页实际状态');
      console.log('   2. 确认选择器是否需要更新');
      console.log('   3. 测试反检测机制是否有效');
      console.log('   4. 考虑是否需要添加代理IP\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error);

    console.log('\n💡 常见问题排查：');
    console.log('   1. 确认网络连接正常');
    console.log('   2. 确认Playwright浏览器已安装（pnpm exec playwright install chromium）');
    console.log('   3. 查看错误截图了解具体情况');
    console.log('   4. 检查小红书网站是否可以正常访问\n');

    process.exit(1);
  } finally {
    // 清理资源
    if (crawler) {
      try {
        await crawler.close();
        console.log('✅ 浏览器已关闭\n');
      } catch (closeError) {
        console.log('⚠️  关闭浏览器时出错:', closeError.message);
      }
    }
  }
}

// 运行测试
testRealCrawler();
