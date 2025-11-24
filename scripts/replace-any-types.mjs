#!/usr/bin/env node
/**
 * Script to replace 'any' types with more specific types
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Patterns to replace
const replacements = [
  // Error type annotations
  { from: /(\s)error:\s*any\b/g, to: '$1error: unknown' },
  // Storage config and generic objects
  { from: /storageConfig\?:\s*any\b/g, to: 'storageConfig?: Record<string, unknown>' },
  // Generic method parameters
  { from: /\(quality:\s*any\)/g, to: '(quality: unknown)' },
  { from: /\(error:\s*any\)/g, to: '(error: unknown)' },
  { from: /\(status:\s*any\)/g, to: '(status: unknown)' },
  { from: /\(egressInfo:\s*any\)/g, to: '(egressInfo: unknown)' },
];

async function main() {
  // Find all TypeScript files in src/lib
  const files = await glob('src/lib/**/*.ts', {
    cwd: projectRoot,
    ignore: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
  });

  console.log(`Found ${files.length} files to process`);

  let totalReplacements = 0;

  for (const file of files) {
    const filePath = join(projectRoot, file);
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let fileReplacements = 0;

    // Apply all replacements
    for (const { from, to } of replacements) {
      const matches = content.match(from);
      if (matches) {
        content = content.replace(from, to);
        fileReplacements += matches.length;
      }
    }

    // Only write if content changed
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ ${file}: ${fileReplacements} replacements`);
      totalReplacements += fileReplacements;
    }
  }

  console.log(`\nTotal replacements: ${totalReplacements}`);
}

main().catch(console.error);
