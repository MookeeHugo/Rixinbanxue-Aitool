'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { approveDraft } from '@/app/actions/xiaohongshu';

interface PostComparisonProps {
  draft: any;
  originalPost: any;
}

export function PostComparison({ draft, originalPost }: PostComparisonProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleApprove = async () => {
    const result = await approveDraft(draft.id);
    if (result.success) {
      alert('草稿已批准！');
      window.location.reload();
    } else {
      alert(`批准失败: ${result.error}`);
    }
  };

  return (
    <Card className="p-6">
      {/* 状态和元数据 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Badge
            variant={draft.originality_passed ? 'default' : 'destructive'}
          >
            {draft.originality_passed ? '✓ 原创通过' : '✗ 原创未通过'}
          </Badge>
          <Badge variant="secondary">相似度: {draft.similarity_score}%</Badge>

          {/* 敏感词检测结果 */}
          {draft.sensitive_words_detected && (
            <>
              <Badge
                variant={
                  draft.risk_level === 'high'
                    ? 'destructive'
                    : draft.risk_level === 'medium'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {draft.risk_level === 'high' && '⚠️ 高风险'}
                {draft.risk_level === 'medium' && '⚡ 中风险'}
                {draft.risk_level === 'low' && 'ℹ️ 低风险'}
              </Badge>
              {draft.auto_replaced && (
                <Badge variant="default">🔄 已自动替换</Badge>
              )}
            </>
          )}

          <Badge variant="outline">{draft.user_persona}</Badge>
        </div>

        <div className="flex gap-2">
          {draft.status === 'draft' && (
            <Button size="sm" onClick={handleApprove}>
              批准草稿
            </Button>
          )}
          {draft.status === 'approved' && (
            <Badge variant="default">已批准</Badge>
          )}
        </div>
      </div>

      {/* 对比视图 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 原文 */}
        <div>
          <h3 className="font-semibold text-lg mb-3 text-gray-700">
            原文（参考）
          </h3>

          <div className="space-y-3">
            {/* 原文标题 */}
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500 mb-1">标题</div>
              <div className="font-medium">{originalPost?.title}</div>
            </div>

            {/* 原文内容 */}
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500 mb-1">正文</div>
              <div className="text-sm whitespace-pre-wrap">
                {originalPost?.content}
              </div>
            </div>

            {/* 原文标签 */}
            {originalPost?.tags && originalPost.tags.length > 0 && (
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 mb-1">标签</div>
                <div className="flex flex-wrap gap-1">
                  {originalPost.tags.map((tag: string, i: number) => (
                    <Badge key={i} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 原文数据 */}
            <div className="flex gap-2 text-sm text-gray-600">
              <span>👍 {originalPost?.likes}</span>
              <span>💬 {originalPost?.comments}</span>
              <span>🔄 {originalPost?.shares}</span>
            </div>
          </div>
        </div>

        {/* AI生成 */}
        <div>
          <h3 className="font-semibold text-lg mb-3 text-blue-700">
            AI生成（可发布）
          </h3>

          <div className="space-y-3">
            {/* AI生成标题 */}
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="flex justify-between items-center mb-1">
                <div className="text-xs text-gray-500">标题</div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() =>
                    copyToClipboard(draft.generated_title, 'title')
                  }
                >
                  {copiedField === 'title' ? '✓ 已复制' : '复制'}
                </Button>
              </div>
              <div className="font-medium">{draft.generated_title}</div>
            </div>

            {/* AI生成内容 */}
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="flex justify-between items-center mb-1">
                <div className="text-xs text-gray-500">正文</div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() =>
                    copyToClipboard(draft.generated_content, 'content')
                  }
                >
                  {copiedField === 'content' ? '✓ 已复制' : '复制'}
                </Button>
              </div>
              <div className="text-sm whitespace-pre-wrap">
                {draft.generated_content}
              </div>
            </div>

            {/* AI生成标签 */}
            {draft.generated_tags && draft.generated_tags.length > 0 && (
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-xs text-gray-500">标签</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() =>
                      copyToClipboard(
                        draft.generated_tags.map((t: string) => `#${t}`).join(' '),
                        'tags'
                      )
                    }
                  >
                    {copiedField === 'tags' ? '✓ 已复制' : '复制'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {draft.generated_tags.map((tag: string, i: number) => (
                    <Badge key={i} variant="default">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 一键复制全部 */}
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                const fullText = `${draft.generated_title}\n\n${draft.generated_content}\n\n${draft.generated_tags.map((t: string) => `#${t}`).join(' ')}`;
                copyToClipboard(fullText, 'all');
              }}
            >
              {copiedField === 'all' ? '✓ 已复制全部' : '📋 一键复制全部'}
            </Button>
          </div>
        </div>
      </div>

      {/* 原创性检测详情 */}
      {draft.similarity_details && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
          <div className="font-medium mb-2">原创性检测详情：</div>
          <div className="grid grid-cols-4 gap-2 text-gray-700">
            <div>
              整体相似度: {draft.similarity_details.overall_similarity}%
            </div>
            <div>
              最高段落相似度:{' '}
              {draft.similarity_details.max_paragraph_similarity}%
            </div>
            <div>
              可疑段落: {draft.similarity_details.suspicious_paragraphs} 个
            </div>
            <div>
              词汇多样性: {draft.similarity_details.vocabulary_diversity}%
            </div>
          </div>
        </div>
      )}

      {/* 敏感词检测详情 */}
      {draft.sensitive_words_detected && (
        <div
          className={`mt-4 p-3 rounded text-sm ${
            draft.risk_level === 'high'
              ? 'bg-red-50 border border-red-200'
              : draft.risk_level === 'medium'
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <div className="font-medium mb-2">敏感词检测详情：</div>
          <div className="space-y-2 text-gray-700">
            <div className="flex gap-4">
              <span>
                检测到敏感词:{' '}
                {draft.sensitive_words_detected.matches?.length || 0} 个
              </span>
              <span>风险等级: {draft.risk_level}</span>
              {draft.auto_replaced && (
                <span className="text-green-600">
                  已自动替换:{' '}
                  {draft.sensitive_words_detected.replacements
                    ?.totalReplacements || 0}{' '}
                  处
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              建议: {draft.sensitive_words_detected.suggestion}
            </div>
            {draft.auto_replaced &&
              draft.sensitive_words_detected.replacements && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    查看替换详情
                  </summary>
                  <div className="mt-2 pl-4 border-l-2 border-blue-300 space-y-1">
                    {draft.sensitive_words_detected.replacements.titleReplacements?.map(
                      (r: any, i: number) => (
                        <div key={`title-${i}`} className="text-xs">
                          标题: "{r.original}" → "{r.replacement}"
                        </div>
                      )
                    )}
                    {draft.sensitive_words_detected.replacements.contentReplacements?.map(
                      (r: any, i: number) => (
                        <div key={`content-${i}`} className="text-xs">
                          正文: "{r.original}" → "{r.replacement}"
                        </div>
                      )
                    )}
                  </div>
                </details>
              )}
          </div>
        </div>
      )}

      {/* AI成本和元数据 */}
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <div>
          模型: {draft.model_used} | Tokens: {draft.tokens_used} | 成本: $
          {draft.cost_usd}
        </div>
        <div>创建时间: {new Date(draft.created_at).toLocaleString()}</div>
      </div>
    </Card>
  );
}
