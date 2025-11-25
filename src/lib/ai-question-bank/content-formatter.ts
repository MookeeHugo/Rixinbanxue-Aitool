/**
 * 题目内容格式化工具
 * @description 将配图URL嵌入到题目content中
 */

/**
 * 在content中嵌入配图（Markdown格式）
 * @param content 原始题目内容
 * @param imageUrl 配图URL（签名URL或代理URL）
 * @returns 包含配图的Markdown内容
 */
export function embedImageInContent(content: string, imageUrl?: string | null): string {
  if (!imageUrl) {
    return content;
  }

  // 策略1：如果content中包含"如图"关键词，在其后插入图片
  const keywords = ['如图', '如下图', '如图所示', '见图', '下图'];

  for (const keyword of keywords) {
    if (content.includes(keyword)) {
      // 找到关键词的位置
      const index = content.indexOf(keyword);
      const insertPosition = index + keyword.length;

      // 在关键词后插入换行和图片
      const before = content.substring(0, insertPosition);
      const after = content.substring(insertPosition);

      return `${before}\n\n![配图](${imageUrl})\n\n${after}`;
    }
  }

  // 策略2：如果没有"如图"关键词，在题目内容开头插入（几何题通常先看图）
  return `![题目配图](${imageUrl})\n\n${content}`;
}

/**
 * 批量处理题目内容，嵌入配图
 * @param questions 题目列表
 * @param imageUrls 题目ID到图片URL的映射
 * @returns 处理后的题目列表
 */
export function batchEmbedImages<T extends { id: string; content: string; question_image_url?: string | null }>(
  questions: T[],
  imageUrls: Record<string, string>
): T[] {
  return questions.map(q => {
    // 优先使用question_image_url（裁剪后的配图）
    let imageUrl = q.question_image_url;

    // 如果没有question_image_url，查找映射表
    if (!imageUrl && imageUrls[q.id]) {
      imageUrl = imageUrls[q.id];
    }

    // 如果有图片URL，嵌入到content中
    if (imageUrl) {
      return {
        ...q,
        content: embedImageInContent(q.content, imageUrl)
      };
    }

    return q;
  });
}
