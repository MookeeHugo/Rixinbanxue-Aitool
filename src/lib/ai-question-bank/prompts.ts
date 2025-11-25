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
3. **知识点标注**：为每题总结核心知识点与题型标签；
4. **自检评分**：为识别结果提供 0-1 的 confidence 评分。

**输出要求**：
- 仅以合法 JSON 输出，便于 JSON.parse 解析；
- 数学公式使用 LaTeX 语法，例如 $x^2 + 2x + 1$；
- 所有字段均需填写，无法确定时降低 confidence，不允许留空；
- 题型（type）限定为 choice/fill/essay/proof。
`;

/**
 * User Prompt：具体任务指令
 */
export const QWEN_USER_PROMPT = `请解析图片中的数学题目，按照以下 JSON 结构输出：

\`\`\`json
{
  "questions": [
    {
      "number": "1",
      "type": "choice",
      "content": "如图，在 $\\triangle ABC$ 中，$AB = AC$，$\\angle BAC = 40°$，求 $\\angle B$ 的度数。",
      "options": ["A. $70°$", "B. $80°$", "C. $60°$", "D. $50°$"],
      "answer": "A",
      "tags": {
        "knowledge": ["等腰三角形", "内角和"],
        "difficulty": "medium",
        "type": "选择题"
      },
      "confidence": 0.95,
      "steps": [
        "等腰三角形性质：$\\angle B = \\angle C$",
        "内角和：$\\angle B + \\angle C + 40° = 180°$",
        "解得：$\\angle B = 70°$"
      ]
    },
    {
      "number": "2",
      "type": "fill",
      "content": "化简并填空：$x^2 - 4 = $ _____",
      "answer": "$(x+2)(x-2)$",
      "tags": {
        "knowledge": ["平方差公式"],
        "difficulty": "easy",
        "type": "填空题"
      },
      "confidence": 0.9
    }
  ]
}
\`\`\`

**字段说明**：
- \`number\`：题号，字符串；
- \`type\`：题型，choice/fill/essay/proof；
- \`content\`：题目内容，允许 LaTeX，如有配图请在content中注明"如图"；
- \`options\`：选项数组，仅 choice 需要；
- \`answer\`：参考答案，选择题返回字母，其余题型返回完整答案；
- \`tags.knowledge\`：知识点数组，至少 1 个；
- \`tags.difficulty\`：难度，easy/medium/hard；
- \`tags.type\`：题型描述，如"选择题""填空题"；
- \`confidence\`：自评置信度（0-1）；
- \`steps\`：解题步骤，可选，如能识别请提供。

**重要提醒**：
1. 仅返回 JSON，无需额外说明；
2. JSON 必须合法、字段完整；
3. 数学公式必须写在 $...$ 中；
4. 不确定的内容请降低 confidence，而不是留空。
`;

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
