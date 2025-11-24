# 数据库设计文档

## 概述

数学题目录入工具的数据库设计，支持题目管理、标签系统、文件存储和用户操作记录。

## 数据表结构

### 1. questions (题目表)

存储所有题目的核心信息。

\`\`\`sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('choice', 'fill', 'solve')),
  content TEXT NOT NULL,
  options JSONB, -- 选择题选项，格式: ["A. 选项1", "B. 选项2", ...]
  answer TEXT NOT NULL,
  explanation TEXT, -- 题目解析
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
  source VARCHAR(100), -- 题目来源
  year INTEGER, -- 年份
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE, -- 软删除
  
  -- 索引
  INDEX idx_questions_type (type),
  INDEX idx_questions_difficulty (difficulty),
  INDEX idx_questions_created_by (created_by),
  INDEX idx_questions_created_at (created_at)
);
\`\`\`

### 2. question_tags (题目标签关联表)

多对多关系，一个题目可以有多个标签。

\`\`\`sql
CREATE TABLE question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束，防止重复标签
  UNIQUE(question_id, tag_id),
  
  -- 索引
  INDEX idx_question_tags_question (question_id),
  INDEX idx_question_tags_tag (tag_id)
);
\`\`\`

### 3. tags (标签表)

存储所有标签信息。

\`\`\`sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL, -- 标签分类: knowledge, difficulty, grade, source, custom
  value VARCHAR(100) NOT NULL,
  description TEXT,
  usage_count INTEGER DEFAULT 0, -- 使用次数，用于排序常用标签
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束
  UNIQUE(category, value),
  
  -- 索引
  INDEX idx_tags_category (category),
  INDEX idx_tags_usage_count (usage_count DESC)
);
\`\`\`

### 4. question_images (题目图片表)

存储题目相关的图片信息。

\`\`\`sql
CREATE TABLE question_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL, -- 图片存储URL
  file_name VARCHAR(255),
  file_size INTEGER, -- 文件大小（字节）
  mime_type VARCHAR(50),
  position INTEGER DEFAULT 0, -- 图片在题目中的位置顺序
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 索引
  INDEX idx_question_images_question (question_id)
);
\`\`\`

### 5. upload_tasks (上传任务表)

记录文件上传和解析任务。

\`\`\`sql
CREATE TABLE upload_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(50),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0, -- 解析进度 0-100
  total_questions INTEGER DEFAULT 0, -- 解析出的题目总数
  error_message TEXT, -- 错误信息
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- 索引
  INDEX idx_upload_tasks_user (user_id),
  INDEX idx_upload_tasks_status (status),
  INDEX idx_upload_tasks_created_at (created_at DESC)
);
\`\`\`

### 6. parsed_questions (解析题目临时表)

存储解析后但未正式收录的题目。

\`\`\`sql
CREATE TABLE parsed_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_task_id UUID NOT NULL REFERENCES upload_tasks(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  options JSONB,
  answer TEXT,
  confidence_score DECIMAL(3,2), -- AI解析置信度 0.00-1.00
  is_selected BOOLEAN DEFAULT true, -- 是否被用户选中
  is_submitted BOOLEAN DEFAULT false, -- 是否已提交到正式题库
  question_id UUID REFERENCES questions(id), -- 提交后关联的正式题目ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 索引
  INDEX idx_parsed_questions_task (upload_task_id),
  INDEX idx_parsed_questions_submitted (is_submitted)
);
\`\`\`

### 7. users (用户表)

基础用户信息（如果需要独立用户系统）。

\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'teacher',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

## 数据关系图

\`\`\`
users (1) ----< (N) questions
users (1) ----< (N) upload_tasks

questions (1) ----< (N) question_images
questions (1) ----< (N) question_tags
tags (1) ----< (N) question_tags

upload_tasks (1) ----< (N) parsed_questions
parsed_questions (N) ----> (1) questions [optional]
\`\`\`

## 索引策略

1. **主键索引**: 所有表的 `id` 字段自动创建主键索引
2. **外键索引**: 所有外键字段创建索引，优化关联查询
3. **查询索引**: 
   - questions 表的 type, difficulty, created_at 用于筛选和排序
   - tags 表的 category, usage_count 用于标签分类和热门排序
   - upload_tasks 表的 status, created_at 用于任务列表查询

## 数据完整性

1. **级联删除**: 
   - 删除题目时自动删除关联的标签关系和图片
   - 删除上传任务时自动删除关联的解析题目
   
2. **软删除**: 
   - questions 表使用 deleted_at 字段实现软删除
   - 保留历史数据，支持恢复功能

3. **唯一约束**:
   - question_tags 防止重复标签
   - tags 防止同类别同值的重复标签

## 性能优化建议

1. 对于大量题目的查询，使用分页和游标分页
2. 标签查询使用 JSONB 聚合或物化视图
3. 图片URL使用CDN加速
4. 定期清理已完成的上传任务和解析数据
