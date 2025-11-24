#!/usr/bin/env node
/**
 * 修复被破坏的 import 语句
 * 移除所有错误插入的 logger import，然后正确重新插入
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function main() {
  const files = await glob('src/**/*.{ts,tsx}', {
    cwd: projectRoot,
    ignore: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
  });

  console.log(`Checking ${files.length} files...`);

  let fixedCount = 0;
  const brokenFiles = [];

  for (const file of files) {
    const filePath = join(projectRoot, file);
    let content = readFileSync(filePath, 'utf-8');
    let wasBroken = false;

    // 检测破坏的模式：import xxx reimport { logger }
    // 或者在 import 行中间插入的 logger import
    const brokenPatterns = [
      /from\s+"[^"]+"\s*import\s+{\s*logger\s*}\s+from\s+'@\/lib\/logger'/g,
      /from\s+'[^']+'\s*import\s+{\s*logger\s*}\s+from\s+'@\/lib\/logger'/g,
      /import\s+.*reimport\s+{\s*logger\s*}\s+from\s+'@\/lib\/logger'/g,
      /,\s*Bimport\s+{\s*logger\s*}\s+from\s+'@\/lib\/logger'/g,
    ];

    for (const pattern of brokenPatterns) {
      if (pattern.test(content)) {
        wasBroken = true;
        brokenFiles.push(file);
        break;
      }
    }

    if (wasBroken) {
      // 移除所有 logger import (包括破坏的和正常的)
      content = content.replace(/import\s+{\s*logger\s*}\s+from\s+'@\/lib\/logger'\s*\n?/g, '');

      // 清理残留的破坏文本
      content = content.replace(/reimport\s+{\s*logger\s*}\s+from\s+'@\/lib\/logger'/g, 're');
      content = content.replace(/Bimport\s+{\s*logger\s*}\s+from\s+'@\/lib\/logger'/g, 'B');

      // 对于 logger.ts 自身，不应该导入自己
      if (file.includes('logger.ts')) {
        writeFileSync(filePath, content, 'utf-8');
        fixedCount++;
        console.log(`✓ Fixed (removed self-import): ${file}`);
        continue;
      }

      // 检查是否使用了 logger
      const usesLogger = /logger\.(debug|info|warn|error|withPerformanceLogging)/.test(content);

      if (usesLogger) {
        // 找到正确的插入位置（最后一个 import 之后）
        const lines = content.split('\n');
        let lastImportIndex = -1;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('import ') && !line.includes('logger')) {
            lastImportIndex = i;
          }
        }

        if (lastImportIndex !== -1) {
          lines.splice(lastImportIndex + 1, 0, "import { logger } from '@/lib/logger'");
          content = lines.join('\n');
        } else {
          // 如果没有其他 import，添加到文件开头
          const firstNonComment = lines.findIndex(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('/*') && !l.trim().startsWith('*'));
          if (firstNonComment !== -1) {
            lines.splice(firstNonComment, 0, "import { logger } from '@/lib/logger'", '');
            content = lines.join('\n');
          }
        }
      }

      writeFileSync(filePath, content, 'utf-8');
      fixedCount++;
      console.log(`✓ Fixed: ${file}`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Files checked: ${files.length}`);
  console.log(`Files fixed: ${fixedCount}`);
  console.log(`${'='.repeat(50)}\n`);

  if (brokenFiles.length > 0) {
    console.log('Broken files found:');
    brokenFiles.forEach(f => console.log(`  - ${f}`));
  }
}

main().catch(console.error);
