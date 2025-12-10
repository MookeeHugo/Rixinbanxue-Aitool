/**
 * DeepSeek 提示词模板库
 * - 线性/二次函数
 * - 统计图表（直方图、条形图）
 * - 几何图形（三角形、圆）
 * 模板变量使用 {{variable}} 形式，通过 replaceTemplateVariables 替换。
 */

import type { GenerationParameters, QuestionType, DiagramType } from './types';
import { replaceTemplateVariables } from './deepseek-client';

// ============================================================================
// 函数类
// ============================================================================

export const FUNCTION_LINEAR_PROMPT = `你是一名数学出题与Python绘图助手，请生成线性函数 f(x)=ax+b 的题目与可执行代码。
要求：
- 参数：a={{coef_a}}，b={{coef_b}}，定义域={{domain}}，难度{{difficulty}}
- 输出 JSON 对象，字段必须包含 question_text、python_code、coordinates
- 禁止 markdown 代码块；所有字段必须是字符串或对象
- python_code 必须定义 generate_diagram()，仅允许导入 matplotlib、numpy、base64、io、json、math
- 代码返回 {"png": base64_png, "svg": base64_svg}
- 字体配置：使用默认字体，避免中文以防止字体警告
coordinates 计算规则（必须返回精确的数值数组）对于函数 y = {{coef_a}}x + {{coef_b}}：
{
  "y_intercept": [0, {{coef_b}}],
  "x_intercept": [{{coef_a}}不为0时计算 -b/a，否则为0, 0]
}

重要提示：
1. coordinates 的值必须是数值数组如 [1.5, 0]，不能是字符串或描述
2. 线性函数只需要 y_intercept 和 x_intercept，不要生成其他字段
3. 确保所有坐标点都在函数 y={{coef_a}}x+{{coef_b}} 上
绘图要求：figsize=(8,6), dpi=150，包含网格、坐标轴、图例与关键点标注，标签和标题使用英文或避免中文，不要访问文件或网络。`;

export const FUNCTION_QUADRATIC_PROMPT = `你是一名数学出题与Python绘图助手，请生成二次函数 f(x)=ax^2+bx+c 的题目与可执行代码。
参数：a={{coef_a}}，b={{coef_b}}，c={{coef_c}}，定义域={{domain}}，难度{{difficulty}}
输出 JSON（question_text、python_code、coordinates），禁止 markdown 代码块。python_code 定义 generate_diagram()，仅允许导入 matplotlib、numpy、base64、io、json、math，返回 {"png":...,"svg":...}。字体配置：使用默认字体，避免中文以防止字体警告。
coordinates 计算规则（必须返回精确的数值数组，禁止描述性文字）：对于函数 y = {{coef_a}}x^2 + {{coef_b}}x + {{coef_c}}：
{
  "vertex": [ -b/(2a) 的数值, f(-b/(2a)) 的数值 ],
  "y_intercept": [0, {{coef_c}}],
  "zeros": 若判别式b^2-4ac >= 0，则返回 [[x1,0],[x2,0]]，否则 null
}

重要提示：
1. coordinates 的每个坐标必须是数值数组，如 [1.5, -2.25]，不能是字符串或公式描述。
2. vertex 顶点：x = -b/(2a)，y = a*x^2 + b*x + c，必须与函数数值一致。
3. zeros：使用求根公式，判别式<0 时返回 null；若存在，两个零点都必须满足 y=0。
4. 所有坐标必须在定义域 {{domain}} 内，如超出请调整为定义域内的可检验示例。
绘图要求：figsize=(8,6), dpi=150，标注顶点、对称轴、截距，标签和标题使用英文或避免中文，避免文件/网络访问。`;

// ============================================================================
// 统计类
// ============================================================================

export const STATISTICS_HISTOGRAM_PROMPT = `生成统计直方图题目与可执行代码。
参数：样本量={{sample_size}}，分布={{distribution}}，参数={{distribution_params}}，随机种子={{random_seed}}，难度{{difficulty}}
输出 JSON（question_text、python_code、coordinates），禁止 markdown。python_code 需要生成随机数据，绘制直方图，返回 {"png":...,"svg":...}，仅允许导入 matplotlib、numpy、random、base64、io、json。coordinates 可为空对象 {} 或包含关键统计量（如均值、标准差）。`;

export const STATISTICS_BAR_PROMPT = `生成分类条形图题目与可执行代码。
要求同上，绘制条形图（类别与频次），返回 JSON（question_text、python_code、coordinates）。必须保证 generate_diagram 返回 dict 且至少包含 png 字段（Base64），禁止返回字符串；svg 可选。仅允许导入 matplotlib、numpy、base64、io、json。`;

// ============================================================================
// 几何类
// ============================================================================

export const GEOMETRY_TRIANGLE_PROMPT = `生成三角形几何题目与可执行代码。
参数：shape_params={{shape_params}}，标注选项={{annotations}}，难度{{difficulty}}
输出 JSON（question_text、python_code、coordinates），禁止 markdown。python_code 使用 matplotlib 绘制三角形，标注顶点与边，返回{"png":...,"svg":...}，coordinates 包含顶点坐标，如 {"A":[0,0],"B":[3,0],"C":[1.5,2]}。`;

export const GEOMETRY_CIRCLE_PROMPT = `生成圆相关几何题目与可执行代码。
参数：shape_params={{shape_params}}（含半径/圆心），标注选项={{annotations}}，难度{{difficulty}}
输出 JSON（question_text、python_code、coordinates），禁止 markdown。python_code 绘制圆与关键点，返回 {"png":...,"svg":...}，coordinates 包含圆心与特征点。`;

// ============================================================================
// 模板生成
// ============================================================================

export function generatePrompt(
  templateName: string,
  parameters: GenerationParameters
): string {
  let template: string;

  switch (templateName) {
    case 'function_linear':
      template = FUNCTION_LINEAR_PROMPT;
      break;
    case 'function_quadratic':
      template = FUNCTION_QUADRATIC_PROMPT;
      break;
    case 'statistics_histogram':
      template = STATISTICS_HISTOGRAM_PROMPT;
      break;
    case 'statistics_bar':
      template = STATISTICS_BAR_PROMPT;
      break;
    case 'geometry_triangle':
      template = GEOMETRY_TRIANGLE_PROMPT;
      break;
    case 'geometry_circle':
      template = GEOMETRY_CIRCLE_PROMPT;
      break;
    default:
      throw new Error(`未知的模板 ${templateName}`);
  }

  return replaceTemplateVariables(template, parameters as any);
}

/**
 * 获取可用模板列表
 */
export function getAvailableTemplates(): Array<{
  name: string;
  displayName: string;
  questionType: string;
  diagramType: string;
  difficulty: string[];
}> {
  return [
    {
      name: 'function_linear',
      displayName: '线性函数（y = ax + b）',
      questionType: 'function',
      diagramType: 'linear',
      difficulty: ['easy', 'medium', 'hard'],
    },
    {
      name: 'function_quadratic',
      displayName: '二次函数（y = ax^2 + bx + c）',
      questionType: 'function',
      diagramType: 'quadratic',
      difficulty: ['easy', 'medium', 'hard'],
    },
    {
      name: 'statistics_histogram',
      displayName: '统计直方图',
      questionType: 'statistics',
      diagramType: 'histogram',
      difficulty: ['easy', 'medium', 'hard'],
    },
    {
      name: 'statistics_bar',
      displayName: '统计条形图',
      questionType: 'statistics',
      diagramType: 'bar',
      difficulty: ['easy', 'medium', 'hard'],
    },
    {
      name: 'geometry_triangle',
      displayName: '几何三角形',
      questionType: 'geometry',
      diagramType: 'triangle',
      difficulty: ['easy', 'medium', 'hard'],
    },
    {
      name: 'geometry_circle',
      displayName: '几何圆',
      questionType: 'geometry',
      diagramType: 'circle',
      difficulty: ['easy', 'medium', 'hard'],
    },
  ];
}

/**
 * 按题型图表类型获取提示模板
 */
export function getPromptTemplate(
  questionType: QuestionType,
  diagramType: DiagramType
): string | null {
  if (questionType === 'function') {
    if (diagramType === 'linear') return FUNCTION_LINEAR_PROMPT;
    if (diagramType === 'quadratic') return FUNCTION_QUADRATIC_PROMPT;
  }
  if (questionType === 'statistics') {
    if (diagramType === 'histogram') return STATISTICS_HISTOGRAM_PROMPT;
    if (diagramType === 'bar') return STATISTICS_BAR_PROMPT;
  }
  if (questionType === 'geometry') {
    if (diagramType === 'triangle') return GEOMETRY_TRIANGLE_PROMPT;
    if (diagramType === 'circle') return GEOMETRY_CIRCLE_PROMPT;
  }
  return null;
}
