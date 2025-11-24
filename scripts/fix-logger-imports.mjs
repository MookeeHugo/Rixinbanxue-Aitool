#!/usr/bin/env node
/**
 * 修复 logger import 语句插入位置错误的问题
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

  console.log(`Found ${files.length} files to check`);

  let fixedCount = 0;

  for (const file of files) {
    const filePath = join(projectRoot, file);
    let content = readFileSync(filePath, 'utf-8');

    // 检查是否有破坏的import语句
    const brokenImportPattern = /import.*@\/import { logger } from '@\/lib\/logger'/;

    if (brokenImportPattern.test(content)) {
      // 移除错误插入的logger import
      content = content.replace(/import { logger } from '@\/lib\/logger'\n/g, '');

      // 找到所有import语句的结束位置
      const lines = content.split('\n');
      let lastImportIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ') || lines[i].startsWith("import {") || lines[i].startsWith("import type")) {
          lastImportIndex = i;
        } else if (lastImportIndex !== -1 && lines[i].trim() === '') {
          // 空行，继续
        } else if (lastImportIndex !== -1) {
          // 第一个非import非空行
          break;
        }
      }

      // 在最后一个import之后插入logger import
      if (lastImportIndex !== -1 && !content.includes("from '@/lib/logger'")) {
        lines.splice(lastImportIndex + 1, 0, "import { logger } from '@/lib/logger'");
        content = lines.join('\n');
      }

      writeFileSync(filePath, content, 'utf-8');
      fixedCount++;
      console.log(`✓ Fixed: ${file}`);
    }
  }

  console.log(`\nTotal files fixed: ${fixedCount}`);
}

main().catch(console.error);
