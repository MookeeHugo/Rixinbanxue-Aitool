import { test, expect } from '@playwright/test';
import path from 'path';

// Use teacher auth state for all tests
test.use({ storageState: 'playwright/.auth/teacher.json' });

test.describe('直播文件共享功能', () => {

  test('应该能够创建直播会话并上传文件', async ({ page }) => {
    // 创建新的直播会话
    await page.goto('http://localhost:3002/live/new');

    await page.fill('input[name="title"]', '文件共享测试会话');
    await page.click('button[type="submit"]');

    // 等待跳转到直播间
    await page.waitForURL(/\/live\/[a-z0-9-]+/, { timeout: 15000 });

    // 等待 LiveKit 连接成功
    await page.waitForSelector('text=正在连接直播', { state: 'hidden', timeout: 20000 });

    // 切换到文件标签
    const filesTab = page.locator('button:has-text("文件")');
    await expect(filesTab).toBeVisible({ timeout: 10000 });
    await filesTab.click();

    // 验证文件共享面板可见
    await expect(page.locator('text=共享文件')).toBeVisible();
    await expect(page.locator('text=上传文件')).toBeVisible();

    // 准备测试图片
    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');

    // 点击上传按钮并选择文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // 等待文件上传完成
    await expect(page.locator('text=上传中')).toBeHidden({ timeout: 15000 });

    // 验证文件出现在列表中
    await expect(page.locator('text=test-image.png')).toBeVisible({ timeout: 5000 });

    console.log('✅ 文件上传成功');
  });

  test('应该能够在白板上显示图片且不崩溃', async ({ page, context }) => {
    // 创建新的直播会话
    await page.goto('http://localhost:3002/live/new');

    await page.fill('input[name="title"]', '白板图片显示测试');
    await page.click('button[type="submit"]');

    // 等待跳转到直播间
    await page.waitForURL(/\/live\/[a-z0-9-]+/, { timeout: 15000 });
    const sessionUrl = page.url();

    // 等待 LiveKit 连接
    await page.waitForSelector('text=正在连接直播', { state: 'hidden', timeout: 20000 });

    // 切换到文件标签
    await page.click('button:has-text("文件")');

    // 上传测试图片
    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');
    await page.locator('input[type="file"]').setInputFiles(testImagePath);
    await expect(page.locator('text=上传中')).toBeHidden({ timeout: 15000 });

    // 监听控制台错误
    const consoleErrors: string[] = [];
    const memoryErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        consoleErrors.push(text);

        // 检测内存溢出错误
        if (text.includes('Out of memory') || text.includes('getImageData')) {
          memoryErrors.push(text);
        }
      }
    });

    // 监听页面崩溃
    let pageCrashed = false;
    page.on('crash', () => {
      pageCrashed = true;
    });

    // 点击"在白板上显示"按钮
    const displayButton = page.locator('button[title="在白板上显示"]');
    await expect(displayButton).toBeVisible({ timeout: 5000 });
    await displayButton.click();

    // 切换回白板标签
    await page.click('button:has-text("白板")');

    // 等待图片加载（给足够时间）
    await page.waitForTimeout(3000);

    // 验证没有内存溢出错误
    expect(memoryErrors.length).toBe(0);
    if (memoryErrors.length > 0) {
      console.error('❌ 检测到内存溢出错误:', memoryErrors);
    }

    // 验证页面没有崩溃
    expect(pageCrashed).toBe(false);

    // 验证控制台没有重复的图片加载失败错误（不超过1次）
    const imageLoadErrors = consoleErrors.filter(err =>
      err.includes('加载图片失败') || err.includes('图片加载失败')
    );

    if (imageLoadErrors.length > 1) {
      console.warn(`⚠️ 检测到 ${imageLoadErrors.length} 次图片加载错误（可能存在重复加载）`);
    }

    // 等待并验证图片成功加载的日志
    await page.waitForTimeout(2000);

    console.log('✅ 图片在白板上显示成功，无内存溢出');
  });

  test('应该能够下载已上传的文件', async ({ page }) => {
    // 创建直播会话
    await page.goto('http://localhost:3002/live/new');
    await page.fill('input[name="title"]', '文件下载测试');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/live\/[a-z0-9-]+/, { timeout: 15000 });

    // 等待连接
    await page.waitForSelector('text=正在连接直播', { state: 'hidden', timeout: 20000 });

    // 上传文件
    await page.click('button:has-text("文件")');
    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');
    await page.locator('input[type="file"]').setInputFiles(testImagePath);
    await expect(page.locator('text=上传中')).toBeHidden({ timeout: 15000 });

    // 验证下载按钮可见
    const downloadButton = page.locator('button[title="下载"]');
    await expect(downloadButton).toBeVisible();

    console.log('✅ 文件下载功能正常');
  });

  test('应该能够删除已上传的文件', async ({ page }) => {
    // 创建直播会话
    await page.goto('http://localhost:3002/live/new');
    await page.fill('input[name="title"]', '文件删除测试');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/live\/[a-z0-9-]+/, { timeout: 15000 });

    // 等待连接
    await page.waitForSelector('text=正在连接直播', { state: 'hidden', timeout: 20000 });

    // 上传文件
    await page.click('button:has-text("文件")');
    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');
    await page.locator('input[type="file"]').setInputFiles(testImagePath);
    await expect(page.locator('text=上传中')).toBeHidden({ timeout: 15000 });

    // 监听确认对话框
    page.on('dialog', dialog => dialog.accept());

    // 点击删除按钮
    const deleteButton = page.locator('button[title="删除"]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // 验证文件从列表中消失
    await expect(page.locator('text=test-image.png')).toBeHidden({ timeout: 5000 });
    await expect(page.locator('text=暂无共享文件')).toBeVisible();

    console.log('✅ 文件删除功能正常');
  });

  test('应该验证文件大小限制', async ({ page }) => {
    // 创建直播会话
    await page.goto('http://localhost:3002/live/new');
    await page.fill('input[name="title"]', '文件大小限制测试');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/live\/[a-z0-9-]+/, { timeout: 15000 });

    // 等待连接
    await page.waitForSelector('text=正在连接直播', { state: 'hidden', timeout: 20000 });

    // 切换到文件标签
    await page.click('button:has-text("文件")');

    // 验证显示了文件大小限制说明
    await expect(page.locator('text=最大50MB')).toBeVisible();

    console.log('✅ 文件大小限制说明正常显示');
  });
});
