"""
PaddleOCR 布局分析核心逻辑
使用 PP-StructureV3 进行文档结构分析
"""

from paddleocr import PPStructure
import numpy as np
from typing import List, Dict, Any
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化PP-StructureV3（文档布局分析引擎）
# 注意：首次运行会自动下载模型文件
try:
    structure_engine = PPStructure(
        layout_model='picodet_lcnet_x1_0_fgd_layout_cdla',
        show_log=False,
        use_gpu=False,  # 开发环境使用CPU，生产环境可改为True
        lang='ch'  # 中文
    )
    logger.info("✅ PP-StructureV3 引擎初始化成功")
except Exception as e:
    logger.error(f"❌ PP-StructureV3 引擎初始化失败: {e}")
    structure_engine = None


def analyze_document_layout(image) -> Dict[str, Any]:
    """
    使用PP-StructureV3分析文档布局

    参数:
        image: PIL Image 对象

    返回:
        {
            "blocks": [
                {
                    "type": "text" | "figure" | "table" | "title",
                    "bbox": [x, y, width, height],
                    "text": "...",  # 仅text类型有此字段
                    "confidence": 0.95
                }
            ],
            "image_size": [width, height]
        }
    """
    if structure_engine is None:
        raise RuntimeError("PP-StructureV3 引擎未初始化")

    try:
        # 转换为numpy数组（PaddleOCR要求的格式）
        img_array = np.array(image)
        logger.info(f"开始分析图片，尺寸: {image.size}")

        # 调用PP-StructureV3进行布局分析
        result = structure_engine(img_array)
        logger.info(f"PP-StructureV3 分析完成，识别到 {len(result)} 个区块")

        blocks: List[Dict[str, Any]] = []

        for idx, item in enumerate(result):
            try:
                bbox = item['bbox']  # [x1, y1, x2, y2]
                block_type = item['type']  # 'text', 'figure', 'table', 'title'
                confidence = item.get('score', 0.0)

                # 转换坐标格式：[x1, y1, x2, y2] → [x, y, width, height]
                x, y = int(bbox[0]), int(bbox[1])
                width = int(bbox[2] - bbox[0])
                height = int(bbox[3] - bbox[1])

                block = {
                    "type": block_type,
                    "bbox": [x, y, width, height],
                    "confidence": float(confidence)
                }

                # 如果是文本块，提取文字内容
                if block_type == 'text' and 'res' in item:
                    text_lines = [line['text'] for line in item['res'] if 'text' in line]
                    block['text'] = '\n'.join(text_lines)
                    logger.debug(f"文本块 {idx}: {block['text'][:50]}...")

                blocks.append(block)
                logger.debug(f"区块 {idx}: type={block_type}, bbox={block['bbox']}, conf={confidence:.2f}")

            except Exception as e:
                logger.warning(f"解析区块 {idx} 时出错: {e}")
                continue

        # 按区块位置排序（从上到下，从左到右）
        blocks.sort(key=lambda b: (b['bbox'][1], b['bbox'][0]))

        result_data = {
            "blocks": blocks,
            "image_size": [image.width, image.height]
        }

        logger.info(f"✅ 布局分析完成: {len(blocks)} 个区块, 图片尺寸 {image.size}")
        return result_data

    except Exception as e:
        logger.error(f"❌ 布局分析失败: {e}")
        raise RuntimeError(f"布局分析失败: {str(e)}")


def extract_figure_blocks(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    提取所有图片块（type='figure'）

    参数:
        blocks: analyze_document_layout 返回的 blocks 列表

    返回:
        图片块列表，按面积从大到小排序
    """
    figures = [b for b in blocks if b['type'] == 'figure']

    # 按面积排序（面积 = width * height）
    figures.sort(key=lambda f: f['bbox'][2] * f['bbox'][3], reverse=True)

    logger.info(f"提取到 {len(figures)} 个图片块")
    return figures


def extract_text_blocks(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    提取所有文本块（type='text'）

    参数:
        blocks: analyze_document_layout 返回的 blocks 列表

    返回:
        文本块列表，按位置从上到下排序
    """
    texts = [b for b in blocks if b['type'] == 'text' and 'text' in b]

    # 按Y坐标排序（从上到下）
    texts.sort(key=lambda t: t['bbox'][1])

    logger.info(f"提取到 {len(texts)} 个文本块")
    return texts


if __name__ == "__main__":
    # 测试代码
    from PIL import Image

    print("=" * 60)
    print("PaddleOCR 布局分析测试")
    print("=" * 60)

    # 测试图片路径
    test_image_path = "test_images/sample.png"

    try:
        # 加载测试图片
        img = Image.open(test_image_path)
        print(f"\n📷 加载测试图片: {test_image_path}")
        print(f"   尺寸: {img.size}")

        # 执行布局分析
        result = analyze_document_layout(img)

        # 打印结果
        print(f"\n✅ 分析完成！")
        print(f"   图片尺寸: {result['image_size']}")
        print(f"   区块总数: {len(result['blocks'])}")

        # 统计各类型区块
        type_counts = {}
        for block in result['blocks']:
            btype = block['type']
            type_counts[btype] = type_counts.get(btype, 0) + 1

        print(f"\n📊 区块类型统计:")
        for btype, count in type_counts.items():
            print(f"   {btype}: {count}")

        # 显示所有区块详情
        print(f"\n📋 区块详情:")
        for idx, block in enumerate(result['blocks'], 1):
            print(f"\n{idx}. 类型: {block['type']}")
            print(f"   位置: {block['bbox']}")
            print(f"   置信度: {block['confidence']:.2f}")
            if 'text' in block:
                text_preview = block['text'][:100].replace('\n', ' ')
                print(f"   文本: {text_preview}...")

    except FileNotFoundError:
        print(f"\n❌ 测试图片不存在: {test_image_path}")
        print(f"   请将测试图片放到 test_images/ 目录下")
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
