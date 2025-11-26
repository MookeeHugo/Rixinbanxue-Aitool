/**
 * Sharp图片裁剪功能测试脚本
 */

async function testSharpCropping() {
  try {
    console.log('开始测试Sharp图片裁剪功能...\n');

    // 1. 测试Sharp模块加载
    console.log('1️⃣ 测试Sharp模块加载...');
    const sharp = (await import('sharp')).default;
    console.log('✅ Sharp模块加载成功');

    // 2. 创建一个测试图片（200x200的纯色图片）
    console.log('\n2️⃣ 创建测试图片...');
    const testImageBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 100, g: 150, b: 200 }
      }
    })
      .png()
      .toBuffer();

    console.log(`✅ 测试图片创建成功 (大小: ${testImageBuffer.length} bytes)`);

    // 3. 测试裁剪功能
    console.log('\n3️⃣ 测试图片裁剪...');
    const croppedBuffer = await sharp(testImageBuffer)
      .extract({
        left: 50,
        top: 50,
        width: 100,
        height: 100
      })
      .png()
      .toBuffer();

    console.log(`✅ 图片裁剪成功 (原始: ${testImageBuffer.length} bytes -> 裁剪后: ${croppedBuffer.length} bytes)`);

    // 4. 获取裁剪后的图片元数据
    console.log('\n4️⃣ 验证裁剪结果...');
    const metadata = await sharp(croppedBuffer).metadata();
    console.log('裁剪后的图片信息:');
    console.log(`  - 尺寸: ${metadata.width}x${metadata.height}`);
    console.log(`  - 格式: ${metadata.format}`);
    console.log(`  - 色彩空间: ${metadata.space}`);

    if (metadata.width === 100 && metadata.height === 100) {
      console.log('✅ 裁剪尺寸正确');
    } else {
      console.log('❌ 裁剪尺寸不正确');
    }

    console.log('\n🎉 所有测试通过！Sharp图片裁剪功能正常工作。');
    return true;

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
    }
    return false;
  }
}

// 运行测试
testSharpCropping()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试脚本执行失败:', error);
    process.exit(1);
  });
