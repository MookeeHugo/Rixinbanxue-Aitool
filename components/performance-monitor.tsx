/**
 * 日新平台 - 性能监控组件
 * 监控动画帧率（FPS）和页面加载性能
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, Clock, Eye } from 'lucide-react';

interface PerformanceMetrics {
  fps: number;
  fpsStatus: 'good' | 'warning' | 'poor';
  loadTime: number;
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  memoryUsage?: number; // MB
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    fpsStatus: 'good',
    loadTime: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
  });
  const [isVisible, setIsVisible] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number | undefined>(undefined);

  // ==========================================
  // FPS 监控
  // ==========================================
  useEffect(() => {
    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTimeRef.current;

      // 每秒更新一次FPS
      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        const fpsStatus = fps >= 55 ? 'good' : fps >= 30 ? 'warning' : 'poor';

        setMetrics((prev) => ({ ...prev, fps, fpsStatus }));

        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      rafIdRef.current = requestAnimationFrame(measureFPS);
    };

    rafIdRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // ==========================================
  // 页面加载性能监控（Web Vitals）
  // ==========================================
  useEffect(() => {
    // 页面加载时间
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;

    setMetrics((prev) => ({ ...prev, loadTime }));

    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          setMetrics((prev) => ({ ...prev, lcp: Math.round(lastEntry.renderTime || lastEntry.loadTime) }));
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // FID (First Input Delay)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            setMetrics((prev) => ({ ...prev, fid: Math.round(entry.processingStart - entry.startTime) }));
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });

        // CLS (Cumulative Layout Shift)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              setMetrics((prev) => ({ ...prev, cls: Math.round(clsValue * 1000) / 1000 }));
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        return () => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
        };
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }

    // 内存使用（仅Chrome）
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      const memoryUsage = Math.round(memoryInfo.usedJSHeapSize / 1048576); // 转换为MB
      setMetrics((prev) => ({ ...prev, memoryUsage }));
    }
  }, []);

  // 快捷键切换显示：Ctrl + Shift + P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-primary rounded-full shadow-lg hover:shadow-xl transition-all"
        title="打开性能监控 (Ctrl + Shift + P)"
      >
        <Activity className="h-5 w-5 text-white" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            性能监控
          </CardTitle>
          <button
            onClick={() => setIsVisible(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          快捷键: Ctrl + Shift + P
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* FPS监控 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">帧率 (FPS)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${
              metrics.fpsStatus === 'good' ? 'text-success-600' :
              metrics.fpsStatus === 'warning' ? 'text-warning-600' :
              'text-error-600'
            }`}>
              {metrics.fps}
            </span>
            <Badge variant={
              metrics.fpsStatus === 'good' ? 'default' :
              metrics.fpsStatus === 'warning' ? 'secondary' :
              'error'
            }>
              {metrics.fpsStatus === 'good' ? '流畅' :
               metrics.fpsStatus === 'warning' ? '一般' : '卡顿'}
            </Badge>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t" />

        {/* Web Vitals */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Web Vitals
          </h4>

          {/* LCP */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">LCP (首次内容绘制)</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{metrics.lcp}ms</span>
              <Badge variant={metrics.lcp <= 2500 ? 'default' : metrics.lcp <= 4000 ? 'secondary' : 'error'} className="text-xs">
                {metrics.lcp <= 2500 ? '优秀' : metrics.lcp <= 4000 ? '需改进' : '差'}
              </Badge>
            </div>
          </div>

          {/* FID */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">FID (首次输入延迟)</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{metrics.fid}ms</span>
              <Badge variant={metrics.fid <= 100 ? 'default' : metrics.fid <= 300 ? 'secondary' : 'error'} className="text-xs">
                {metrics.fid <= 100 ? '优秀' : metrics.fid <= 300 ? '需改进' : '差'}
              </Badge>
            </div>
          </div>

          {/* CLS */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">CLS (布局偏移)</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{metrics.cls}</span>
              <Badge variant={metrics.cls <= 0.1 ? 'default' : metrics.cls <= 0.25 ? 'secondary' : 'error'} className="text-xs">
                {metrics.cls <= 0.1 ? '优秀' : metrics.cls <= 0.25 ? '需改进' : '差'}
              </Badge>
            </div>
          </div>

          {/* 页面加载时间 */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              页面加载时间
            </span>
            <span className="font-mono">{Math.round(metrics.loadTime)}ms</span>
          </div>

          {/* 内存使用（仅Chrome） */}
          {metrics.memoryUsage !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">内存使用</span>
              <span className="font-mono">{metrics.memoryUsage} MB</span>
            </div>
          )}
        </div>

        {/* 性能建议 */}
        {(metrics.fpsStatus !== 'good' || metrics.lcp > 2500) && (
          <>
            <div className="border-t" />
            <div className="bg-warning-50 dark:bg-warning-900/20 p-3 rounded-lg">
              <h4 className="text-sm font-semibold text-warning-900 dark:text-warning-100 mb-2">
                ⚠️ 性能建议
              </h4>
              <ul className="text-xs text-warning-800 dark:text-warning-200 space-y-1">
                {metrics.fpsStatus !== 'good' && (
                  <li>• 帧率较低，建议减少复杂动画或使用CSS动画</li>
                )}
                {metrics.lcp > 2500 && (
                  <li>• 首屏加载较慢，建议优化图片或使用懒加载</li>
                )}
                {metrics.cls > 0.1 && (
                  <li>• 布局偏移较大，建议为图片/iframe设置固定尺寸</li>
                )}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PerformanceMonitor;
