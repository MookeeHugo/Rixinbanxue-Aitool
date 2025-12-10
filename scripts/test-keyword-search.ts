/**
 * 测试关键词搜索功能
 *
 * 验证爬虫能够根据关键词正确搜索
 */

import { PlaywrightCrawler } from '../src/lib/xiaohongshu-crawler/playwright-client';
import type { CrawlConfig } from '../src/lib/xiaohongshu-crawler/types';

async function testKeywordSearch() {
  console.log('======================================');
  console.log('🔍 测试关键词搜索功能');
  console.log('======================================\n');

  const crawler = new PlaywrightCrawler();

  try {
    // 初始化浏览器
    console.log('[测试] 初始化浏览器...');
    await crawler.init({
      useProxy: false,
      headless: false,
    });
    console.log('[测试] ✓ 浏览器初始化完成\n');

    // 测试关键词: "初中数学"
    const config: CrawlConfig = {
      keyword: '初中数学',
      minLikes: 0,
      maxResults: 3,
      useProxy: false,
    };

    console.log(`[测试] 搜索关键词: "${config.keyword}"`);
    console.log(`[测试] 目标数量: ${config.maxResults}个帖子\n`);

    // 执行爬取
    const result = await crawler.searchAndCrawl(config);

    // 验证结果
    console.log('\n======================================');
    console.log('📊 搜索结果');
    console.log('======================================');
    console.log(`成功状态: ${result.success ? '✓ 成功' : '✗ 失败'}`);
    console.log(`帖子数量: ${result.posts.length}`);
    console.log(`总耗时: ${result.metadata.duration ? (result.metadata.duration / 1000).toFixed(2) : 'N/A'}秒`);

    if (result.posts.length > 0) {
      console.log('\n✅ 关键词搜索功能正常！');
      console.log('\n帖子标题：');
      result.posts.forEach((post, i) => {
        console.log(`${i + 1}. ${post.title}`);
      });

      // 验证帖子是否与关键词相关
      console.log('\n🔍 相关性检查：');
      let relevantCount = 0;
      result.posts.forEach((post, i) => {
        const isRelevant =
          post.title.includes('数学') ||
          post.content.includes('数学') ||
          post.tags.some(tag => tag.includes('数学'));

        if (isRelevant) {
          console.log(`✓ 帖子${i + 1}: 与"初中数学"相关`);
          relevantCount++;
        } else {
          console.log(`⚠️  帖子${i + 1}: 可能不相关`);
        }
      });

      console.log(`\n相关度: ${relevantCount}/${result.posts.length} (${(relevantCount / result.posts.length * 100).toFixed(0)}%)`);
    } else {
      console.log('\n❌ 未爬取到任何帖子');
      console.log('可能原因：');
      console.log('1. Cookies可能过期');
      console.log('2. 网络问题');
      console.log('3. 小红书页面结构变化');
      console.log('4. 关键词无搜索结果');
    }

    // 关闭浏览器
    await crawler.close();

    console.log('\n======================================');
    console.log('✅ 测试完成');
    console.log('======================================');

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    await crawler.close();
    process.exit(1);
  }
}

testKeywordSearch().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
