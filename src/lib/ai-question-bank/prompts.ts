/**
 * AI题库系统 - Prompt模板
 * @description Qwen3-VL-Flash的系统和用户Prompt（结构化输出）
 */

/**
 * System Prompt（定义AI角色和能力）
 */
export const QWEN_SYSTEM_PROMPT = `你是专业的初中数学题目识别专家，具备以下能力：

1. **OCR能力**：准确识别图片中的数学公式（包括LaTeX格式）
2. **结构化理解**：准确识别题号、题型、内容、选项、答案
3. **知识标注**：为每道题标注知识点和难度
4. **置信度评估**：对识别结果的准确性进行0-1评分

**输出要求**：
- 严格按照JSON格式输出
- 数学公式使用LaTeX语法（如 $x^2 + 2x + 1$）
- 确保JSON格式正确，可被JSON.parse解析
- 如果某个字段不确定，降低confidence值，但不要留空

**质量标准**：
- 题目内容完整无遗漏
- 选项编号正确（A/B/C/D）
- 答案准确（对于选择题只返回选项字母）
- 知识点标注专业准确`;

/**
 * User Prompt（具体任务指令）
 */
export const QWEN_USER_PROMPT = `请分析图片中的初中数学题目，严格按照以下JSON格式输出：

\`\`\`json
{
  "questions": [
    {
      "number": "1",
      "type": "choice",
      "content": "已知函数 $y = 2x^2 - 4x + 1$，求顶点坐标？",
      "options": ["A. $(1, -1)$", "B. $(2, 1)$", "C. $(1, 1)$", "D. $(2, -1)$"],
      "answer": "A",
      "tags": {
        "knowledge": ["二次函数", "顶点坐标"],
        "difficulty": "medium",
        "type": "选择题"
      },
      "confidence": 0.95,
      "steps": [
        "配方法：$y = 2(x-1)^2 - 1$",
        "顶点为 $(1, -1)$"
      ]
    },
    {
      "number": "2",
      "type": "fill",
      "content": "分解因式：$x^2 - 4 = $ _____",
      "answer": "$(x+2)(x-2)$",
      "tags": {
        "knowledge": ["因式分解", "平方差公式"],
        "difficulty": "easy",
        "type": "填空题"
      },
      "confidence": 0.98
    }
  ]
}
\`\`\`

**字段说明**：
- \`number\`：题号（字符串）
- \`type\`：题型（choice/fill/essay/proof）
- \`content\`：题目内容（使用LaTeX格式，如 $x^2$）
- \`options\`：选项数组（仅选择题需要）
- \`answer\`：答案（选择题返回字母，其他题型返回完整答案）
- \`tags.knowledge\`：知识点数组（至少1个）
- \`tags.difficulty\`：难度（easy/medium/hard）
- \`tags.type\`：题型描述（如"选择题"、"填空题"）
- \`confidence\`：置信度（0-1，反映识别准确性）
- \`steps\`：解题步骤（可选，如果能识别出）

**重要**：
1. 只返回JSON，不要有任何其他文字
2. 确保JSON格式正确
3. 数学公式必须用LaTeX格式（$...$）
4. 如果识别不清楚，降低confidence但不要空着`;

/**
 * 获取完整的Prompt配置
 */
export function getQwenPromptMessages(imageBase64: string, mimeType: string = 'image/jpeg') {
  return [
    {
      role: 'system',
      content: [{ type: 'text', text: QWEN_SYSTEM_PROMPT }]
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: QWEN_USER_PROMPT },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${imageBase64}`
          }
        }
      ]
    }
  ];
}

/**
 * 低置信度复查Prompt（当confidence < 0.8时）
 */
export const QWEN_RECHECK_PROMPT = `请仔细复查以下题目的识别结果，特别关注：
1. 数学公式是否完整准确
2. 选项编号是否正确
3. 答案是否准确

如果发现错误，请修正并更新confidence值。
如果确认无误，保持原结果并提高confidence值。

原识别结果：
{{PREVIOUS_RESULT}}

请返回修正后的完整JSON结果。`;
