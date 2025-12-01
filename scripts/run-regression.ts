import { promises as fs, existsSync, Dirent } from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(process.cwd(), '.env.local') });

type ParserFn = typeof import('../src/lib/ai-question-bank/gemini-vision-client').parseQuestionWithCascadingFromBuffer;
let parseFn: ParserFn | null = null;

async function getParser(): Promise<ParserFn> {
  if (!parseFn) {
    const mod = await import('../src/lib/ai-question-bank/gemini-vision-client');
    parseFn = mod.parseQuestionWithCascadingFromBuffer;
  }
  return parseFn;
}

type MetadataRecord = {
  expectedCount?: number | null;
  description?: string;
};

type TestTask = {
  category: string;
  fileName: string;
  filePath: string;
  metadata?: MetadataRecord;
};

type Status = 'PASS' | 'WARN' | 'FAIL' | 'SKIP';

type ReportItem = {
  category: string;
  fileName: string;
  status: Status;
  expectedCount?: number | null;
  actualCount?: number;
  durationMs: number;
  errorMessage?: string;
  requestId?: string;
};

const CONCURRENCY = Number(process.env.REGRESSION_CONCURRENCY || 2);
const DATASET_ROOTS = resolveDatasetRoots();
const OUTPUT_DIR = path.resolve(process.cwd(), 'tests', 'output');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJSON(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const cleaned = raw.replace(/^\uFEFF/, '');
  return JSON.parse(cleaned);
}

function normalizeMetadata(data: unknown): Map<string, MetadataRecord> {
  const map = new Map<string, MetadataRecord>();

  if (!data) {
    return map;
  }

  if (Array.isArray(data)) {
    for (const entry of data) {
      if (!entry || typeof entry !== 'object') continue;
      const fileName =
        (entry as any).fileName || (entry as any).filename || (entry as any).name;
      if (!fileName) continue;
      const expectedCount =
        (entry as any).expected_count ??
        (entry as any).expectedCount ??
        (entry as any).questionCountExpected ??
        null;
      map.set(fileName, {
        expectedCount: typeof expectedCount === 'number' ? expectedCount : null,
        description: (entry as any).description
      });
    }
    return map;
  }

  if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (!key) continue;
      const expectedCount =
        value?.expected_count ?? value?.expectedCount ?? value?.questionCountExpected ?? null;
      map.set(key, {
        expectedCount: typeof expectedCount === 'number' ? expectedCount : null,
        description: value?.description
      });
    }
  }

  return map;
}

async function loadMetadata(categoryDir: string): Promise<Map<string, MetadataRecord>> {
  const metadataPath = path.join(categoryDir, 'metadata.json');
  try {
    await fs.access(metadataPath);
  } catch {
    return new Map();
  }
  try {
    const json = await readJSON(metadataPath);
    return normalizeMetadata(json);
  } catch (error) {
    console.warn('[Regression] 解析 metadata 失败', {
      categoryDir,
      error: error instanceof Error ? error.message : String(error)
    });
    return new Map();
  }
}

function resolveDatasetRoots(): string[] {
  const configured = process.env.REGRESSION_DATASET_ROOTS
    ?.split(/[,;]+/)
    .map(item => item.trim())
    .filter(Boolean);
  const fallback = [
    path.resolve(process.cwd(), 'tests', 'dataset'),
    path.resolve(process.cwd(), 'shijuanceshi')
  ];
  const raw = configured && configured.length ? configured : fallback;
  const deduped: string[] = [];

  for (const entry of raw) {
    const absolute = path.isAbsolute(entry) ? entry : path.resolve(process.cwd(), entry);
    if (!existsSync(absolute)) continue;
    if (!deduped.includes(absolute)) {
      deduped.push(absolute);
    }
  }

  return deduped;
}

function isImageFile(fileName: string) {
  return /\.(jpg|jpeg|png)$/i.test(fileName);
}

async function collectTasks(): Promise<TestTask[]> {
  const tasks: TestTask[] = [];

  for (const root of DATASET_ROOTS) {
    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(root, { withFileTypes: true });
    } catch (error) {
      console.warn('[Regression] 无法读取数据集目录', {
        root,
        error: error instanceof Error ? error.message : String(error)
      });
      continue;
    }

    const rootMetadata = await loadMetadata(root);

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const category = entry.name;
        const categoryDir = path.join(root, category);
        const metadataMap = await loadMetadata(categoryDir);
        const files = await fs.readdir(categoryDir, { withFileTypes: true });
        for (const file of files) {
          if (!file.isFile() || !isImageFile(file.name)) continue;
          tasks.push({
            category,
            fileName: file.name,
            filePath: path.join(categoryDir, file.name),
            metadata: metadataMap.get(file.name)
          });
        }
        continue;
      }

      if (!entry.isFile() || !isImageFile(entry.name)) continue;
      const category = path.basename(root);
      tasks.push({
        category,
        fileName: entry.name,
        filePath: path.join(root, entry.name),
        metadata: rootMetadata.get(entry.name)
      });
    }
  }

  tasks.sort((a, b) => {
    if (a.category === b.category) return a.fileName.localeCompare(b.fileName);
    return a.category.localeCompare(b.category);
  });

  return tasks;
}

async function processTask(task: TestTask, index: number, total: number): Promise<ReportItem> {
  const label = `[${index + 1}/${total}] ${task.category}/${task.fileName}`;
  const start = Date.now();
  try {
    const buffer = await fs.readFile(task.filePath);
    const parser = await getParser();
    process.env.CURRENT_REGRESSION_FILE = task.fileName;
    const result = await parser(buffer);
    process.env.CURRENT_REGRESSION_FILE = '';
    const durationMs = Date.now() - start;
    const actualCount = result.questions.length;
    const expectedCount = task.metadata?.expectedCount ?? null;

    let status: Status = 'SKIP';
    let message = '';

    if (expectedCount == null) {
      status = 'SKIP';
      message = 'metadata 缺少 expected_count';
    } else if (actualCount === expectedCount) {
      status = 'PASS';
      message = `题量匹配 (${actualCount})`;
    } else {
      status = 'WARN';
      message = `题量不符，期望 ${expectedCount} 实际 ${actualCount}`;
    }

    console.log(`${label} -> ${status} ${message} (${durationMs}ms)`);

    return {
      category: task.category,
      fileName: task.fileName,
      status,
      expectedCount,
      actualCount,
      durationMs,
      requestId: result.requestId
    };
  } catch (error) {
    process.env.CURRENT_REGRESSION_FILE = '';
    const durationMs = Date.now() - start;
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`${label} -> FAIL ${errMsg}`);
    return {
      category: task.category,
      fileName: task.fileName,
      status: 'FAIL',
      durationMs,
      errorMessage: errMsg
    };
  }
}

async function runWithConcurrency(tasks: TestTask[]): Promise<ReportItem[]> {
  const results: ReportItem[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= tasks.length) break;
      const task = tasks[current];
      results[current] = await processTask(task, current, tasks.length);
    }
  }

  const workers = Array(Math.min(CONCURRENCY, tasks.length))
    .fill(0)
    .map(() => worker());
  await Promise.all(workers);
  return results;
}

function summarize(results: ReportItem[]) {
  const summary = {
    total: results.length,
    pass: results.filter(item => item.status === 'PASS').length,
    warn: results.filter(item => item.status === 'WARN').length,
    fail: results.filter(item => item.status === 'FAIL').length,
    skip: results.filter(item => item.status === 'SKIP').length,
    avgMs:
      results.length === 0
        ? 0
        : Math.round(
            results.reduce((sum, item) => sum + (item.durationMs || 0), 0) / results.length
          )
  };

  return summary;
}

async function writeReport(results: ReportItem[]) {
  await ensureDir(OUTPUT_DIR);
  const summary = summarize(results);
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    items: results
  };
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetPath = path.join(OUTPUT_DIR, `regression-report-${timestamp}.json`);
  await fs.writeFile(targetPath, JSON.stringify(report, null, 2), 'utf-8');
  return { summary, targetPath };
}

async function main() {
  const tasks = await collectTasks();
  if (!tasks.length) {
    console.log('[Regression] 未找到任何测试图片');
    return;
  }

  console.log(
    `[Regression] 共发现 ${tasks.length} 张图片，命中数据集 ${DATASET_ROOTS.length} 个，开始并发度 ${CONCURRENCY} 的回归测试`
  );
  DATASET_ROOTS.forEach((root, index) => {
    console.log(`  [${index + 1}] ${path.relative(process.cwd(), root)}`);
  });
  const results = await runWithConcurrency(tasks);
  const { summary, targetPath } = await writeReport(results);

  console.log('\n=== Regression Summary ===');
  console.log(`Total : ${summary.total}`);
  console.log(`PASS  : ${summary.pass}`);
  console.log(`WARN  : ${summary.warn}`);
  console.log(`FAIL  : ${summary.fail}`);
  console.log(`SKIP  : ${summary.skip}`);
  console.log(`AvgMs : ${summary.avgMs}`);
  console.log(`Report: ${path.relative(process.cwd(), targetPath)}`);

  if (summary.warn > 0 || summary.fail > 0) {
    console.log(
      '\n提示：WARN 表示题量不匹配、FAIL 表示解析抛错，可以结合 logs/failures/* 查看黑匣子日志定位原因。'
    );
  }
}

main().catch(error => {
  console.error('[Regression] 脚本执行失败', error);
  process.exit(1);
});
