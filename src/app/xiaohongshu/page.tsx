'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  crawlPosts,
  analyzePost,
  generateDraft,
  getUserQuota,
  getRawPosts,
  getDrafts,
} from '@/app/actions/xiaohongshu';
import { getAllPersonas } from '@/lib/xiaohongshu/persona-presets';
import { PostComparison } from '@/components/xiaohongshu/post-comparison';

export default function XiaohongshuPage() {
  const [keyword, setKeyword] = useState('');
  const [minLikes, setMinLikes] = useState('1000');
  const [crawling, setCrawling] = useState(false);
  const [quota, setQuota] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedPersona, setSelectedPersona] = useState('math-teacher-10y');
  const [activeView, setActiveView] = useState<'crawler' | 'drafts'>('crawler');

  const personas = getAllPersonas();

  // 加载配额和数据
  useEffect(() => {
    loadQuota();
    loadPosts();
    loadDrafts();
  }, []);

  async function loadQuota() {
    const result = await getUserQuota();
    if (result.success) {
      setQuota(result.data);
    }
  }

  async function loadPosts() {
    const result = await getRawPosts(20);
    if (result.success) {
      setPosts(result.data || []);
    }
  }

  async function loadDrafts() {
    const result = await getDrafts(20);
    if (result.success) {
      setDrafts(result.data || []);
    }
  }

  async function handleCrawl() {
    if (!keyword.trim()) {
      alert('请输入关键词');
      return;
    }

    setCrawling(true);
    try {
      const result = await crawlPosts(keyword, parseInt(minLikes), 5);

      if (result.success) {
        alert(`成功爬取 ${result.data?.postsCount} 个帖子`);
        await loadPosts();
        await loadQuota();
      } else {
        alert(`爬取失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`爬取错误: ${error.message}`);
    } finally {
      setCrawling(false);
    }
  }

  async function handleAnalyze(postId: string) {
    try {
      const result = await analyzePost(postId);
      if (result.success) {
        alert('分析完成！');
        await loadPosts();
      } else {
        alert(`分析失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`分析错误: ${error.message}`);
    }
  }

  async function handleGenerate(postId: string) {
    try {
      const result = await generateDraft(postId, selectedPersona);
      if (result.success) {
        if (result.data?.originality.passed) {
          alert('草稿生成成功！原创性检测通过');
        } else {
          alert(
            `草稿生成完成，但原创性未通过: ${result.data?.originality.reason}`
          );
        }
        await loadDrafts();
      } else {
        alert(`生成失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`生成错误: ${error.message}`);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">小红书AI运营系统</h1>

      {/* 配额显示 */}
      {quota && (
        <Card className="mb-6 p-4">
          <div className="flex gap-4">
            <div>
              <div className="text-sm text-gray-500">每日爬取</div>
              <div className="text-lg font-semibold">
                {quota.daily_crawl_used} / {quota.daily_crawl_limit}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">每小时爬取</div>
              <div className="text-lg font-semibold">
                剩余 {quota.remaining_hourly}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">每日生成</div>
              <div className="text-lg font-semibold">
                {quota.daily_generation_used} / {quota.daily_generation_limit}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 视图切换 */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={activeView === 'crawler' ? 'default' : 'outline'}
          onClick={() => setActiveView('crawler')}
        >
          爬虫控制台
        </Button>
        <Button
          variant={activeView === 'drafts' ? 'default' : 'outline'}
          onClick={() => setActiveView('drafts')}
        >
          草稿列表 ({drafts.length})
        </Button>
      </div>

      {activeView === 'crawler' ? (
        <>
          {/* 爬取表单 */}
          <Card className="mb-6 p-4">
            <h2 className="text-xl font-semibold mb-4">爬取爆款帖子</h2>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">
                  关键词
                </label>
                <Input
                  placeholder="例如：数学教学、初中数学"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium mb-2">
                  最低点赞数
                </label>
                <Input
                  type="number"
                  value={minLikes}
                  onChange={(e) => setMinLikes(e.target.value)}
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium mb-2">
                  人设选择
                </label>
                <Select
                  value={selectedPersona}
                  onValueChange={setSelectedPersona}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {personas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCrawl} disabled={crawling}>
                {crawling ? '爬取中...' : '开始爬取'}
              </Button>
            </div>
          </Card>

          {/* 帖子列表 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              已爬取帖子 ({posts.length})
            </h2>
            {posts.map((post) => (
              <Card key={post.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{post.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {post.content}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Badge variant="secondary">👍 {post.likes}</Badge>
                    <Badge variant="secondary">💬 {post.comments}</Badge>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {!post.ai_analysis ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAnalyze(post.id)}
                    >
                      AI分析
                    </Button>
                  ) : (
                    <>
                      <Badge variant="default">✓ 已分析</Badge>
                      <Button
                        size="sm"
                        onClick={() => handleGenerate(post.id)}
                      >
                        生成草稿
                      </Button>
                    </>
                  )}
                </div>

                {post.ai_analysis && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                    <div className="font-medium mb-1">AI分析结果：</div>
                    <div className="text-gray-700">
                      {post.ai_analysis.title_strategy?.substring(0, 100)}...
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {posts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                暂无数据，请先爬取帖子
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* 草稿列表 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              AI生成草稿 ({drafts.length})
            </h2>
            {drafts.map((draft) => (
              <PostComparison
                key={draft.id}
                draft={draft}
                originalPost={draft.source_post}
              />
            ))}

            {drafts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                暂无草稿，请先生成内容
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
