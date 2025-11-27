import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

async function setupBuckets() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔧 设置 Storage Buckets...\n');

  // 需要创建的buckets
  const buckets = [
    {
      id: 'ai-question-bank',
      name: 'ai-question-bank',
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    },
    {
      id: 'question-images',
      name: 'question-images',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg']
    }
  ];

  for (const bucketConfig of buckets) {
    console.log(`检查 bucket: ${bucketConfig.id}`);

    // 检查bucket是否已存在
    const { data: existingBuckets } = await supabase.storage.listBuckets();
    const bucketExists = existingBuckets?.some(b => b.id === bucketConfig.id);

    if (bucketExists) {
      console.log(`  ✅ Bucket "${bucketConfig.id}" 已存在\n`);
      continue;
    }

    // 创建bucket
    const { data, error } = await supabase.storage.createBucket(bucketConfig.id, {
      public: bucketConfig.public,
      fileSizeLimit: bucketConfig.fileSizeLimit,
      allowedMimeTypes: bucketConfig.allowedMimeTypes
    });

    if (error) {
      console.error(`  ❌ 创建 bucket "${bucketConfig.id}" 失败:`, error.message);
    } else {
      console.log(`  ✅ 成功创建 bucket "${bucketConfig.id}"\n`);
    }
  }

  console.log('✅ Storage Buckets 设置完成！');
}

setupBuckets().catch(error => {
  console.error('❌ 设置失败:', error);
  process.exit(1);
});
