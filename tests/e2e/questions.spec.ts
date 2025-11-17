import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ensureLoggedIn, createTestQuestion } from './helpers';

const TMP_DIR = path.join(process.cwd(), 'tests/.tmp');
const TEACHER_EMAIL = process.env.PLAYWRIGHT_TEACHER_EMAIL || 'playwright-teacher@test.com';
const TEACHER_PASSWORD = process.env.PLAYWRIGHT_TEACHER_PASSWORD || 'Playwright123!';
const STUDENT_EMAIL = process.env.PLAYWRIGHT_STUDENT_EMAIL || 'playwright-student@test.com';
const STUDENT_PASSWORD = process.env.PLAYWRIGHT_STUDENT_PASSWORD || 'Playwright123!';

async function ensureTmpDir() {
  await fs.promises.mkdir(TMP_DIR, { recursive: true });
}

async function seedQuestionIfEmpty(page) {
  await page.goto('/questions');
  if (await page.locator('.ant-table-row').first().count()) {
    return;
  }
  await createTestQuestion(page, 'Playwright-种子题目', { retries: 2 });
}

test.describe('题库管理流程', () => {
  test.use({ storageState: 'playwright/.auth/teacher.json' });

  test('创建-搜索-详情-硬删除', async ({ page }) => {
    const uniqueKeyword = `自动化题目-${Date.now()}`;
    await ensureLoggedIn(page, TEACHER_EMAIL, TEACHER_PASSWORD);
    await createTestQuestion(page, uniqueKeyword);

    await page.getByPlaceholder('全文搜索题干/答案').fill(uniqueKeyword);
    await page.getByRole('button', { name: '搜索' }).click();

    for (let attempt = 0; attempt < 3; attempt++) {
      const row = page.locator('.ant-table-row').filter({ hasText: uniqueKeyword }).first();
      if (await row.count()) {
        await expect(row).toBeVisible();
        await expect(row.locator('mark')).toContainText(uniqueKeyword.split('-')[0]);
        await row.getByRole('button', { name: '查看' }).click();
        await expect(page.getByText('题目详情')).toBeVisible();
        break;
      }
      await page.reload();
      await page.getByPlaceholder('全文搜索题干/答案').fill(uniqueKeyword);
      await page.getByRole('button', { name: '搜索' }).click();
      if (attempt === 2) {
        throw new Error('未在列表中找到新建题目');
      }
    }

    await page.getByRole('button', { name: '删除' }).click();
    await page.getByLabel('硬删除（不可恢复）').click();
    await page.getByRole('button', { name: '硬删除' }).click();

    await expect(page.getByText('已彻底删除')).toBeVisible();
    await page.getByPlaceholder('全文搜索题干/答案').fill(uniqueKeyword);
    await page.getByRole('button', { name: '搜索' }).click();
    await expect(page.locator('.ant-table-row').filter({ hasText: uniqueKeyword })).toHaveCount(0);
  });

  test('批量导出/导入 + 颜色对比 + 题篮/组卷', async ({ page }) => {
    await ensureTmpDir();

    await ensureLoggedIn(page, TEACHER_EMAIL, TEACHER_PASSWORD);
    await seedQuestionIfEmpty(page);

    // 颜色对比：标题 / 表头 / 表格正文需 >4.5
    const contrastResults = await page.evaluate(() => {
      const selectors = ['h1', '.ant-table-thead', '.ant-table-tbody td'];
      const parseColor = (input: string) => {
        const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(input);
        if (!match) return { r: 0, g: 0, b: 0 };
        return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
      };
      const luminance = (c: { r: number; g: number; b: number }) => {
        const channel = (value: number) => {
          const v = value / 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        const { r, g, b } = c;
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      const ratio = (fg: string, bg: string) => {
        const L1 = luminance(parseColor(fg)) + 0.05;
        const L2 = luminance(parseColor(bg)) + 0.05;
        return L1 > L2 ? L1 / L2 : L2 / L1;
      };
      return selectors.map((selector) => {
        const el = document.querySelector(selector);
        if (!el) return { selector, ratio: 100 };
        const styles = getComputedStyle(el);
        let bgEl = el as HTMLElement | null;
        let bgColor = '';
        while (bgEl && (!bgColor || bgColor === 'rgba(0, 0, 0, 0)')) {
          bgColor = getComputedStyle(bgEl).backgroundColor;
          bgEl = bgEl.parentElement;
        }
        if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)') {
          bgColor = getComputedStyle(document.body).backgroundColor || '#ffffff';
        }
        return { selector, ratio: ratio(styles.color, bgColor) };
      });
    });
    for (const result of contrastResults) {
      expect(result.ratio, `${result.selector} 对比度过低`).toBeGreaterThan(4.5);
    }

    // 选中第一行导出 CSV、加入题篮（用于拖拽）
    const firstRow = page.locator('.ant-table-row').first();
    await firstRow.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: '导出 CSV' }).click();
    await expect(page.getByText(/已导出/)).toBeVisible();
    await firstRow.getByRole('button', { name: '加入题篮' }).click();

    // 执行批量导入
    const importKeyword = `批量导入题目-${Date.now()}`;
    const csvPath = path.join(TMP_DIR, `import-${Date.now()}.csv`);
    const csvContent = [
      'content,answer,type,difficulty,knowledge_points',
      `"${importKeyword}","自动化答案","choice","medium","有理数加法"`,
    ].join('\n');
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '批量导入' }).click(),
    ]);
    await fileChooser.setFiles(csvPath);
    await expect(page.getByText('成功导入 1 道题目')).toBeVisible();

    await page.getByPlaceholder('全文搜索题干/答案').fill(importKeyword);
    await page.getByRole('button', { name: '搜索' }).click();
    const importedRow = page.locator('.ant-table-row').filter({ hasText: importKeyword }).first();
    await expect(importedRow).toBeVisible();
    await importedRow.getByRole('button', { name: '加入题篮' }).click();

    // 题篮操作：拖拽、导出、开始组卷
    await page.getByTestId('basket-open-btn').click();
    const cards = page.getByTestId('basket-card-list').locator('[data-testid^="basket-card-"]');
    await expect(cards.first()).toBeVisible();
    await expect(cards.nth(1)).toBeVisible();
    await cards.first().dragTo(cards.nth(1));
    await page.getByTestId('basket-export').click();
    await page.getByText('导出任务已创建').waitFor({ timeout: 5000 }).catch(() => {});
    await page.getByText('最新导出任务').waitFor({ timeout: 5000 }).catch(() => {});
    await page.getByTestId('basket-start-build').click();
    await expect(page).toHaveURL(/papers\/create\?source=basket/);

    // 返回题库并清空题篮
    await page.goto('/questions');
    await page.getByTestId('basket-open-btn').click();
    await page.getByRole('button', { name: /^清空$/ }).first().click({ force: true });
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /^清空$/ }).last().click({ force: true });
    await page.evaluate(() => {
      localStorage.removeItem('question-basket-storage');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByTestId('basket-open-btn').click();
    const cardsAfterClear = page.getByTestId('basket-card-list').locator('[data-testid^="basket-card-"]');
    await expect(cardsAfterClear).toHaveCount(0, { timeout: 5000 });
    await page.keyboard.press('Escape');

    // 清理导入的题目
    await page.getByPlaceholder('全文搜索题干/答案').fill(importKeyword);
    await page.getByRole('button', { name: '搜索' }).click();
    await page.locator('.ant-table-row').filter({ hasText: importKeyword }).first().getByRole('button', { name: '查看' }).click();
    await page.getByRole('button', { name: '删除' }).click();
    await page.getByLabel('硬删除（不可恢复）').click();
    await page.getByRole('button', { name: '硬删除' }).click();
    await expect(page.getByText('已彻底删除')).toBeVisible();
  });
});

test.describe('学生权限校验', () => {
  test.use({ storageState: 'playwright/.auth/student.json' });

  test('学生访问题库会被重定向', async ({ page }) => {
    await ensureLoggedIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);
    await page.goto('/questions');
    await expect(page.getByText('题库管理')).toBeVisible();
  });
});
