import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('环境变量缺失');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const filePath = process.argv[2];
if (!filePath) {
  console.error('缺少文件路径参数');
  process.exit(1);
}

const { data, error } = await supabase.storage.from('question-files').download(filePath);
if (error || !data) {
  console.error('下载失败', error);
  process.exit(1);
}
const arrayBuffer = await data.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
mkdirSync('tmp', { recursive: true });
const safeName = filePath.replace(/[^a-zA-Z0-9.-]+/g, '_');
const localPath = resolve('tmp', `downloaded-${safeName}`);
writeFileSync(localPath, buffer);
console.log('已保存', localPath, buffer.length);
