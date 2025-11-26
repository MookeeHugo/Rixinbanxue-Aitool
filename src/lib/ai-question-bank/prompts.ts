/**
 * AI题库系统 - Prompt 模板
 * @description Qwen3-VL-Flash 的系统与用户提示词，统一 JSON 输出
 */

/**
 * System Prompt：定义 AI 角色与能力
 */
export const QWEN_SYSTEM_PROMPT = `你是一名专业的初高中数学题目解析专家，具备以下能力：

1. **OCR 能力**：精准提取题干、公式（含 LaTeX）与作答步骤；
2. **结构化理解**：正确识别题号、题型、选项、答案与解析；
3. **配图标注**：当题目包含配图（如几何图形、函数图像等）时，必须在content字段中使用 \`<<IMG_题号_序号>>\` 占位符标记配图位置，例如 \`<<IMG_8_1>>\` 表示第8题的第1张配图；
4. **知识点标注**：为每题总结核心知识点与题型标签；
5. **自检评分**：为识别结果提供 0-1 的 confidence 评分。

**输出要求**：
- 仅以合法 JSON 输出，便于 JSON.parse 解析；
- 数学公式使用 LaTeX 语法，例如 $x^2 + 2x + 1$；
- 如果题目有配图，必须在 content 中插入占位符（如 <<IMG_1_1>>），同时在 question.images 数组中提供对应的元数据（placeholder/description/position）；
- 所有字段均需填写，无法确定时降低 confidence，不允许留空；
- 题型（type）限定为 choice/fill/essay/proof。
`;


/**
 * User Prompt：具体任务指令
 */
export const QWEN_USER_PROMPT = `请分析这张试卷图片，返回以下 JSON 格式：

\`\`\`json
{
  "questions": [
    {
      "number": "14",
      "type": "choice",
      "content": "如图，在 $\\triangle ABC$ 中，点D，E分别在边 AB 和 AC 上，<<IMG_14_1>> 连接 DE，若 DE 平行于 BC，<<IMG_14_2>>",
      "options": ["A. $70^{\\circ}$", "B. $80^{\\circ}$", "C. $60^{\\circ}$", "D. $50^{\\circ}$"],
      "answer": "A",
      "tags": {
        "knowledge": ["平行线的性质"],
        "difficulty": "medium",
        "type": "几何题"
      },
      "confidence": 0.94,
      "steps": ["识别平行线的性质定理"],
      "images": [
        {
          "placeholder": "<<IMG_14_1>>",
          "description": "三角形主体结构示意图",
          "position": "题干中 "如图" 关键词后"
        },
        {
          "placeholder": "<<IMG_14_2>>",
          "description": "线段 DE 的位置",
          "position": "题干描述连接关系后"
        }
      ]
    }
  ]
}
\`\`\`

**关键规则**：
- \`number\`: 题号，必须与试卷原始编号一致（不要补零，例如应该是"8"而不是"08"）
- \`content\`: 题目内容，如有配图必须使用 <<IMG_题号_序号>> 占位符标记位置（与 OCR 系统对接）
- \`images\`: 配图元数据数组，每个元素包含 placeholder/description/position 字段
- 不要使用 HTML 标签，数学公式使用 LaTeX 语法`;


/**
 * 获取完整 Prompt，支持 Base64 或图片 URL
 */
type PromptImageInput =
  | string
  | {
      base64?: string | null;
      mimeType?: string;
      imageUrl?: string;
    };

export function getQwenPromptMessages(
  image: PromptImageInput,
  fallbackMimeType: string = 'image/jpeg'
) {
  let base64Value: string | undefined;
  let mimeType = fallbackMimeType;
  let imageUrl: string | undefined;

  if (typeof image === 'string') {
    base64Value = image;
  } else {
    base64Value = image.base64 ?? undefined;
    mimeType = image.mimeType || fallbackMimeType;
    imageUrl = image.imageUrl ?? undefined;
  }

  if (!imageUrl && !base64Value) {
    throw new Error('必须提供 Base64 编码或图片 URL');
  }

  const imageContent = imageUrl
    ? { type: 'image_url', image_url: { url: imageUrl } }
    : {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64Value}` }
      };

  return [
    {
      role: 'system',
      content: [{ type: 'text', text: QWEN_SYSTEM_PROMPT }]
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: QWEN_USER_PROMPT },
        imageContent
      ]
    }
  ];
}

/**
 * 置信度回查 Prompt（当 confidence < 0.8 时触发）
 */
export const QWEN_RECHECK_PROMPT = `请仔细复核以下题目的识别结果，重点检查：
1. 数学公式是否完整；
2. 选项编号是否正确；
3. 答案是否准确。

若发现错误，请修正并更新 confidence；
若确认无误，请保持原结果并适当提高 confidence。

上一次识别输出：
{{PREVIOUS_RESULT}}

请返回修订后的完整 JSON。`;
