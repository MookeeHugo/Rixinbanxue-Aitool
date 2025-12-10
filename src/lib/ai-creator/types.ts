/**
 * AI数学题创作系统 - TypeScript类型定义
 *
 * 包含所有核心接口和类型定义：
 * - 数据库表类型
 * - API请求/响应类型
 * - 验证结果类型
 * - 监控指标类型
 */

// ============================================================================
// 枚举类型
// ============================================================================

/**
 * 题目类型
 */
export enum QuestionType {
  /** 函数图像 */
  FUNCTION = 'function',
  /** 统计图表 */
  STATISTICS = 'statistics',
  /** 几何图形 */
  GEOMETRY = 'geometry',
}

/**
 * 图表类型
 */
export enum DiagramType {
  // 函数图像
  LINEAR = 'linear',
  QUADRATIC = 'quadratic',
  CUBIC = 'cubic',
  TRIGONOMETRIC = 'trigonometric',
  EXPONENTIAL = 'exponential',
  LOGARITHMIC = 'logarithmic',

  // 统计图表
  HISTOGRAM = 'histogram',
  BAR_CHART = 'bar',
  SCATTER = 'scatter',
  LINE_CHART = 'line',
  PIE_CHART = 'pie',
  BOX_PLOT = 'box',

  // 几何图形
  TRIANGLE = 'triangle',
  QUADRILATERAL = 'quadrilateral',
  CIRCLE = 'circle',
  POLYGON = 'polygon',
  SOLID_GEOMETRY = 'solid',
}

/**
 * 难度级别
 */
export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

/**
 * 生成状态
 */
export enum GenerationStatus {
  /** 等待中 */
  PENDING = 'pending',
  /** 生成中 */
  GENERATING = 'generating',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 失败 */
  FAILED = 'failed',
}

/**
 * 操作类型（审计日志）
 */
export enum ActionType {
  /** 生成新题 */
  GENERATE = 'generate',
  /** 重新生成 */
  REGENERATE = 'regenerate',
  /** 改编题目 */
  ADAPT = 'adapt',
  /** 提交到题库 */
  SUBMIT = 'submit',
  /** 回滚配额 */
  ROLLBACK = 'rollback',
  /** 重试 */
  RETRY = 'retry',
  /** 审核通过 */
  AUDIT_APPROVE = 'audit_approve',
  /** 审核拒绝 */
  AUDIT_REJECT = 'audit_reject',
}

/**
 * 操作状态
 */
export enum ActionStatus {
  /** 成功 */
  SUCCESS = 'success',
  /** 失败 */
  FAILED = 'failed',
  /** 超时 */
  TIMEOUT = 'timeout',
  /** 安全拦截 */
  SECURITY_BLOCKED = 'security_blocked',
}

// ============================================================================
// 数据库表类型
// ============================================================================

/**
 * AI创作题目（数据库表）
 */
export interface AICreatedQuestion {
  id: string;
  user_id: string;

  // 题目内容
  question_text: string;
  question_type: QuestionType;
  diagram_type: DiagramType | null;
  difficulty: Difficulty;

  // AI生成的代码
  python_code: string;
  generation_parameters: Record<string, any>;

  // 图像输出
  image_url: string | null;
  image_key: string | null;
  svg_url: string | null;
  svg_key: string | null;

  // 坐标数据
  coordinate_data: Record<string, [number, number]> | null;

  // 改编链路
  parent_question_id: string | null;
  adaptation_metadata: AdaptationMetadata | null;
  version: number;

  // 生成状态
  generation_status: GenerationStatus;
  error_message: string | null;
  validation_result: ValidationResult | null;

  // 提交到主题库
  submitted_to_library: boolean;
  library_question_id: string | null;
  submitted_at: string | null;

  // 成本追踪
  deepseek_tokens_used: number;
  e2b_execution_seconds: number;
  estimated_cost_usd: number;

  // 时间戳
  created_at: string;
  updated_at: string;
}

/**
 * 用户配额（数据库表）
 */
export interface UserQuota {
  user_id: string;

  // 日配额管理
  daily_limit: number;
  daily_used: number;
  last_reset_date: string;

  // 并发与速率限制
  concurrent_limit: number;
  rate_limit_per_minute: number;

  // 重试策略
  retry_deduct_quota: boolean;
  failed_count_today: number;

  // 统计信息
  total_generated: number;
  total_cost_usd: number;

  // 时间戳
  created_at: string;
  updated_at: string;
}

/**
 * 模板（数据库表）
 */
export interface CreationTemplate {
  id: string;

  // 模板信息
  template_name: string;
  question_type: QuestionType;
  diagram_type: DiagramType;

  // 提示词模板
  prompt_template: string;

  // 参数定义
  parameter_schema: Record<string, any>; // JSON Schema
  default_parameters: Record<string, any> | null;

  // 验证规则
  validation_rules: Record<string, any> | null;

  // 元数据
  description: string | null;
  difficulty: Difficulty | null;
  is_active: boolean;

  // 统计信息
  usage_count: number;
  success_rate: number | null;

  // 时间戳
  created_at: string;
  updated_at: string;
}

/**
 * 审计日志（数据库表）
 */
export interface AuditLog {
  id: string;

  // 用户与操作
  user_id: string;
  action: ActionType;

  // 关联题目
  question_id: string | null;

  // 操作参数
  parameters: Record<string, any> | null;

  // 结果状态
  status: ActionStatus;
  error_message: string | null;

  // 性能指标
  execution_time_ms: number | null;
  deepseek_latency_ms: number | null;
  e2b_execution_ms: number | null;
  validation_ms: number | null;

  // 成本追踪
  quota_deducted: boolean;
  tokens_used: number | null;
  cost_usd: number | null;

  // 时间戳
  created_at: string;
}

// ============================================================================
// 业务逻辑类型
// ============================================================================

/**
 * 改编元数据
 */
export interface AdaptationMetadata {
  /** 修改的参数列表 */
  changed_parameters: string[];
  /** 参数差异详情 */
  parameter_diff: Record<string, {
    old: any;
    new: any;
  }>;
  /** 是否保持拓扑结构 */
  topology_preserved: boolean;
  /** 视觉相似度（0-1） */
  visual_similarity: number | null;
}

/**
 * 坐标点
 */
export type Coordinate = [number, number];

/**
 * 坐标数据集合
 */
export interface CoordinateData {
  [label: string]: Coordinate;
}

/**
 * 生成参数（通用）
 */
export interface GenerationParameters {
  question_type: QuestionType;
  diagram_type: DiagramType;
  difficulty: Difficulty;
  [key: string]: any; // 其他自定义参数
}

/**
 * 函数题参数
 */
export interface FunctionParameters extends GenerationParameters {
  question_type: QuestionType.FUNCTION;
  // 系数
  coefficients: Record<string, number>; // {a: 2, b: 3, c: 0}
  // 定义域
  domain: [number, number];
  // 值域（可选）
  range?: [number, number];
}

/**
 * 统计题参数
 */
export interface StatisticsParameters extends GenerationParameters {
  question_type: QuestionType.STATISTICS;
  // 样本量
  sample_size: number;
  // 数据分布
  distribution: 'normal' | 'uniform' | 'poisson' | 'binomial';
  // 分布参数
  distribution_params: Record<string, number>;
  // 随机种子
  random_seed: number;
}

/**
 * 几何题参数
 */
export interface GeometryParameters extends GenerationParameters {
  question_type: QuestionType.GEOMETRY;
  // 图形参数
  shape_params: Record<string, number>; // {side_a: 3, side_b: 4, angle: 90}
  // 标注选项
  annotations: {
    vertices: boolean;
    edges: boolean;
    angles: boolean;
    auxiliary_lines: boolean;
  };
}

// ============================================================================
// API请求/响应类型
// ============================================================================

/**
 * 生成数学题请求
 */
export interface GenerateMathQuestionRequest {
  template_name?: string; // 可选：使用预设模板
  question_type: QuestionType;
  diagram_type: DiagramType;
  difficulty: Difficulty;
  parameters: Record<string, any>;
}

/**
 * 生成数学题响应
 */
export interface GenerateMathQuestionResponse {
  success: boolean;
  question_id?: string;
  question?: AICreatedQuestion;
  error?: string;
  remaining_quota?: number;
}

/**
 * 改编数学题请求
 */
export interface AdaptMathQuestionRequest {
  parent_question_id: string;
  parameter_overrides: Record<string, any>;
}

/**
 * 改编数学题响应
 */
export interface AdaptMathQuestionResponse {
  success: boolean;
  question_id?: string;
  question?: AICreatedQuestion;
  error?: string;
}

/**
 * 检查配额请求
 */
export interface CheckQuotaRequest {
  user_id: string;
}

/**
 * 检查配额响应
 */
export interface CheckQuotaResponse {
  can_create: boolean;
  remaining: number;
  reason: string | null;
  quota: UserQuota;
}

/**
 * 提交到题库请求
 */
export interface SubmitToLibraryRequest {
  question_id: string;
}

/**
 * 提交到题库响应
 */
export interface SubmitToLibraryResponse {
  success: boolean;
  library_question_id?: string;
  error?: string;
}

// ============================================================================
// DeepSeek API类型
// ============================================================================

/**
 * DeepSeek聊天消息
 */
export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * DeepSeek API请求
 */
export interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

/**
 * DeepSeek API响应
 */
export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: DeepSeekMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * DeepSeek生成结果（解析后）
 */
export interface DeepSeekGenerationResult {
  question_text: string;
  python_code: string;
  coordinates: CoordinateData;
}

// ============================================================================
// E2B Sandbox类型
// ============================================================================

/**
 * E2B执行结果
 */
export interface E2BExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
  execution_time_ms: number;
  // 解析后的图像数据
  png_base64?: string;
  svg_base64?: string;
  error?: string;
}

/**
 * E2B沙箱配置
 */
export interface E2BSandboxConfig {
  template?: string;
  timeout_ms: number;
  cpu_limit: number;
  memory_limit_mb: number;
  disk_limit_mb: number;
}

// ============================================================================
// 验证类型
// ============================================================================

/**
 * 验证结果
 */
export interface ValidationResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  layers: LayerValidationResult[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  layer: string;
  message: string;
  critical: boolean;
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  layer: string;
  message: string;
}

/**
 * 单层验证结果
 */
export interface LayerValidationResult {
  layer: string; // 'syntax' | 'security' | 'execution' | ...
  passed: boolean;
  error?: string;
  warning?: string;
  critical: boolean;
}

/**
 * 安全检查结果
 */
export interface SecurityCheckResult {
  safe: boolean;
  reason?: string;
  blocked_patterns?: string[];
}

/**
 * 图像质量检查结果
 */
export interface ImageQualityResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    width: number;
    height: number;
    file_size: number;
    format: string;
  };
}

// ============================================================================
// 存储类型
// ============================================================================

/**
 * 图像元数据
 */
export interface ImageMetadata {
  user_id: string;
  question_id: string;
  question_type: QuestionType;
  diagram_type: DiagramType;
}

/**
 * 存储结果
 */
export interface StorageResult {
  png_url: string;
  png_key: string;
  svg_url: string | null;
  svg_key: string | null;
}

// ============================================================================
// 监控指标类型
// ============================================================================

/**
 * 生成指标
 */
export interface GenerationMetrics {
  // 性能指标
  generation_latency_ms: number;
  deepseek_latency_ms: number;
  e2b_execution_ms: number;
  validation_ms: number;
  total_latency_ms: number;

  // 成功率指标
  success_rate_1h: number;
  failure_rate_1h: number;
  timeout_rate_1h: number;
  security_block_rate_1h: number;

  // 成本指标
  deepseek_tokens_used: number;
  e2b_execution_seconds: number;
  estimated_cost_usd: number;

  // 质量指标
  validation_pass_rate: number;
  avg_image_size_kb: number;
  avg_retry_count: number;
}

/**
 * 告警规则
 */
export interface AlertRule {
  name: string;
  condition: (metrics: GenerationMetrics) => boolean;
  severity: 'info' | 'warning' | 'critical';
  cooldown_minutes: number;
}

/**
 * 告警详情
 */
export interface AlertDetails {
  severity: 'info' | 'warning' | 'critical';
  metrics: GenerationMetrics;
  timestamp: string;
}

// ============================================================================
// 结构化日志类型
// ============================================================================

/**
 * 结构化日志
 */
export interface StructuredLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  service: 'ai-question-generation';
  event: string;
  question_id?: string;
  user_id?: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

// ============================================================================
// 题目改编链路类型
// ============================================================================

/**
 * 题目链路
 */
export interface QuestionLineage {
  question_id: string;
  parent_chain: Array<{
    id: string;
    question_type: QuestionType;
    difficulty: Difficulty;
    version: number;
    created_at: string;
  }>;
  children: Array<{
    id: string;
    question_type: QuestionType;
    difficulty: Difficulty;
    version: number;
    created_at: string;
  }>;
  depth: number;
}

// ============================================================================
// 工具函数类型守卫
// ============================================================================

/**
 * 检查是否为函数参数
 */
export function isFunctionParameters(
  params: GenerationParameters
): params is FunctionParameters {
  return params.question_type === QuestionType.FUNCTION;
}

/**
 * 检查是否为统计参数
 */
export function isStatisticsParameters(
  params: GenerationParameters
): params is StatisticsParameters {
  return params.question_type === QuestionType.STATISTICS;
}

/**
 * 检查是否为几何参数
 */
export function isGeometryParameters(
  params: GenerationParameters
): params is GeometryParameters {
  return params.question_type === QuestionType.GEOMETRY;
}
