import { config } from 'dotenv';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, basename, extname, join } from 'path';
import { convertBoxToPixelRect, isValidImageBox } from '../src/lib/ai-question-bank/coordinates';

config({ path: resolve(process.cwd(), '.env.local') });

type TestImage = {
  name: string;
  file: string;
};

const testImages: TestImage[] = [
  { name: '测试试卷1', file: '测试试卷1.png' },
  { name: '测试试卷2', file: '测试试卷2.png' },
  { name: '测试试卷3', file: '测试试卷3.png' },
  { name: '测试试卷4', file: '测试试卷4.png' },
  { name: '测试试卷5', file: '测试试卷5.png' },
  { name: '测试试卷6', file: '测试试卷6.png' },
  { name: '测试试卷7', file: '测试试卷7.png' },
  { name: '测试试卷9', file: '测试试卷9.png' },
  { name: '测试试卷10', file: '测试试卷10.png' }
];

async function run() {
  const { parseQuestionWithCascading } = await import('../src/lib/ai-question-bank/gemini-vision-client');
  const { createClient } = await import('@supabase/supabase-js');
  const sharp = (await import('sharp')).default;

  // 初始化Supabase客户端
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const testImage of testImages) {
    const absolutePath = resolve(process.cwd(), testImage.file);
    if (!existsSync(absolutePath)) {
      console.error(`❌ 未找到测试文件: ${absolutePath}`);
      continue;
    }

    console.log('\n====================================================');
    console.log(`测试：${testImage.name} (${testImage.file})`);
    console.log('====================================================');

    const imageBuffer = readFileSync(absolutePath);

    // 上传到Supabase Storage并获取公开URL
    console.log('1) 上传图片到Supabase Storage...');
    // 使用安全的文件名（移除中文字符）
    const safeFileName = `test-${Date.now()}.png`;
    const uploadPath = `test-uploads/${safeFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ai-question-bank')
      .upload(uploadPath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error(`   ❌ 上传失败:`, uploadError.message);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from('ai-question-bank')
      .getPublicUrl(uploadPath);

    const publicUrl = urlData.publicUrl;
    console.log(`   ✅ 公开URL: ${publicUrl}`);

    // 调用Gemini Vision API
    console.log('\n2) 调用 Gemini Vision API (级联)...');
    const geminiStart = Date.now();

    try {
      const geminiResult = await parseQuestionWithCascading(publicUrl);
      const geminiTime = Date.now() - geminiStart;

      console.log(`   ✅ 完成，耗时 ${geminiTime} ms`);
      console.log(`   使用模型: ${geminiResult.model}`);
      console.log(`   是否触发兜底: ${geminiResult.retried ? '是' : '否'}`);
      console.log(`   识别题目数: ${geminiResult.questions.length}`);

      // 统计有配图的题目
      const questionsWithImages = geminiResult.questions.filter(q => q.image_regions && q.image_regions.length > 0);
      console.log(`   有配图题目数: ${questionsWithImages.length}`);

      // 保存解析结果到JSON
      const outputDir = resolve(process.cwd(), 'tmp', 'gemini-test-results', basename(testImage.file, extname(testImage.file)));
      mkdirSync(outputDir, { recursive: true });

      const resultJsonPath = join(outputDir, 'gemini-result.json');
      writeFileSync(resultJsonPath, JSON.stringify(geminiResult, null, 2));
      console.log(`   ✅ 解析结果已保存: ${resultJsonPath}`);

      // 裁剪题目配图
      console.log('\n3) 裁剪题目配图...');
      console.log('   下载Supabase图片用于裁剪...');

      // 下载Supabase上的图片（确保尺寸一致）
      const imageResponse = await fetch(publicUrl);
      const supabaseImageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // 获取图片尺寸
      const metadata = await sharp(supabaseImageBuffer).metadata();
      console.log(`   图片尺寸: ${metadata.width}x${metadata.height}`);

      let cropSuccess = 0;
      const imageMeta = {
        width: metadata.width || 0,
        height: metadata.height || 0
      };

      for (const question of geminiResult.questions) {
        if (!question.image_regions || question.image_regions.length === 0) {
          console.log(`   题${question.number}: 无配图，跳过`);
          continue;
        }

        for (let i = 0; i < question.image_regions.length; i++) {
          const region = question.image_regions[i];
          const filePath = join(outputDir, `question-${question.number}-img${i + 1}.png`);

          if (!Array.isArray(region.box_2d) || region.box_2d.length !== 4) {
            console.warn(`   ⚠️ 题${question.number}配图${i + 1}缺少 box_2d，跳过`, region);
            continue;
          }

          const rect = convertBoxToPixelRect(region.box_2d, imageMeta);
          if (!rect) {
            console.warn(`   ⚠️ 题${question.number}配图${i + 1}坐标映射失败`, { box_2d: region.box_2d });
            continue;
          }

          if (!isValidImageBox(rect, imageMeta)) {
            console.warn(`   ⚠️ 题${question.number}配图${i + 1}被启发式过滤`, {
              box_2d: region.box_2d,
              mapped: rect
            });
            continue;
          }

          try {
            await sharp(supabaseImageBuffer)
              .extract({
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
              })
              .png()
              .toFile(filePath);

            cropSuccess += 1;
            console.log(`   ✅ 题${question.number}配图${i + 1}: ${rect.width}x${rect.height} -> ${basename(filePath)}`);
          } catch (error) {
            console.error(`   ❌ 裁剪题${question.number}配图${i + 1}失败:`, error instanceof Error ? error.message : error);
          }
        }
      }

      console.log(`\n   裁剪成功: ${cropSuccess}/${questionsWithImages.reduce((sum, q) => sum + (q.image_regions?.length || 0), 0)}`);
      console.log(`   结果已保存到: ${outputDir}`);

      // 清理上传的测试文件
      await supabase.storage
        .from('ai-question-bank')
        .remove([uploadPath]);

    } catch (error) {
      console.error(`   ❌ Gemini API 调用失败:`, error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }

      // 清理上传的测试文件
      await supabase.storage
        .from('ai-question-bank')
        .remove([uploadPath]);
    }
  }

  console.log('\n✅ 测试完成，请查看 tmp/gemini-test-results 目录中的结果。');
}

run().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
