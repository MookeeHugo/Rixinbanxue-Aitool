/**
 * Gemini Flash + Pro 级联视觉模型客户端
 * 通过AJ中转站调用Gemini 2.5 Flash模型（OpenAI兼容接口）
 */

// AJ中转站配置
const AJ_BASE_URL = 'https://api.katioai.com/v1';
const AJ_API_KEY = process.env.AJ_API_KEY || process.env.GEMINI_API_KEY || '';

// ========== 类型定义 ==========

export interface GeminiQuestion {
  number: string;
  content: string;
  options?: string[];
  answer?: string;
  image_regions: Array<{
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    box_2d?: [number, number, number, number];
    position?: 'right' | 'bottom' | 'left' | 'inline';
    aspectRatio?: number;
    description?: string;
  }>;
}

export interface GeminiParseResult {
  questions: GeminiQuestion[];
  model: 'gemini-flash' | 'gemini-pro';
  retried: boolean;
  processingTime: number;
  validation: GeminiValidationResult;
}

export interface GeminiValidationResult {
  passed: boolean;
  reasons: string[];
  hasQuestions: boolean;
  hasImageRegions: boolean;
  hasValidCoordinates: boolean;
  hasValidSequence: boolean;
}

// ========== Prompt模板 ==========

const GEMINI_PROMPT = `你是专业的数学试卷OCR引擎。请提取题目和配图位置，并智能判断图片的排版位置。

【什么是配图】
✅ 必须标记：几何图（三角形、圆）、函数图像（抛物线、坐标系）、统计图表
❌ 不要标记：数学公式（y=x²）、符号（∠ABC、√2）、题号、文字

【坐标系统 - 关键】
标准图像坐标系：
- X轴：从左到右（0=最左，图片宽度=最右）
- Y轴：从上到下（0=最顶，图片高度=最底）
- x: 图形左上角横坐标（像素）
- y: 图形左上角纵坐标（像素）
- width: 图形宽度（像素）
- height: 图形高度（像素）

【智能排版位置判断 - 新增】
根据图片在题目中的位置和形状，判断最佳排版方式：
- position: 图片相对题目文字的位置
  * "right": 图片在题目右侧（x > 页面宽度×60%）
  * "bottom": 图片在题目下方（y > 题目文字区域底部）
  * "left": 图片在题目左侧（x < 页面宽度×30%）
  * "inline": 图片嵌入在文字中间
- aspectRatio: 宽高比 (width/height)，保留2位小数
  * > 1.5: 横向长图（如数轴、统计图），建议放下方
  * < 0.8: 纵向高图（如几何图），建议放右侧
  * 0.8-1.5: 方形图，灵活放置

【示例】假设图片1000×1500px：
- 右侧的几何图：x=800, y=100, width=150, height=180, position="right", aspectRatio=0.83
- 下方的统计图：x=100, y=800, width=600, height=300, position="bottom", aspectRatio=2.0
- 左侧的坐标系：x=50, y=200, width=200, height=200, position="left", aspectRatio=1.0

【输出JSON】无markdown标记：
{
  "questions": [
    {
      "number": "1",
      "content": "题干",
      "options": ["A. 选项A"],
      "answer": "",
      "image_regions": [
        {
          "x": 800,
          "y": 100,
          "width": 150,
          "height": 180,
          "position": "right",
          "aspectRatio": 0.83,
          "description": "几何图形"
        }
      ]
    }
  ]
}

【质量检查】
- 图在右侧：x应该>图片宽度×60%，position="right"
- 图在下方：y应该>图片高度×50%，position="bottom"
- aspectRatio必须准确计算：width/height，保留2位小数
- 只标记真正的图形，不要标记文字

IMPORTANT: Coordinate system is standard image coordinates where (0,0) is top-left corner. X increases rightward, Y increases downward.

IMPORTANT: When returning \`box_2d\`, you MUST strictly follow the order: [ymin, xmin, ymax, xmax].
- The 1st number is the TOP edge (vertical position).
- The 2nd number is the LEFT edge (horizontal position).
Do NOT return [xmin, ymin...]. This is critical for cropping.`;

// ========== 核心函数 ==========

/**
 * Gemini Flash + Pro 级联调用（从Buffer）
 * @param imageBuffer 试卷图片的Buffer
 * @returns 解析结果，包含题目和图像区域坐标
 */
export async function parseQuestionWithCascadingFromBuffer(
  imageBuffer: Buffer
): Promise<GeminiParseResult> {
  const startTime = Date.now();

  console.log('[Gemini级联] 开始解析（从Buffer）', { bufferSize: imageBuffer.length });

  try {
    // 第一层：Gemini Flash（快速）
    console.log('[Gemini级联] 第一层：尝试 Gemini Flash');
    const flashResult = await callGeminiFlashFromBuffer(imageBuffer);
    const flashValidation = validateParseResult(flashResult);

    if (flashValidation.passed) {
      const processingTime = Date.now() - startTime;
      console.log('[Gemini级联] ✅ Flash 成功，跳过兜底', {
        questionCount: flashResult.questions.length,
        processingTime: `${processingTime}ms`
      });

      return {
        questions: flashResult.questions,
        model: 'gemini-flash',
        retried: false,
        processingTime,
        validation: flashValidation
      };
    }

    console.warn('[Gemini级联] ⚠️ Flash 结果不佳，触发兜底', {
      reasons: flashValidation.reasons
    });

    // 第二层：Flash 兜底（更低温度）
    const proResult = await callGeminiProFromBuffer(imageBuffer);
    const proValidation = validateParseResult(proResult);
    const processingTime = Date.now() - startTime;

    console.log('[Gemini级联] ✅ 兜底成功', {
      questionCount: proResult.questions.length,
      processingTime: `${processingTime}ms`
    });

    return {
      questions: proResult.questions,
      model: 'gemini-pro',
      retried: true,
      processingTime,
      validation: proValidation
    };

  } catch (flashError) {
    console.error('[Gemini级联] Flash 异常，直接使用兜底', flashError);

    // Flash异常，直接用兜底
    const proResult = await callGeminiProFromBuffer(imageBuffer);
    const proValidation = validateParseResult(proResult);
    const processingTime = Date.now() - startTime;

    return {
      questions: proResult.questions,
      model: 'gemini-pro',
      retried: true,
      processingTime,
      validation: proValidation
    };
  }
}

/**
 * Gemini Flash + Pro 级联调用（从URL）
 * @param imageUrl 试卷图片的公开URL
 * @returns 解析结果，包含题目和图像区域坐标
 */
export async function parseQuestionWithCascading(
  imageUrl: string
): Promise<GeminiParseResult> {
  const startTime = Date.now();

  console.log('[Gemini??] ????', { imageUrl });

  try {
    // ????Gemini 1.5 Flash????
    console.log('[Gemini??] ?????? Gemini 1.5 Flash');
    const flashResult = await callGeminiFlash(imageUrl);
    const flashValidation = validateParseResult(flashResult);

    if (flashValidation.passed) {
      const processingTime = Date.now() - startTime;
      console.log('[Gemini??] ? Flash ?????Pro', {
        questionCount: flashResult.questions.length,
        processingTime: `${processingTime}ms`
      });

      return {
        questions: flashResult.questions,
        model: 'gemini-flash',
        retried: false,
        processingTime,
        validation: flashValidation
      };
    }

    console.warn('[Gemini??] ?? Flash ???????Pro ??', {
      reasons: flashValidation.reasons
    });

    // ????Gemini 1.5 Pro????
    const proResult = await callGeminiPro(imageUrl);
    const proValidation = validateParseResult(proResult);
    const processingTime = Date.now() - startTime;

    console.log('[Gemini??] ? Pro ????', {
      questionCount: proResult.questions.length,
      processingTime: `${processingTime}ms`
    });

    return {
      questions: proResult.questions,
      model: 'gemini-pro',
      retried: true,
      processingTime,
      validation: proValidation
    };

  } catch (flashError) {
    console.error('[Gemini??] Flash ???????Pro', flashError);

    // Flash??????Pro
    const proResult = await callGeminiPro(imageUrl);
    const proValidation = validateParseResult(proResult);
    const processingTime = Date.now() - startTime;

    return {
      questions: proResult.questions,
      model: 'gemini-pro',
      retried: true,
      processingTime,
      validation: proValidation
    };
  }
}

/**
 * 调用 Gemini 2.5 Flash (从URL - 测试用)
 */
async function callGeminiFlash(imageUrl: string) {
  console.log('[Gemini 2.5 Flash] 开始调用AJ中转站API (从URL)');

  // 下载图片并转换为base64
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  return await callGeminiWithBase64(base64, 0.1);
}

/**
 * 调用 Gemini 2.5 Flash (从Buffer - 生产用)
 */
async function callGeminiFlashFromBuffer(imageBuffer: Buffer) {
  console.log('[Gemini 2.5 Flash] 开始调用AJ中转站API (从Buffer)');

  // 直接使用提供的Buffer
  const base64 = imageBuffer.toString('base64');

  return await callGeminiWithBase64(base64, 0.1);
}

/**
 * 调用 Gemini API (统一逻辑)
 */
async function callGeminiWithBase64(base64: string, temperature: number) {

  // 使用标准OpenAI Chat Completions格式
  const apiResponse = await fetch(`${AJ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AJ_API_KEY}`
    },
    body: JSON.stringify({
      model: '[AJ]gemini-2.5-flash[1]',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: GEMINI_PROMPT
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 8192
    })
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    throw new Error(`AJ API错误 (${apiResponse.status}): ${errorText}`);
  }

  const result = await apiResponse.json();
  const text = result.choices[0].message.content;

  console.log('[Gemini 2.5 Flash] 响应接收', { textLength: text.length });

  return parseGeminiResponse(text);
}

/**
 * 调用 Gemini 兜底 (从URL - 测试用)
 */
async function callGeminiPro(imageUrl: string) {
  console.log('[Gemini兜底] 开始调用AJ中转站API (从URL)');

  // 下载图片并转换为base64
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  return await callGeminiWithBase64(base64, 0.05);
}

/**
 * 调用 Gemini 兜底 (从Buffer - 生产用)
 */
async function callGeminiProFromBuffer(imageBuffer: Buffer) {
  console.log('[Gemini兜底] 开始调用AJ中转站API (从Buffer)');

  // 直接使用提供的Buffer
  const base64 = imageBuffer.toString('base64');

  return await callGeminiWithBase64(base64, 0.05);
}

/**
 * 解析Gemini返回的JSON
 */
function parseGeminiResponse(text: string): { questions: GeminiQuestion[] } {
  // 去除可能的markdown代码块标记
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (error) {
    console.error('[Gemini解析] JSON解析失败', {
      text: cleaned.substring(0, 500),
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error(`Gemini返回格式无效: ${error}`);
  }
}

/**
 * ????????
 */
function validateParseResult(result: any): GeminiValidationResult {
  const reasons: string[] = [];
  const hasQuestions = Array.isArray(result?.questions) && result.questions.length > 0;
  let hasImageRegions = false;
  let hasValidCoordinates = true;
  let hasValidSequence = true;

  if (!hasQuestions) {
    reasons.push('??????');
  } else {
    const numbers = result.questions
      .map((q: any) => parseInt(q.number, 10))
      .filter((num: number) => !Number.isNaN(num))
      .sort((a: number, b: number) => a - b);

    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] - numbers[i - 1] > 2) {
        hasValidSequence = false;
        reasons.push('??????');
        break;
      }
    }

    hasImageRegions = result.questions.some((q: any) => q.image_regions?.length > 0);
    if (!hasImageRegions) {
      reasons.push('????????');
    }

    const invalidRegion = result.questions.some((q: any) =>
      q.image_regions?.some((r: any) =>
        r == null ||
        !Number.isFinite(r.x) ||
        !Number.isFinite(r.y) ||
        !Number.isFinite(r.width) ||
        !Number.isFinite(r.height) ||
        r.x < 0 ||
        r.y < 0 ||
        r.width <= 0 ||
        r.height <= 0
      )
    );

    if (invalidRegion) {
      hasValidCoordinates = false;
      reasons.push('??????');
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
    hasQuestions,
    hasImageRegions,
    hasValidCoordinates,
    hasValidSequence
  };
}
