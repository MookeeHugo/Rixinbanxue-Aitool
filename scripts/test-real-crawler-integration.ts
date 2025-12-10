/**
 * 真实爬虫集成测试
 *
 * 测试内容：
 * 1. PlaywrightCrawler真实爬虫模式
 * 2. Cookie加载
 * 3. 批量爬取功能
 * 4. 新字段验证（collects, publish_time）
 */

import { PlaywrightCrawler } from '../src/lib/xiaohongshu-crawler/playwright-client';
import type { CrawlConfig } from '../src/lib/xiaohongshu-crawler/types';

async function testRealCrawler() {
  console.log('======================================');
  console.log('🧪 开始真实爬虫集成测试');
  console.log('======================================\n');

  const crawler = new PlaywrightCrawler();

  try {
    // 1. 初始化浏览器
    console.log('[测试] 步骤1: 初始化浏览器...');
    await crawler.init({
      useProxy: false,
      headless: false, // 使用有头模式便于观察
    });
    console.log('[测试] ✓ 浏览器初始化完成\n');

    // 2. 配置爬取参数
    const config: CrawlConfig = {
      keyword: '数学学习',
      minLikes: 0,
      maxResults: 3, // 测试爬取3个帖子
      useProxy: false,
    };

    console.log('[测试] 步骤2: 开始爬取...');
    console.log(`[测试] 配置: 关键词="${config.keyword}", 最小点赞=${config.minLikes}, 目标数量=${config.maxResults}\n`);

    // 3. 执行爬取
    const result = await crawler.searchAndCrawl(config);

    // 4. 验证结果
    console.log('\n======================================');
    console.log('📊 爬取结果统计');
    console.log('======================================');
    console.log(`成功状态: ${result.success ? '✓ 成功' : '✗ 失败'}`);
    console.log(`帖子数量: ${result.posts.length}`);
    console.log(`总耗时: ${result.metadata.duration ? (result.metadata.duration / 1000).toFixed(2) : 'N/A'}秒`);
    console.log(`错误数量: ${result.metadata.errors.length}`);

    if (result.error) {
      console.log(`错误信息: ${result.error}`);
    }

    // 5. 详细输出每个帖子
    if (result.posts.length > 0) {
      console.log('\n======================================');
      console.log('📝 帖子详情');
      console.log('======================================\n');

      result.posts.forEach((post, index) => {
        console.log(`\n--- 帖子 ${index + 1} ---`);
        console.log(`ID: ${post.post_id}`);
        console.log(`标题: ${post.title}`);
        console.log(`作者: ${post.author_name}`);
        console.log(`点赞数: ${post.likes}`);
        console.log(`收藏数: ${post.collects || 0} ${post.collects ? '✓ (新字段)' : '✗ (缺失)'}`);
        console.log(`评论数: ${post.comments}`);
        console.log(`分享数: ${post.shares}`);
        console.log(`发布时间: ${post.publish_time || '无'} ${post.publish_time ? '✓ (新字段)' : '✗ (缺失)'}`);
        console.log(`图片数量: ${post.images.length}`);
        console.log(`标签数量: ${post.tags.length}`);
        console.log(`标签: ${post.tags.slice(0, 5).join(', ')}${post.tags.length > 5 ? '...' : ''}`);
        console.log(`内容预览: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`);
      });

      // 6. 验证新字段
      console.log('\n======================================');
      console.log('🔍 新字段验证');
      console.log('======================================');

      const postsWithCollects = result.posts.filter(p => p.collects !== undefined);
      const postsWithPublishTime = result.posts.filter(p => p.publish_time);

      console.log(`✓ collects字段存在: ${postsWithCollects.length}/${result.posts.length} 个帖子`);
      console.log(`✓ publish_time字段存在: ${postsWithPublishTime.length}/${result.posts.length} 个帖子`);

      if (postsWithCollects.length === result.posts.length) {
        console.log('✓ 所有帖子都包含collects字段');
      } else {
        console.log(`⚠️  ${result.posts.length - postsWithCollects.length} 个帖子缺少collects字段`);
      }

      if (postsWithPublishTime.length === result.posts.length) {
        console.log('✓ 所有帖子都包含publish_time字段');
      } else {
        console.log(`⚠️  ${result.posts.length - postsWithPublishTime.length} 个帖子缺少publish_time字段`);
      }
    }

    // 7. 关闭浏览器
    console.log('\n[测试] 步骤3: 关闭浏览器...');
    await crawler.close();
    console.log('[测试] ✓ 浏览器已关闭\n');

    // 8. 测试总结
    console.log('======================================');
    console.log('✅ 测试完成');
    console.log('======================================');

    if (result.success && result.posts.length > 0) {
      console.log('✓ 真实爬虫集成测试通过');
      console.log('✓ 所有功能正常工作');
    } else if (result.success && result.posts.length === 0) {
      console.log('⚠️  爬取成功但未获得帖子');
      console.log('提示: 可能需要检查cookies或选择器');
    } else {
      console.log('✗ 测试失败');
      console.log(`原因: ${result.error || '未知错误'}`);
    }

  } catch (error: any) {
    console.error('\n❌ 测试过程中发生错误:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);

    // 确保关闭浏览器
    try {
      await crawler.close();
    } catch (e) {
      // 忽略关闭错误
    }

    process.exit(1);
  }
}

// 运行测试
testRealCrawler().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
