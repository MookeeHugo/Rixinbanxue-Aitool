/**
 * 测试增强版爬虫
 *
 * 使用从搜索页面直接点击的策略
 */

import { chromium } from 'playwright';
import { injectAntiDetection } from '../src/lib/xiaohongshu-crawler/anti-detection';
import { crawlFromSearchPage } from '../src/lib/xiaohongshu-crawler/enhanced-crawler';
import * as fs from 'fs';
import * as path from 'path';

async function testEnhancedCrawler() {
  console.log('======================================');
  console.log('🚀 测试增强版爬虫');
  console.log('======================================\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await injectAntiDetection(page);

  try {
    // 加载cookies
    const cookiesPath = path.resolve(process.cwd(), 'test-reports/xiaohongshu-cookies.json');
    if (fs.existsSync(cookiesPath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
      await context.addCookies(cookies);
      console.log(`✓ 已加载 ${cookies.length} 个cookies\n`);
    }

    // 测试参数
    const keyword = '初中数学';
    const maxResults = 3;
    const minLikes = 0;

    console.log(`关键词: "${keyword}"`);
    console.log(`目标数量: ${maxResults}个帖子`);
    console.log(`最低点赞: ${minLikes}\n`);

    const startTime = Date.now();

    // 执行爬取
    const posts = await crawlFromSearchPage(
      context,
      page,
      keyword,
      maxResults,
      minLikes
    );

    const duration = Date.now() - startTime;

    // 显示结果
    console.log('\n======================================');
    console.log('📊 爬取结果');
    console.log('======================================');
    console.log(`成功爬取: ${posts.length} 个帖子`);
    console.log(`总耗时: ${(duration / 1000).toFixed(2)}秒`);

    if (posts.length > 0) {
      console.log('\n✅ 爬取成功！\n');

      posts.forEach((post, i) => {
        console.log(`--- 帖子 ${i + 1} ---`);
        console.log(`标题: ${post.title}`);
        console.log(`作者: ${post.author_name}`);
        console.log(`点赞: ${post.likes}, 收藏: ${post.collects}, 评论: ${post.comments}`);
        console.log(`图片: ${post.images.length}张`);
        console.log(`标签: ${post.tags.slice(0, 3).join(', ')}${post.tags.length > 3 ? '...' : ''}`);
        console.log();
      });

      // 检查相关性
      let relevantCount = 0;
      posts.forEach(post => {
        const isRelevant =
          post.title.includes('数学') ||
          post.content.includes('数学') ||
          post.tags.some(tag => tag.includes('数学'));
        if (isRelevant) relevantCount++;
      });

      console.log(`相关度: ${relevantCount}/${posts.length} (${(relevantCount / posts.length * 100).toFixed(0)}%)`);

      // 保存结果
      const resultPath = 'test-reports/enhanced-crawler-result.json';
      fs.writeFileSync(resultPath, JSON.stringify(posts, null, 2), 'utf-8');
      console.log(`\n✓ 结果已保存: ${resultPath}`);

    } else {
      console.log('\n❌ 未爬取到任何帖子');
      console.log('请检查：');
      console.log('1. Cookies是否有效');
      console.log('2. 是否被小红书检测到');
      console.log('3. 关键词是否有结果');
    }

    console.log('\n======================================');
    console.log('✅ 测试完成');
    console.log('======================================');

    await browser.close();

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    await browser.close();
    process.exit(1);
  }
}

testEnhancedCrawler().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
