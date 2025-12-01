# MVP快速开始指南 - 3周冲刺版

**目标**: 3周内上线AI题库MVP
**成本**: 月度¥100以内
**团队**: 1人全栈开发者
**技术栈**: Next.js 14 + Inngest + Qwen-VL-Max + Supabase

---

## 🚀 Day 0: 准备工作（今天完成）

### 1. 账号注册

#### Qwen-VL-Max API
```bash
1. 访问: https://dashscope.console.aliyun.com/
2. 注册阿里云账号
3. 开通DashScope服务
4. 获取API Key
5. 充值¥100（测试足够）
```

#### Inngest
```bash
1. 访问: https://www.inngest.com/
2. 注册账号（GitHub登录）
3. 创建项目: "rixin-question-bank"
4. 获取API Key
5. 免费层：100,000 steps/月（足够MVP）
```

### 2. 环境检查
```bash
cd d:\rixinwork\Rixindemo-codex-m1

# 确认版本
node --version   # 应该≥18
npm --version    # 应该≥9

# 确认Supabase运行
npx supabase status
# 应该看到: API URL: http://localhost:54321

# 确认R2配置
cat .env.local | grep R2
# 应该有: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
```

### 3. 创建分支
```bash
git checkout -b feature/ai-question-bank
git push -u origin feature/ai-question-bank
```

### 4. 安装依赖
```bash
npm install inngest@latest
npm install @alicloud/darabonba-openapi@latest
npm install zod@latest  # 如果还没有
```

### 5. 环境变量配置
```bash
# 编辑 .env.local
# 添加以下内容:

# Qwen-VL-Max
QWEN_API_KEY=sk-xxxxxxxxxxxxx
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# Inngest
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# Feature Flag
ENABLE_AI_QUESTION_BANK=true
```

---

## 📅 Week 1: 核心通路

### Day 1: 数据库设计

#### 任务清单
- [ ] 创建Migration文件
- [ ] 编写2个表的SQL
- [ ] 执行Migration
- [ ] 验证表结构

#### 执行步骤

**1. 创建Migration**
```bash
npx supabase migration new ai_question_bank_mvp
```

**2. 编辑Migration文件**
```bash
# 打开文件: supabase/migrations/[timestamp]_ai_question_bank_mvp.sql
# 复制以下内容:
```

```sql
-- ===== MVP数据库设计 =====
-- 仅2个核心表，快速启动

-- 1. 上传任务表
CREATE TABLE IF NOT EXISTS public.upload_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  total_questions INTEGER DEFAULT 0,
  error_message TEXT,
  trace_id UUID DEFAULT gen_random_uuid() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_upload_tasks_user_id ON public.upload_tasks(user_id);
CREATE INDEX idx_upload_tasks_status ON public.upload_tasks(status);
CREATE INDEX idx_upload_tasks_trace_id ON public.upload_tasks(trace_id);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_upload_tasks_updated_at
  BEFORE UPDATE ON public.upload_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS策略
ALTER TABLE public.upload_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upload tasks"
  ON public.upload_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upload tasks"
  ON public.upload_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own upload tasks"
  ON public.upload_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.upload_tasks IS 'AI题库上传任务表 - MVP版';

-- 2. 解析结果表
CREATE TABLE IF NOT EXISTS public.parsed_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_task_id UUID NOT NULL REFERENCES public.upload_tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('choice', 'fill', 'essay', 'solve')),
  content TEXT NOT NULL,
  options JSONB,
  answer TEXT,
  explanation TEXT,
  tags JSONB,  -- AI建议标签: [{ category: '知识点', value: '二次函数', confidence: 0.95 }]
  difficulty TEXT,
  confidence_score NUMERIC(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  has_image BOOLEAN DEFAULT FALSE,
  image_urls TEXT[],
  is_selected BOOLEAN DEFAULT TRUE,
  is_submitted BOOLEAN DEFAULT FALSE,
  source_page INTEGER,
  position_in_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 索引
CREATE INDEX idx_parsed_questions_task_id ON public.parsed_questions(upload_task_id);
CREATE INDEX idx_parsed_questions_submitted ON public.parsed_questions(is_submitted);
CREATE INDEX idx_parsed_questions_selected ON public.parsed_questions(is_selected) WHERE is_selected = true;

-- RLS策略
ALTER TABLE public.parsed_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parsed questions via task owner"
  ON public.parsed_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.upload_tasks t
      WHERE t.id = parsed_questions.upload_task_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert parsed questions"
  ON public.parsed_questions FOR INSERT
  WITH CHECK (true);  -- Inngest Worker用Service Role

CREATE POLICY "Users can update own parsed questions"
  ON public.parsed_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.upload_tasks t
      WHERE t.id = parsed_questions.upload_task_id
        AND t.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.parsed_questions IS 'AI解析的题目临时表 - MVP版';

-- 3. 批量入库RPC函数
CREATE OR REPLACE FUNCTION batch_submit_questions(
  p_task_id UUID,
  p_question_ids UUID[],
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 事务自动包装
  WITH inserted AS (
    INSERT INTO public.questions (type, content, options, answer, analysis_content, knowledge_points, difficulty, created_by)
    SELECT
      type,
      content,
      options,
      answer,
      explanation,
      ARRAY(SELECT jsonb_array_elements_text(tags->'knowledge_points')) as knowledge_points,
      COALESCE(difficulty, 'medium'),
      p_user_id
    FROM public.parsed_questions
    WHERE id = ANY(p_question_ids)
      AND upload_task_id = p_task_id
      AND is_submitted = false
    RETURNING id
  ),
  updated AS (
    UPDATE public.parsed_questions
    SET is_submitted = true
    WHERE id = ANY(p_question_ids)
    RETURNING id
  )
  SELECT jsonb_build_object(
    'inserted', (SELECT count(*) FROM inserted),
    'updated', (SELECT count(*) FROM updated)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 完成
```

**3. 执行Migration**
```bash
npx supabase db reset
npx supabase db diff  # 验证
```

**4. 验证**
```sql
-- 在Supabase Studio (http://localhost:54323) 执行:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('upload_tasks', 'parsed_questions');
-- 应该返回2行

SELECT * FROM upload_tasks LIMIT 1;
-- 应该返回0行（空表，正常）
```

#### 验收标准
✅ 2个表创建成功
✅ 索引就位
✅ RLS策略生效
✅ RPC函数可调用

---

### Day 2: 前端路由 + 上传组件

#### 任务清单
- [ ] 创建前端路由结构
- [ ] 移植FileUpload组件
- [ ] 集成主平台样式

#### 执行步骤

**1. 创建目录结构**
```bash
mkdir -p src/app/tools/ingest
mkdir -p src/components/ai-question-bank
mkdir -p src/lib/ai-question-bank
```

**2. 创建页面入口**
```typescript
// src/app/tools/ingest/page.tsx
import { Metadata } from 'next';
import FileUploadPage from '@/components/ai-question-bank/FileUploadPage';

export const metadata: Metadata = {
  title: 'AI题目解析 | 日新教学平台',
  description: '上传试卷图片，AI自动解析题目'
};

export default function IngestPage() {
  return <FileUploadPage />;
}
```

**3. 创建上传组件**

使用Cursor指令：
```
请帮我创建一个文件上传组件 src/components/ai-question-bank/FileUploadPage.tsx

要求:
1. 使用Next.js 14 App Router
2. 支持拖拽上传和点击选择
3. 文件类型限制: PDF, JPG, PNG
4. 文件大小限制: 20MB
5. 显示上传进度
6. 上传成功后显示taskId
7. 使用Tailwind CSS和shadcn/ui组件（如果有）

参考主平台的样式风格。
```

**4. 测试UI**
```bash
npm run dev
# 访问 http://localhost:3000/tools/ingest
# 应该看到上传界面
```

#### 验收标准
✅ 页面可访问
✅ 可选择文件
✅ 显示文件信息

---

### Day 3-4: 上传API + R2集成

#### 任务清单
- [ ] 创建Server Action
- [ ] 上传到R2
- [ ] 写入数据库

#### 执行步骤

**1. 创建Server Action**

```typescript
// src/lib/ai-question-bank/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { uploadFile } from '@/lib/storage';
import { revalidatePath } from 'next/cache';

export async function uploadQuestionFile(formData: FormData) {
  const supabase = createClient();

  // 1. 验证用户
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'UNAUTHORIZED', message: '请先登录' };
  }

  // 2. 获取文件
  const file = formData.get('file') as File;
  if (!file) {
    return { success: false, error: 'NO_FILE', message: '请选择文件' };
  }

  // 3. 文件验证
  const MAX_SIZE = 20 * 1024 * 1024; // 20MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

  if (file.size > MAX_SIZE) {
    return {
      success: false,
      error: 'FILE_TOO_LARGE',
      message: `文件过大，最大20MB`
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      error: 'INVALID_TYPE',
      message: '仅支持PDF、JPG、PNG格式'
    };
  }

  try {
    // 4. 上传到R2
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileKey = `ai-questions/raw/${user.id}/${Date.now()}-${file.name}`;

    const uploadResult = await uploadFile({
      file: fileBuffer,
      key: fileKey,
      accessLevel: 'PRIVATE',
      contentType: file.type
    });

    // 5. 创建任务记录
    const { data: task, error: dbError } = await supabase
      .from('upload_tasks')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_url: uploadResult.publicUrl || uploadResult.cdnUrl,
        file_size: file.size,
        mime_type: file.type,
        status: 'pending',
        trace_id: crypto.randomUUID()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return { success: false, error: 'DB_ERROR', message: '创建任务失败' };
    }

    // 6. TODO: 触发Inngest Worker（Day 5-6实现）
    // await inngest.send({
    //   name: 'pdf.uploaded',
    //   data: { taskId: task.id }
    // });

    revalidatePath('/tools/ingest');

    return {
      success: true,
      data: {
        taskId: task.id,
        fileName: task.file_name,
        status: task.status
      }
    };

  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'UPLOAD_FAILED', message: '上传失败' };
  }
}
```

**2. 前端调用**

```typescript
// src/components/ai-question-bank/FileUploadPage.tsx
'use client';

import { useState } from 'react';
import { uploadQuestionFile } from '@/lib/ai-question-bank/actions';

export default function FileUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadQuestionFile(formData);

    setUploading(false);

    if (result.success) {
      setTaskId(result.data.taskId);
      alert(`上传成功！任务ID: ${result.data.taskId}`);
    } else {
      alert(`上传失败: ${result.message}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">AI题目解析</h1>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          disabled={uploading}
          className="mb-4"
        />

        <p className="text-gray-600">
          {uploading ? '上传中...' : '选择PDF或图片文件'}
        </p>
      </div>

      {taskId && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800">
            上传成功！任务ID: {taskId}
          </p>
        </div>
      )}
    </div>
  );
}
```

**3. 测试**
```bash
npm run dev
# 访问 http://localhost:3000/tools/ingest
# 上传一个测试PDF
# 检查Supabase Studio中upload_tasks表
```

#### 验收标准
✅ 文件上传到R2成功
✅ upload_tasks表有记录
✅ 前端获取到taskId

---

### Day 5-6: Inngest集成

#### 任务清单
- [ ] 配置Inngest客户端
- [ ] 创建处理函数
- [ ] 触发测试

#### 执行步骤

**1. 创建Inngest客户端**

```typescript
// inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'rixin-question-bank',
  eventKey: process.env.INNGEST_EVENT_KEY
});
```

**2. 创建处理函数（暂时Mock）**

```typescript
// inngest/functions.ts
import { inngest } from './client';

export const processPdfUpload = inngest.createFunction(
  { id: 'process-pdf-upload' },
  { event: 'pdf.uploaded' },
  async ({ event, step }) => {
    const { taskId } = event.data;

    // Step 1: 更新状态为processing
    await step.run('update-status-processing', async () => {
      console.log(`Processing task ${taskId}...`);
      // TODO: Update database status='processing'
    });

    // Step 2: 下载文件（暂时跳过）
    await step.sleep('wait-mock', '2s');

    // Step 3: AI解析（暂时Mock）
    const mockQuestions = await step.run('parse-questions', async () => {
      return [
        {
          type: 'choice',
          content: '测试题目',
          options: ['A. 选项1', 'B. 选项2'],
          answer: 'A',
          confidence: 0.9
        }
      ];
    });

    // Step 4: 保存结果
    await step.run('save-results', async () => {
      console.log(`Saved ${mockQuestions.length} questions`);
      // TODO: Insert into parsed_questions
    });

    // Step 5: 更新状态为completed
    await step.run('update-status-completed', async () => {
      console.log(`Task ${taskId} completed`);
      // TODO: Update database status='completed'
    });

    return { success: true, questionsCount: mockQuestions.length };
  }
);
```

**3. 创建API路由**

```typescript
// src/app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { processPdfUpload } from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processPdfUpload]
});
```

**4. 触发事件**

修改Day 3-4的上传Action：

```typescript
// src/lib/ai-question-bank/actions.ts
import { inngest } from '@/inngest/client';

// 在上传成功后添加:
await inngest.send({
  name: 'pdf.uploaded',
  data: { taskId: task.id }
});
```

**5. 本地测试**

```bash
# 终端1: 启动Dev Server
npm run dev

# 终端2: 启动Inngest Dev Server
npx inngest-cli@latest dev

# 上传文件，查看Inngest Dashboard
# http://localhost:8288
```

#### 验收标准
✅ Inngest Dashboard可见函数
✅ 上传触发事件成功
✅ Console显示Mock处理日志

---

### Day 7: 前端轮询

#### 任务清单
- [ ] 创建任务查询API
- [ ] 前端实现轮询
- [ ] 显示实时进度

#### 执行步骤

**1. 创建查询Action**

```typescript
// src/lib/ai-question-bank/actions.ts
export async function getTaskStatus(taskId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('upload_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) {
    return { success: false, error: 'NOT_FOUND' };
  }

  return { success: true, data };
}
```

**2. 前端轮询**

```typescript
// src/components/ai-question-bank/TaskStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import { getTaskStatus } from '@/lib/ai-question-bank/actions';

export default function TaskStatus({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getTaskStatus(taskId);
      if (result.success) {
        setTask(result.data);

        // 如果完成或失败，停止轮询
        if (result.data.status === 'completed' || result.data.status === 'failed') {
          clearInterval(interval);
        }
      }
    }, 2000); // 每2秒轮询一次

    return () => clearInterval(interval);
  }, [taskId]);

  if (!task) return <div>加载中...</div>;

  return (
    <div className="border p-4 rounded">
      <h3 className="font-bold">任务状态</h3>
      <p>文件: {task.file_name}</p>
      <p>状态: {task.status}</p>
      <p>进度: {task.progress}%</p>

      {task.status === 'completed' && (
        <p className="text-green-600">解析完成！共{task.total_questions}道题</p>
      )}

      {task.status === 'failed' && (
        <p className="text-red-600">解析失败: {task.error_message}</p>
      )}
    </div>
  );
}
```

#### 验收标准
✅ 上传后自动显示进度
✅ 状态实时更新
✅ 完成后停止轮询

---

## 📅 Week 2: AI引擎（关键周）

### Day 8-9: Qwen-VL集成

#### 执行步骤

**1. 创建AI客户端**

```typescript
// src/lib/ai-question-bank/qwen-vl.ts
interface QwenMessage {
  role: 'system' | 'user';
  content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

export async function parseQuestions(imageBase64: string): Promise<any[]> {
  const apiKey = process.env.QWEN_API_KEY;
  const apiUrl = process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  const messages: QwenMessage[] = [
    {
      role: 'system',
      content: [{ type: 'text', text: '你是一位初中数学题目识别专家。' }]
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `请分析以下图片，提取题目信息。严格按照JSON格式输出：
{
  "questions": [
    {
      "type": "choice|fill|essay",
      "content": "题干文本（LaTeX格式数学公式）",
      "options": ["A. ...", "B. ..."],
      "answer": "参考答案",
      "confidence": 0.95
    }
  ]
}`
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
        }
      ]
    }
  ];

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen-vl-max-latest',
      messages,
      temperature: 0.1,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    throw new Error(`Qwen API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // 解析JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Qwen response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.questions || [];
}
```

**2. 单元测试**

创建测试文件 `tests/qwen-vl.test.ts`（手动运行）

#### 验收标准
✅ 可成功调用Qwen-VL API
✅ 返回结构化JSON

---

### Day 10-12: Prompt工程（最关键！）

这是整个项目成败的关键3天。

#### 任务
反复测试和优化Prompt，直到准确率≥85%

#### 测试数据集
准备100道真实题目图片：
- 30道选择题
- 30道填空题
- 30道解答题
- 10道复杂题（含图形/公式）

#### 优化Prompt示例
```typescript
const SYSTEM_PROMPT = `你是一位专业的初中数学题目识别专家，擅长OCR和题目结构化。

规则:
1. 准确识别题号（如"1."、"一、"、"（1）"等）
2. 区分题型：
   - choice: 有ABCD选项
   - fill: 有下划线或"____"
   - essay: 需要写解答过程
3. LaTeX格式：
   - 分数: \\frac{1}{2}
   - 根号: \\sqrt{2}
   - 次方: x^{2}
4. 置信度评估：
   - 0.95+: 非常清晰
   - 0.80-0.95: 较清晰
   - <0.80: 需要人工复核

输出格式（严格JSON）:
{
  "questions": [
    {
      "number": "1",
      "type": "choice",
      "content": "已知函数 $y = 2x^2 - 4x + 1$，求顶点坐标？",
      "options": ["A. (1, -1)", "B. (2, 1)"],
      "answer": "A",
      "confidence": 0.95
    }
  ]
}`;
```

#### 验收标准
✅ 100道题中，准确率≥85%
✅ JSON格式稳定
✅ 置信度合理

---

### Day 13-14: Worker完整实现

#### 执行步骤

**1. 更新Inngest函数**

```typescript
// inngest/functions.ts
import { createClient } from '@supabase/supabase-js';
import { parseQuestions } from '@/lib/ai-question-bank/qwen-vl';

export const processPdfUpload = inngest.createFunction(
  { id: 'process-pdf-upload', retries: 3 },
  { event: 'pdf.uploaded' },
  async ({ event, step }) => {
    const { taskId } = event.data;

    // 使用Service Role Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: 获取任务
    const { data: task } = await step.run('get-task', async () => {
      const { data } = await supabase
        .from('upload_tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      return data;
    });

    if (!task) throw new Error('Task not found');

    // Step 2: 更新状态
    await step.run('update-processing', async () => {
      await supabase
        .from('upload_tasks')
        .update({ status: 'processing', progress: 10 })
        .eq('id', taskId);
    });

    // Step 3: 下载文件
    const fileBuffer = await step.run('download-file', async () => {
      const response = await fetch(task.file_url);
      return await response.arrayBuffer();
    });

    // Step 4: 转换为Base64
    const imageBase64 = await step.run('convert-base64', async () => {
      return Buffer.from(fileBuffer).toString('base64');
    });

    // Step 5: 调用Qwen-VL
    const questions = await step.run('parse-with-qwen', async () => {
      return await parseQuestions(imageBase64);
    });

    // Step 6: 保存结果
    await step.run('save-parsed-questions', async () => {
      const records = questions.map((q: any) => ({
        upload_task_id: taskId,
        type: q.type,
        content: q.content,
        options: q.options,
        answer: q.answer,
        confidence_score: q.confidence,
        tags: { ai_generated: true }
      }));

      await supabase.from('parsed_questions').insert(records);
    });

    // Step 7: 更新完成
    await step.run('update-completed', async () => {
      await supabase
        .from('upload_tasks')
        .update({
          status: 'completed',
          progress: 100,
          total_questions: questions.length,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
    });

    return { success: true, questionsCount: questions.length };
  }
);
```

#### 验收标准
✅ 上传文件后自动解析
✅ parsed_questions表有数据
✅ 任务状态正确更新

---

## 📅 Week 3: 入库与测试

### Day 15-17: QuestionEditor

使用Cursor快速移植组件。

#### Cursor指令
```
请帮我创建一个题目编辑器组件 src/components/ai-question-bank/QuestionEditor.tsx

要求:
1. 读取parsed_questions表数据
2. 显示所有字段（类型、题干、选项、答案、标签、置信度）
3. 可编辑所有字段
4. 低置信度（<0.8）的题目标红提示
5. 支持批量选择
6. 使用React Hook Form + Zod验证
7. 参考主平台的UI风格

数据结构参考:
type ParsedQuestion = {
  id: string;
  type: 'choice' | 'fill' | 'essay';
  content: string;
  options?: string[];
  answer: string;
  confidence_score: number;
  tags: any;
}
```

#### 验收标准
✅ 可编辑所有字段
✅ 低置信度题目有提示
✅ UI美观易用

---

### Day 18-19: 批量入库

#### 执行步骤

**1. 创建提交Action**

```typescript
// src/lib/ai-question-bank/actions.ts
export async function submitQuestions(taskId: string, questionIds: string[]) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  // 调用RPC函数（事务保护）
  const { data, error } = await supabase
    .rpc('batch_submit_questions', {
      p_task_id: taskId,
      p_question_ids: questionIds,
      p_user_id: user.id
    });

  if (error) {
    console.error('Submit error:', error);
    return { success: false, error: 'SUBMIT_FAILED' };
  }

  revalidatePath('/questions');
  return { success: true, data };
}
```

**2. 前端调用**

```typescript
// QuestionEditor中
async function handleSubmit() {
  const selectedIds = questions
    .filter(q => q.isSelected)
    .map(q => q.id);

  const result = await submitQuestions(taskId, selectedIds);

  if (result.success) {
    alert(`成功提交${result.data.inserted}道题目！`);
    router.push('/questions'); // 跳转到主平台题库
  } else {
    alert('提交失败');
  }
}
```

#### 验收标准
✅ 批量提交成功
✅ questions表有数据
✅ 主平台题库页面可见

---

### Day 20-21: 测试与优化

#### E2E测试清单
- [ ] 上传PDF
- [ ] 等待解析完成
- [ ] 查看解析结果
- [ ] 编辑题目
- [ ] 批量提交
- [ ] 在题库中查看

#### 内测
邀请5位教师试用，收集反馈。

#### 验收标准
✅ 完整流程通过
✅ 解析准确率≥85%
✅ 无严重Bug

---

## ✅ 最终检查清单

### 功能完整性
- [ ] 可上传PDF/图片
- [ ] 自动AI解析
- [ ] 可编辑结果
- [ ] 可批量入库
- [ ] 主平台可见

### 性能指标
- [ ] 解析速度：1页≤30秒
- [ ] 准确率：≥85%
- [ ] 无内存泄漏

### 成本控制
- [ ] 月度AI成本≤¥100
- [ ] 配额限制生效
- [ ] 成本监控就位

### 安全性
- [ ] RLS策略生效
- [ ] 文件上传大小限制
- [ ] 用户只能看自己的任务

---

## 🎉 上线

恭喜！你已经完成了MVP开发。

### 下一步
1. Beta测试（10-20位教师）
2. 收集反馈
3. 迭代优化
4. 准备V2.0功能：
   - 成本追踪（添加provider_usage_logs表）
   - 配额管理（添加tenant_quotas表）
   - 多图支持（添加question_images表）

---

**祝你成功！🚀**

如有问题，参考[终极综合优化方案v3.0.md](./AI题库系统-终极综合优化方案v3.0.md)
