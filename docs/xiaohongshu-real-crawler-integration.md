# 小红书真实爬虫集成指南

## 📋 概述

本文档记录从模拟数据模式切换到真实爬虫模式的完整过程。

---

## ✅ 第一步：取消模拟数据模式

### 修改环境变量

在 `.env.local` 文件中设置：

```bash
# 小红书爬虫配置
NEXT_PUBLIC_XHS_MOCK_MODE=false  # 改为 false 启用真实爬虫
```

### 验证方式

运行以下命令验证环境变量：

```bash
# 检查当前环境变量
echo %NEXT_PUBLIC_XHS_MOCK_MODE%  # Windows
echo $NEXT_PUBLIC_XHS_MOCK_MODE   # Linux/Mac
```

---

## 🔧 第二步：集成真实爬虫功能

### 已验证的爬虫功能

基于 `scripts/crawl-batch-posts.ts` 的成功实现，以下功能已验证：

#### ✅ Cookie认证
- 自动保存/加载cookies
- 有效期检测
- 文件位置：`test-reports/xiaohongshu-cookies.json`

#### ✅ 反爬虫对策
- User-Agent伪装
- 反检测脚本注入
- 鼠标移动模拟
- 随机延迟（2-5秒）

#### ✅ 数据提取
- 标题、作者、内容
- 点赞、收藏、评论数
- 图片链接（最多9张）
- 标签（去重+过滤）
- 发布时间

#### ✅ 批量抓取
- 目标导向（可配置数量）
- 智能重试（自动跳过404）
- 成功率统计
- 进度显示

### 测试数据

最新批量抓取结果：
- 成功抓取：**10个帖子**
- 尝试链接：26个
- 成功率：**38%**
- 平均图片：2.1张/帖
- 平均标签：6.9个/帖

---

## 📊 第三步：数据库表结构更新

### 当前表结构（xhs_raw_posts）

需要确保数据库表包含以下字段：

```sql
CREATE TABLE xhs_raw_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- 帖子基本信息
  post_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  author_id TEXT,
  author_name TEXT,

  -- 互动数据
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  collects INTEGER DEFAULT 0,  -- ⭐ 新增：收藏数

  -- 媒体和标签
  images TEXT[],
  tags TEXT[],
  category TEXT,

  -- 元数据
  publish_time TEXT,           -- ⭐ 新增：发布时间
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, post_id)
);
```

### 需要添加的字段

```sql
-- 添加收藏数字段
ALTER TABLE xhs_raw_posts ADD COLUMN IF NOT EXISTS collects INTEGER DEFAULT 0;

-- 添加发布时间字段
ALTER TABLE xhs_raw_posts ADD COLUMN IF NOT EXISTS publish_time TEXT;
```

---

## 🔌 第四步：集成到PlaywrightCrawler

### 修改文件

`src/lib/xiaohongshu-crawler/playwright-client.ts`

### 关键集成点

1. **Cookie管理**
   ```typescript
   // 读取cookies
   const cookiesFile = 'test-reports/xiaohongshu-cookies.json';
   const cookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf-8'));
   await this.context.addCookies(cookies);
   ```

2. **数据提取选择器**
   ```typescript
   // 使用经过验证的选择器
   const titleSelectors = [
     '#detail-title',
     'span[class*="title"]',
     'div[class*="title"] span'
   ];
   ```

3. **重试逻辑**
   ```typescript
   // 检测404和重定向
   if (url.includes('/404') || url.includes('/explore?')) {
     console.log('被重定向，跳过');
     continue;
   }
   ```

4. **行为模拟**
   ```typescript
   // 鼠标移动
   await page.mouse.move(500, 300);
   await page.waitForTimeout(500);

   // 页面滚动
   await page.evaluate(() => window.scrollTo(0, 300));

   // 随机延迟
   const delay = 2000 + Math.random() * 3000;
   await page.waitForTimeout(delay);
   ```

---

## ✅ 第五步：测试流程

### 5.1 Cookie准备

```bash
# 运行cookie保存脚本
pnpm exec tsx scripts/save-cookies-auto.ts
```

手动登录小红书，等待60秒后自动保存。

### 5.2 Cookie验证

```bash
# 验证cookies有效性
pnpm exec tsx scripts/check-cookies-validity.ts
```

### 5.3 单帖测试

```bash
# 测试单个帖子抓取
pnpm exec tsx scripts/crawl-real-post-v3.ts
```

### 5.4 批量测试

```bash
# 测试批量抓取
pnpm exec tsx scripts/crawl-batch-posts.ts
```

### 5.5 集成测试

在小红书界面中：
1. 登录系统
2. 进入小红书AI运营
3. 输入关键词（如"数学学习"）
4. 点击"爬取帖子"
5. 验证返回的是真实数据，而不是模拟数据

---

## 🎯 第六步：数据验证

### 检查点

- [ ] 返回的帖子是真实的小红书数据
- [ ] 标题不是"【关键词】初中数学必考知识点总结"等模拟数据
- [ ] 点赞数是真实数字（不是固定的2580、1850等）
- [ ] 作者名不是"数学李老师"、"王老师数学课堂"等模拟名字
- [ ] 图片链接包含真实的CDN地址
- [ ] 内容长度和质量符合真实帖子特征

### 数据质量标准

- 标题：5-200字符
- 内容：>20字符
- 图片：0-9张
- 标签：0-10个
- 点赞数：>0
- 作者：非"未知作者"

---

## 🚀 上线检查清单

- [ ] 环境变量已修改：`NEXT_PUBLIC_XHS_MOCK_MODE=false`
- [ ] Cookies已保存并验证有效
- [ ] 数据库表结构已更新
- [ ] PlaywrightCrawler已集成真实爬虫逻辑
- [ ] 单帖抓取测试通过
- [ ] 批量抓取测试通过
- [ ] 数据存储测试通过
- [ ] 前端显示测试通过
- [ ] 配额系统正常工作
- [ ] 错误处理正常

---

## 📝 已知问题和解决方案

### 问题1：部分帖子被重定向到404
**原因**：帖子被删除或设为私密
**解决**：自动跳过，重试下一个

### 问题2：作者信息显示"未知作者"
**原因**：选择器需要根据实际页面调整
**状态**：已知问题，等待进一步优化

### 问题3：Cookies过期
**原因**：Cookies有效期通常7-30天
**解决**：定期重新登录保存cookies

### 问题4：成功率约38%
**原因**：部分链接被重定向或无效
**状态**：正常现象，重试机制已处理

---

## 📈 性能指标

### 爬取速度
- 单个帖子：约6-10秒
- 10个帖子：约2-3分钟
- 包含随机延迟：2-5秒/帖

### 成功率
- 目标：>30%
- 当前：38%
- 优秀：>50%

### 数据完整性
- 标题：100%
- 标签：95%
- 图片：60%（部分帖子无图）
- 作者：待优化

---

## 🔧 维护建议

### 定期任务
1. 每周检查cookies有效性
2. 每月更新选择器（应对页面结构变化）
3. 监控成功率变化
4. 收集和分析失败日志

### 监控指标
- 成功率趋势
- 平均抓取时间
- 错误类型分布
- Cookies过期率

---

## 📞 支持

如遇问题，请检查：
1. `test-reports/` 目录下的日志文件
2. 浏览器截图
3. 数据库记录

---

**最后更新**: 2025-12-11
**版本**: v1.0
**状态**: ✅ 真实爬虫系统已验证可用
