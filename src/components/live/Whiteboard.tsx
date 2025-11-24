"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Palette,
  Eraser,
  Minus,
  Square,
  Circle,
  Download,
  Undo,
  Redo,
  Trash2,
} from "lucide-react";
import { logger } from '@/lib/logger';

type DrawTool = "pen" | "eraser" | "line" | "rectangle" | "circle" | "text";

interface DrawAction {
  tool: DrawTool;
  color: string;
  lineWidth: number;
  points?: { x: number; y: number }[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  text?: string;
}

interface WhiteboardProps {
  sessionId: string;
  onDrawAction?: (action: DrawAction) => void;
  remoteDrawActions?: DrawAction[];
  displayedImage?: string;
}

export function Whiteboard({ sessionId, onDrawAction, remoteDrawActions, displayedImage }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#06b6d4");
  const [drawTool, setDrawTool] = useState<DrawTool>("pen");
  const [lineWidth, setLineWidth] = useState(3);

  // 撤销/重做状态
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // 当前绘制状态
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  // 保存到历史记录
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);

    // 限制历史记录数量
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryStep(historyStep + 1);
    }

    setHistory(newHistory);
  }, [history, historyStep]);

  // 初始化画布 - 只运行一次
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // 设置画布背景
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 保存初始状态
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([imageData]);
    setHistoryStep(0);
  }, []); // 空依赖数组 - 只运行一次

  // 在白板上显示图片
  useEffect(() => {
    // 只在有效图片URL时才加载
    if (!displayedImage || typeof displayedImage !== 'string' || displayedImage.trim() === '') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    logger.debug('尝试加载图片URL:', displayedImage);

    // 加载图片
    const img = new Image();
    let isActive = true; // Cleanup flag

    img.onload = () => {
      if (!isActive) return; // Prevent execution after unmount

      logger.debug('图片加载成功');
      // 清空画布
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 计算缩放比例以适应画布
      const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height
      );

      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      // 居中显示
      const x = (canvas.width - scaledWidth) / 2;
      const y = (canvas.height - scaledHeight) / 2;

      // 绘制图片
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      // 保存到历史记录 - 使用 try-catch 防止内存溢出
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => {
          const newHistory = [...prev, imageData];
          // 限制历史记录数量
          if (newHistory.length > 50) {
            newHistory.shift();
            return newHistory;
          }
          return newHistory;
        });
        setHistoryStep((prev) => Math.min(prev + 1, 49));
      } catch (e) {
        logger.error('保存图片到历史记录失败:', { error: e });
      }
    };

    img.onerror = (error) => {
      console.error("加载图片失败:", {
        url: displayedImage,
        error: error
      });
    };

    img.src = displayedImage;

    return () => {
      isActive = false; // Cleanup on unmount
    };
  }, [displayedImage]); // FIXED: Removed historyStep from dependencies to prevent infinite loop

  // 撤销
  const undo = useCallback(() => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      ctx.putImageData(history[newStep], 0, 0);
    }
  }, [history, historyStep]);

  // 重做
  const redo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      ctx.putImageData(history[newStep], 0, 0);
    }
  }, [history, historyStep]);

  // 清空画布
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  }, [saveToHistory]);

  // 下载画布
  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, []);

  // 获取画布坐标
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // 开始绘制
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const point = getCanvasCoordinates(e);
    setStartPoint(point);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = drawTool === "eraser" ? "#0f172a" : drawColor;
    ctx.lineWidth = drawTool === "eraser" ? 20 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (drawTool === "pen" || drawTool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);

      setCurrentAction({
        tool: drawTool,
        color: drawColor,
        lineWidth: drawTool === "eraser" ? 20 : lineWidth,
        points: [point],
      });
    }
  }, [drawTool, drawColor, lineWidth]);

  // 绘制中
  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const point = getCanvasCoordinates(e);

      if (drawTool === "pen" || drawTool === "eraser") {
        // 自由绘制
        ctx.lineTo(point.x, point.y);
        ctx.stroke();

        if (currentAction) {
          setCurrentAction({
            ...currentAction,
            points: [...(currentAction.points || []), point],
          });
        }
      } else if (startPoint) {
        // 几何图形 - 先恢复上一个状态，再绘制预览
        if (historyStep >= 0) {
          ctx.putImageData(history[historyStep], 0, 0);
        }

        ctx.strokeStyle = drawColor;
        ctx.lineWidth = lineWidth;
        ctx.fillStyle = "transparent";

        switch (drawTool) {
          case "line":
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
            break;

          case "rectangle":
            ctx.strokeRect(
              startPoint.x,
              startPoint.y,
              point.x - startPoint.x,
              point.y - startPoint.y
            );
            break;

          case "circle":
            const radius = Math.sqrt(
              Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2)
            );
            ctx.beginPath();
            ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
        }

        // 更新当前动作的结束点
        setCurrentAction({
          tool: drawTool,
          color: drawColor,
          lineWidth: lineWidth,
          startPoint: startPoint,
          endPoint: point,
        });
      }
    },
    [isDrawing, drawTool, drawColor, lineWidth, startPoint, currentAction, history, historyStep]
  );

  // 停止绘制
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);

    // 保存到历史记录
    if (drawTool !== "text") {
      saveToHistory();
    }

    // 发送绘制动作（用于多人协同）
    if (currentAction && onDrawAction) {
      onDrawAction(currentAction);
    }

    setCurrentAction(null);
    setStartPoint(null);
  }, [isDrawing, drawTool, currentAction, onDrawAction, saveToHistory]);

  // 重放远程绘制动作
  const replayDrawAction = useCallback((action: DrawAction) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = action.tool === "eraser" ? "#0f172a" : action.color;
    ctx.lineWidth = action.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (action.tool) {
      case "pen":
      case "eraser":
        if (action.points && action.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(action.points[0].x, action.points[0].y);
          action.points.forEach((point) => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        }
        break;

      case "line":
        if (action.startPoint && action.endPoint) {
          ctx.beginPath();
          ctx.moveTo(action.startPoint.x, action.startPoint.y);
          ctx.lineTo(action.endPoint.x, action.endPoint.y);
          ctx.stroke();
        }
        break;

      case "rectangle":
        if (action.startPoint && action.endPoint) {
          ctx.strokeRect(
            action.startPoint.x,
            action.startPoint.y,
            action.endPoint.x - action.startPoint.x,
            action.endPoint.y - action.startPoint.y
          );
        }
        break;

      case "circle":
        if (action.startPoint && action.endPoint) {
          const radius = Math.sqrt(
            Math.pow(action.endPoint.x - action.startPoint.x, 2) +
              Math.pow(action.endPoint.y - action.startPoint.y, 2)
          );
          ctx.beginPath();
          ctx.arc(action.startPoint.x, action.startPoint.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;
    }

    // 保存到历史记录
    saveToHistory();
  }, [saveToHistory]);

  // 处理远程绘制动作
  useEffect(() => {
    if (!remoteDrawActions || remoteDrawActions.length === 0) return;

    // 重放最新的远程绘制动作
    const latestAction = remoteDrawActions[remoteDrawActions.length - 1];
    replayDrawAction(latestAction);
  }, [remoteDrawActions, replayDrawAction]);

  return (
    <div className="w-full h-full relative">
      {/* 画布 */}
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        style={{
          background: "linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* 工具栏 */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 bg-slate-900/80 backdrop-blur-xl p-2 rounded-lg border border-slate-800">
        {/* 绘图工具 */}
        <div className="flex gap-1 pb-2 border-b border-slate-700">
          <button
            onClick={() => setDrawTool("pen")}
            className={`p-2 rounded transition-all ${
              drawTool === "pen"
                ? "bg-cyan-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title="画笔"
          >
            <Palette size={18} />
          </button>
          <button
            onClick={() => setDrawTool("eraser")}
            className={`p-2 rounded transition-all ${
              drawTool === "eraser"
                ? "bg-cyan-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title="橡皮擦"
          >
            <Eraser size={18} />
          </button>
          <button
            onClick={() => setDrawTool("line")}
            className={`p-2 rounded transition-all ${
              drawTool === "line"
                ? "bg-cyan-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title="直线"
          >
            <Minus size={18} />
          </button>
          <button
            onClick={() => setDrawTool("rectangle")}
            className={`p-2 rounded transition-all ${
              drawTool === "rectangle"
                ? "bg-cyan-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title="矩形"
          >
            <Square size={18} />
          </button>
          <button
            onClick={() => setDrawTool("circle")}
            className={`p-2 rounded transition-all ${
              drawTool === "circle"
                ? "bg-cyan-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title="圆形"
          >
            <Circle size={18} />
          </button>
        </div>

        {/* 颜色选择器和线宽 */}
        <div className="flex gap-2 items-center pb-2 border-b border-slate-700">
          <input
            type="color"
            value={drawColor}
            onChange={(e) => setDrawColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
            title="选择颜色"
          />
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-20"
            title="线条粗细"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={historyStep <= 0}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="撤销"
          >
            <Undo size={18} />
          </button>
          <button
            onClick={redo}
            disabled={historyStep >= history.length - 1}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="重做"
          >
            <Redo size={18} />
          </button>
          <button
            onClick={clearCanvas}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all"
            title="清空画布"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={downloadCanvas}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all"
            title="导出图片"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
