#!/bin/bash

# PaddleOCR 服务启动脚本

set -e

echo "=========================================="
echo "PaddleOCR 布局分析服务 - 启动脚本"
echo "=========================================="

# 检查Python版本
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "Python 版本: $python_version"

# 检查依赖是否安装
if ! python -c "import fastapi" 2>/dev/null; then
    echo "❌ 依赖未安装，正在安装..."
    pip install -r requirements.txt
else
    echo "✅ 依赖已安装"
fi

# 启动服务
echo ""
echo "🚀 启动服务..."
echo "   地址: http://localhost:8000"
echo "   健康检查: http://localhost:8000/health"
echo "   API接口: http://localhost:8000/api/analyze-layout"
echo ""
echo "按 Ctrl+C 停止服务"
echo "=========================================="

python app.py
