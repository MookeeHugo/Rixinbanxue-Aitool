/**
 * 小红书AI运营系统 - Server Actions
 *
 * 功能：
 * - crawlPosts - 爬取帖子（配额检查 → Playwright爬虫 → 存储 → 扣除配额）
 * - analyzePost - AI分析（Gemini分析爆款因素）
 * - generateDraft - 生成草稿（DeepSeek重写 + 原创性检测）
 * - approveDraft - 批准草稿
 * - getUserQuota - 获取用户配额
 * - getRawPosts - 获取爬取的帖子列表
 * - getDrafts - 获取草稿列表
 */

'use server';

import { createAuthenticatedSupabaseClient } from '@/lib/server/auth';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { PlaywrightCrawler } from '@/lib/xiaohongshu-crawler/playwright-client';
import { GeminiAnalyzer } from '@/lib/xiaohongshu/gemini-analyzer';
import { DeepSeekRewriter } from '@/lib/xiaohongshu/deepseek-rewriter';
import { OriginalityChecker } from '@/lib/xiaohongshu/originality-checker';
import { getPersonaById, getDefaultPersona } from '@/lib/xiaohongshu/persona-presets';
import { sensitiveWordFilter } from '@/lib/xiaohongshu/sensitive-word-filter';
import type { CrawlConfig } from '@/lib/xiaohongshu-crawler/types';
import type { UserPersona } from '@/lib/xiaohongshu/types';

// ============================================================================
// 返回类型
// ============================================================================

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface CrawlResult {
  postsCount: number;
  posts: Array<{
    id: string;
    title: string;
    likes: number;
    comments: number;
  }>;
  metadata: {
    duration: number;
    retryCount: number;
  };
}

export interface UserQuota {
  daily_crawl_limit: number;
  daily_crawl_used: number;
  hourly_crawl_limit: number;
  daily_generation_limit: number;
  daily_generation_used: number;
  remaining_daily: number;
  remaining_hourly: number;
}

// ============================================================================
// 1. 爬取帖子
// ============================================================================

export async function crawlPosts(
  keyword: string,
  minLikes: number = 1000,
  maxResults: number = 5
): Promise<ActionResult<CrawlResult>> {
  let quotaDeducted = false;

  // 🧪 测试模式：返回模拟数据
  const USE_MOCK_DATA = process.env.NEXT_PUBLIC_XHS_MOCK_MODE === 'true';

  try {
    // 1.1 身份验证
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    console.log(`[XHS爬虫] 用户 ${user.id} 请求爬取关键词: ${keyword}`);

    // 1.2 检查配额
    const { data: quotaCheck, error: quotaError } = await supabase.rpc(
      'check_xhs_crawl_quota',
      { p_user_id: user.id }
    );

    if (quotaError || !quotaCheck || quotaCheck.length === 0) {
      console.error('[XHS爬虫] 配额检查失败:', quotaError);
      return { success: false, error: '配额检查失败', code: 'QUOTA_CHECK_FAILED' };
    }

    const quota = quotaCheck[0];
    if (!quota.can_crawl) {
      return {
        success: false,
        error: quota.reason || '已达到爬取限额',
        code: 'QUOTA_EXCEEDED',
      };
    }

    console.log(
      `[XHS爬虫] 配额检查通过: 日剩余 ${quota.remaining_daily}, 时剩余 ${quota.remaining_hourly}`
    );

    // 🧪 测试模式：使用模拟数据
    let crawlResult: any;

    if (USE_MOCK_DATA) {
      console.log('[XHS爬虫] 🧪 使用模拟数据模式');
      // 模拟数据
      crawlResult = {
        success: true,
        posts: [
          {
            post_id: `mock_${Date.now()}_1`,
            title: `【${keyword}】初中数学必考知识点总结！学霸都在用的方法`,
            content: `大家好，我是10年教龄的数学老师👋\n\n今天给大家分享${keyword}的核心知识点：\n\n1️⃣ 基础概念要牢记\n2️⃣ 公式推导要理解\n3️⃣ 典型例题要会做\n4️⃣ 易错点要避免\n\n特别提醒：很多同学在这个知识点上容易犯错，一定要注意...\n\n关注我，每天分享数学学习干货！#数学学习 #初中数学 #学习方法`,
            images: [],
            likes: 2580,
            comments: 156,
            shares: 89,
            author_id: 'mock_author_1',
            author_name: '数学李老师',
            tags: ['数学学习', '初中数学', '学习方法'],
            category: '教育'
          },
          {
            post_id: `mock_${Date.now()}_2`,
            title: `${keyword}这样学，成绩提升超快！`,
            content: `作为数学老师，我发现很多学生在学${keyword}时都有这些问题：\n\n❌ 公式记不住\n❌ 题目不会做\n❌ 考试总出错\n\n其实只要掌握这3个技巧，就能轻松搞定：\n\n✅ 技巧1：理解而不是死记\n✅ 技巧2：多练典型题\n✅ 技巧3：总结错题本\n\n需要完整版资料的同学可以私信我哦～\n\n#数学提分 #学习技巧`,
            images: [],
            likes: 1850,
            comments: 92,
            shares: 67,
            author_id: 'mock_author_2',
            author_name: '王老师数学课堂',
            tags: ['数学提分', '学习技巧'],
            category: '教育'
          }
        ],
        metadata: {
          duration: 2000,
          retryCount: 0,
        }
      };
    } else {
      // 1.3 初始化爬虫
      const crawler = new PlaywrightCrawler();
      await crawler.init({
        useProxy: false, // MVP阶段不使用代理
        headless: true,
      });

      // 1.4 执行爬取
      const config: CrawlConfig = {
        keyword,
        minLikes,
        maxResults: Math.min(maxResults, 10), // 最多10个
        useProxy: false,
      };

      crawlResult = await crawler.searchAndCrawl(config);

      // 1.5 关闭浏览器
      await crawler.close();

      if (!crawlResult.success) {
        return {
          success: false,
          error: crawlResult.error || '爬取失败',
          code: 'CRAWL_FAILED',
        };
      }
    }

    console.log(`[XHS爬虫] 成功爬取 ${crawlResult.posts.length} 个帖子`);

    // 1.6 保存到数据库（使用service client避免RLS限制）
    const serviceSupabase = createServiceSupabaseClient();
    const savedPosts: any[] = [];

    for (const post of crawlResult.posts) {
      const { data, error } = await serviceSupabase
        .from('xhs_raw_posts')
        .insert({
          post_id: post.post_id,
          title: post.title,
          content: post.content,
          images_json: post.images,
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          author_id: post.author_id,
          author_name: post.author_name,
          tags: post.tags,
          category: post.category,
          crawled_by: user.id,
          crawl_keyword: keyword,
        })
        .select()
        .single();

      if (!error && data) {
        savedPosts.push(data);
      } else {
        console.error('[XHS爬虫] 保存帖子失败:', error);
      }
    }

    // 1.7 扣除配额
    const { error: deductError } = await supabase.rpc('deduct_xhs_crawl_quota', {
      p_user_id: user.id,
      p_deduct_amount: 1,
    });

    if (deductError) {
      console.error('[XHS爬虫] 扣除配额失败:', deductError);
    } else {
      quotaDeducted = true;
    }

    return {
      success: true,
      data: {
        postsCount: savedPosts.length,
        posts: savedPosts.map((p) => ({
          id: p.id,
          title: p.title,
          likes: p.likes,
          comments: p.comments,
        })),
        metadata: {
          duration: crawlResult.metadata.duration || 0,
          retryCount: crawlResult.metadata.retryCount,
        },
      },
    };
  } catch (error: any) {
    console.error('[XHS爬虫] 爬取失败:', error);

    // 失败回滚配额
    if (quotaDeducted) {
      try {
        const supabase = createAuthenticatedSupabaseClient();
        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase.rpc('rollback_xhs_crawl_quota', {
              p_user_id: user.id,
              p_rollback_amount: 1,
            });
          }
        }
      } catch (rollbackError) {
        console.error('[XHS爬虫] 回滚配额失败:', rollbackError);
      }
    }

    return {
      success: false,
      error: error.message || '爬取过程中发生错误',
      code: 'CRAWL_ERROR',
    };
  }
}

// ============================================================================
// 2. 分析帖子
// ============================================================================

export async function analyzePost(postId: string): Promise<ActionResult<any>> {
  try {
    // 2.1 身份验证
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    // 2.2 获取帖子数据
    const { data: post, error: fetchError } = await supabase
      .from('xhs_raw_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return { success: false, error: '帖子不存在', code: 'POST_NOT_FOUND' };
    }

    console.log(`[XHS分析] 开始分析帖子: ${post.title}`);

    // 2.3 调用Gemini分析
    const analyzer = new GeminiAnalyzer();
    const { analysis, metadata } = await analyzer.analyzeViralPost({
      title: post.title,
      content: post.content,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      tags: post.tags,
    });

    // 2.4 更新数据库（使用service client）
    const serviceSupabase = createServiceSupabaseClient();
    const { error: updateError } = await serviceSupabase
      .from('xhs_raw_posts')
      .update({
        ai_analysis: analysis,
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (updateError) {
      console.error('[XHS分析] 更新分析结果失败:', updateError);
    }

    console.log(`[XHS分析] 分析完成，耗时 ${metadata.generation_time_ms}ms`);

    return {
      success: true,
      data: {
        analysis,
        metadata,
      },
    };
  } catch (error: any) {
    console.error('[XHS分析] 分析失败:', error);
    return {
      success: false,
      error: error.message || 'AI分析失败',
      code: 'ANALYSIS_ERROR',
    };
  }
}

// ============================================================================
// 3. 生成草稿
// ============================================================================

export async function generateDraft(
  postId: string,
  personaId: string
): Promise<ActionResult<any>> {
  try {
    // 3.1 身份验证
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    // 3.2 获取帖子和分析结果
    const { data: post, error: fetchError } = await supabase
      .from('xhs_raw_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return { success: false, error: '帖子不存在', code: 'POST_NOT_FOUND' };
    }

    if (!post.ai_analysis) {
      return {
        success: false,
        error: '请先分析帖子',
        code: 'ANALYSIS_REQUIRED',
      };
    }

    // 3.3 获取人设
    const persona = getPersonaById(personaId) || getDefaultPersona();

    console.log(`[XHS生成] 使用人设: ${persona.name}`);

    // 3.4 调用DeepSeek重写
    const rewriter = new DeepSeekRewriter();
    const { draft, metadata } = await rewriter.rewriteContent(
      {
        title: post.title,
        content: post.content,
        tags: post.tags,
      },
      post.ai_analysis,
      persona
    );

    console.log(`[XHS生成] 重写完成，标题: ${draft.title}`);

    // 3.5 原创性检测
    const checker = new OriginalityChecker();
    const originalityCheck = checker.check(post.content, draft.content);

    console.log(
      `[XHS生成] 原创性检测: ${originalityCheck.passed ? '✓ 通过' : '✗ 不通过'} (${originalityCheck.similarity}%)`
    );

    // 3.6 敏感词检测
    const fullContent = `${draft.title}\n\n${draft.content}\n\n${draft.tags.join(' ')}`;
    const sensitiveCheck = await sensitiveWordFilter.scanContent(fullContent);

    console.log(
      `[XHS生成] 敏感词检测: ${sensitiveCheck.hasSensitiveWords ? `检测到 ${sensitiveCheck.matches.length} 个敏感词` : '无敏感词'} (风险等级: ${sensitiveCheck.riskLevel})`
    );

    // 3.7 自动替换敏感词（如果有可替换的）
    let finalTitle = draft.title;
    let finalContent = draft.content;
    let autoReplaced = false;
    let replacementDetails: any = null;

    if (sensitiveCheck.hasSensitiveWords && sensitiveCheck.riskLevel !== 'high') {
      const safetyCheck = await sensitiveWordFilter.isSafeToPublish(fullContent);

      if (safetyCheck.safe && safetyCheck.reason === '可以通过自动替换处理') {
        console.log('[XHS生成] 执行自动替换...');

        const titleReplaced = await sensitiveWordFilter.replaceSensitiveWords(draft.title);
        const contentReplaced = await sensitiveWordFilter.replaceSensitiveWords(draft.content);

        finalTitle = titleReplaced.replacedContent;
        finalContent = contentReplaced.replacedContent;
        autoReplaced = true;

        replacementDetails = {
          titleReplacements: titleReplaced.replacements,
          contentReplacements: contentReplaced.replacements,
          totalReplacements: titleReplaced.replacementCount + contentReplaced.replacementCount,
        };

        console.log(
          `[XHS生成] 自动替换完成，共替换 ${replacementDetails.totalReplacements} 处`
        );
      }
    }

    // 3.8 确定最终状态
    let finalStatus = 'draft';

    if (!originalityCheck.passed) {
      finalStatus = 'rejected'; // 原创性不通过
    } else if (sensitiveCheck.riskLevel === 'high') {
      finalStatus = 'rejected'; // 高风险敏感词
    } else if (sensitiveCheck.hasSensitiveWords && !autoReplaced) {
      finalStatus = 'draft'; // 有敏感词但未替换，标记为草稿待人工审核
    }

    console.log(`[XHS生成] 最终状态: ${finalStatus}`);

    // 3.9 保存草稿
    const { data: savedDraft, error: saveError } = await supabase
      .from('xhs_ai_drafts')
      .insert({
        source_post_id: postId,
        user_id: user.id,
        user_persona: persona.name,
        generated_title: finalTitle,
        generated_content: finalContent,
        generated_tags: draft.tags,
        similarity_score: originalityCheck.similarity,
        similarity_details: originalityCheck.details,
        originality_passed: originalityCheck.passed,
        sensitive_words_detected: sensitiveCheck.hasSensitiveWords
          ? {
              matches: sensitiveCheck.matches,
              riskLevel: sensitiveCheck.riskLevel,
              suggestion: sensitiveCheck.suggestion,
              replacements: replacementDetails,
            }
          : null,
        auto_replaced: autoReplaced,
        risk_level: sensitiveCheck.hasSensitiveWords ? sensitiveCheck.riskLevel : null,
        model_used: metadata.model,
        tokens_used: metadata.tokens_used,
        cost_usd: metadata.cost_usd,
        status: finalStatus,
      })
      .select()
      .single();

    if (saveError) {
      console.error('[XHS生成] 保存草稿失败:', saveError);
      return { success: false, error: '保存草稿失败', code: 'SAVE_ERROR' };
    }

    return {
      success: true,
      data: {
        draft: savedDraft,
        originality: originalityCheck,
        metadata,
      },
    };
  } catch (error: any) {
    console.error('[XHS生成] 生成草稿失败:', error);
    return {
      success: false,
      error: error.message || '生成草稿失败',
      code: 'GENERATION_ERROR',
    };
  }
}

// ============================================================================
// 4. 批准草稿
// ============================================================================

export async function approveDraft(draftId: string): Promise<ActionResult<any>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    const { data, error } = await supabase
      .from('xhs_ai_drafts')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .select()
      .single();

    if (error) {
      return { success: false, error: '批准失败', code: 'APPROVE_ERROR' };
    }

    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '批准草稿失败',
      code: 'APPROVE_ERROR',
    };
  }
}

// ============================================================================
// 5. 获取用户配额
// ============================================================================

export async function getUserQuota(): Promise<ActionResult<UserQuota>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    const { data, error } = await supabase.rpc('check_xhs_crawl_quota', {
      p_user_id: user.id,
    });

    if (error || !data || data.length === 0) {
      return { success: false, error: '获取配额失败', code: 'QUOTA_FETCH_ERROR' };
    }

    const quota = data[0];

    // 获取完整配额信息
    const { data: fullQuota } = await supabase
      .from('xhs_crawl_quotas')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return {
      success: true,
      data: {
        daily_crawl_limit: fullQuota?.daily_crawl_limit || 50,
        daily_crawl_used: fullQuota?.daily_crawl_used || 0,
        hourly_crawl_limit: fullQuota?.hourly_crawl_limit || 10,
        daily_generation_limit: fullQuota?.daily_generation_limit || 20,
        daily_generation_used: fullQuota?.daily_generation_used || 0,
        remaining_daily: quota.remaining_daily,
        remaining_hourly: quota.remaining_hourly,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '获取配额失败',
      code: 'QUOTA_ERROR',
    };
  }
}

// ============================================================================
// 6. 获取爬取的帖子列表
// ============================================================================

export async function getRawPosts(limit: number = 20): Promise<ActionResult<any[]>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    const { data, error } = await supabase
      .from('xhs_raw_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: '获取帖子列表失败', code: 'FETCH_ERROR' };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '获取帖子列表失败',
      code: 'FETCH_ERROR',
    };
  }
}

// ============================================================================
// 7. 获取草稿列表
// ============================================================================

export async function getDrafts(limit: number = 20): Promise<ActionResult<any[]>> {
  try {
    const supabase = createAuthenticatedSupabaseClient();
    if (!supabase) {
      return { success: false, error: '未登录，请先登录', code: 'UNAUTHORIZED' };
    }

    const { data, error } = await supabase
      .from('xhs_ai_drafts')
      .select('*, source_post:xhs_raw_posts(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: '获取草稿列表失败', code: 'FETCH_ERROR' };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '获取草稿列表失败',
      code: 'FETCH_ERROR',
    };
  }
}
