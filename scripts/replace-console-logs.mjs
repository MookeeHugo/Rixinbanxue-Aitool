#!/usr/bin/env node
/**
 * 将 console.log/error/warn 替换为结构化日志 logger 调用
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 需要替换的文件模式
const patterns = [
  'src/app/**/*.tsx',
  'src/app/**/*.ts',
  'src/components/**/*.tsx',
  'src/components/**/*.ts',
  'src/lib/**/*.ts',
];

// 替换规则
const replacements = [
  // console.error('message', error) → logger.error('message', { error })
  {
    from: /console\.error\(['"]([^'"]+)['"],\s*(\w+)\)/g,
    to: "logger.error('$1', { error: $2 })"
  },
  // console.error('message:', error) → logger.error('message', { error })
  {
    from: /console\.error\(['"]([^'":]+):\s*['"],\s*(\w+)\)/g,
    to: "logger.error('$1', { error: $2 })"
  },
  // console.error(error) → logger.error('Error occurred', { error })
  {
    from: /console\.error\((\w+)\)/g,
    to: "logger.error('Error occurred', { error: $1 })"
  },
  // console.warn('message', error) → logger.warn('message', { error })
  {
    from: /console\.warn\(['"]([^'"]+)['"],\s*(\w+)\)/g,
    to: "logger.warn('$1', { error: $2 })"
  },
  // console.log → logger.debug (通常用于调试)
  {
    from: /console\.log\(/g,
    to: "logger.debug("
  },
];

async function main() {
  const files = [];
  for (const pattern of patterns) {
    const matched = await glob(pattern, {
      cwd: projectRoot,
      ignore: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    });
    files.push(...matched);
  }

  console.log(`Found ${files.length} files to process`);

  let totalReplacements = 0;
  const filesWithChanges = [];

  for (const file of files) {
    const filePath = join(projectRoot, file);
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let fileReplacements = 0;

    // 应用所有替换
    for (const { from, to } of replacements) {
      const matches = content.match(from);
      if (matches) {
        content = content.replace(from, to);
        fileReplacements += matches.length;
      }
    }

    // 如果有替换，检查是否需要添加 import
    if (content !== originalContent) {
      // 检查是否已经导入 logger
      if (!content.includes('import { logger }') && !content.includes("from '@/lib/logger'")) {
        // 在文件顶部添加 import（在第一个import之后）
        const importMatch = content.match(/^(import .+\n)+/m);
        if (importMatch) {
          const lastImportEnd = importMatch[0].length;
          content =
            content.slice(0, lastImportEnd) +
            "import { logger } from '@/lib/logger'\n" +
            content.slice(lastImportEnd);
        } else {
          // 如果没有import，添加到文件开头
          content = "import { logger } from '@/lib/logger'\n\n" + content;
        }
      }

      writeFileSync(filePath, content, 'utf-8');
      filesWithChanges.push({ file, count: fileReplacements });
      console.log(`✓ ${file}: ${fileReplacements} replacements`);
      totalReplacements += fileReplacements;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total files modified: ${filesWithChanges.length}`);
  console.log(`Total replacements: ${totalReplacements}`);
  console.log(`${'='.repeat(50)}\n`);

  if (filesWithChanges.length > 0) {
    console.log('Modified files:');
    filesWithChanges.forEach(({ file, count }) => {
      console.log(`  - ${file} (${count} changes)`);
    });
  }
}

main().catch(console.error);
