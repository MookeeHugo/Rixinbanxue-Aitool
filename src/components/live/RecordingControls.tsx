/**
 * 录制控制组件
 * 用于直播间的服务端录制控制
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RecordingControlsProps {
  sessionId: string;
  userId: string;
  userRole?: string;
  className?: string;
}

interface RecordingStatus {
  isRecording: boolean;
  recordingId?: string;
  startedAt?: string;
  error?: string;
}

export function RecordingControls({
  sessionId,
  userId,
  userRole,
  className = '',
}: RecordingControlsProps) {
  const [status, setStatus] = useState<RecordingStatus>({
    isRecording: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 检查权限：仅教师可以录制
  const canRecord = userRole === 'teacher';

  // 实时录制状态更新 (使用 SSE)
  useEffect(() => {
    if (!canRecord) return;

    logger.info('Establishing SSE connection for recording status', { sessionId });

    const eventSource = new EventSource(
      `/api/live-sessions/${sessionId}/recording-status/stream`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        logger.debug('Received SSE recording status update', data);

        setStatus({
          isRecording: data.isRecording,
          recordingId: data.recordingId || undefined,
          startedAt: data.startedAt || undefined,
        });
      } catch (error) {
        logger.error('Failed to parse SSE message', error);
      }
    };

    eventSource.onerror = (error) => {
      logger.error('SSE connection error', error);
      // EventSource automatically reconnects, so we don't need to do anything
    };

    // Cleanup on unmount
    return () => {
      logger.info('Closing SSE connection', { sessionId });
      eventSource.close();
    };
  }, [sessionId, canRecord]);

  // 计算录制时长
  useEffect(() => {
    if (!status.isRecording || !status.startedAt) {
      setElapsedTime(0);
      return;
    }

    const updateElapsedTime = () => {
      const startTime = new Date(status.startedAt!).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);
    return () => clearInterval(interval);
  }, [status.isRecording, status.startedAt]);

  // 开始录制
  const handleStartRecording = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/live-sessions/${sessionId}/start-recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to start recording');
      }

      const data = await res.json();

      logger.info('Recording started', {
        sessionId,
        recordingId: data.recordingId,
      });

      // Status will be updated via SSE automatically
      // Optimistically update local state for immediate UI feedback
      setStatus({
        isRecording: true,
        recordingId: data.recordingId,
        startedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to start recording', error);
      setError(error.message || '启动录制失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 停止录制
  const handleStopRecording = async () => {
    setIsLoading(true);
    setError(null);
    setShowStopConfirm(false);

    try {
      const res = await fetch(`/api/live-sessions/${sessionId}/stop-recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordingId: status.recordingId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to stop recording');
      }

      logger.info('Recording stopped', {
        sessionId,
        recordingId: status.recordingId,
      });

      // Status will be updated via SSE automatically
      // Optimistically update local state for immediate UI feedback
      setStatus({ isRecording: false });
    } catch (error: any) {
      logger.error('Failed to stop recording', error);
      setError(error.message || '停止录制失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化时长
  const formatElapsedTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 如果没有权限，不显示控件
  if (!canRecord) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 录制按钮 */}
      {!status.isRecording ? (
        <Button
          onClick={handleStartRecording}
          disabled={isLoading}
          aria-label="开始录制"
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              启动中...
            </>
          ) : (
            <>
              <span className="mr-2">⏺️</span>
              开始录制
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={() => setShowStopConfirm(true)}
          disabled={isLoading}
          aria-label="停止录制"
          className="bg-gray-700 hover:bg-gray-800 text-white"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              停止中...
            </>
          ) : (
            <>
              <span className="mr-2">⏹️</span>
              停止录制
            </>
          )}
        </Button>
      )}

      {/* 录制状态指示器 */}
      {status.isRecording && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 border border-red-600/30 rounded-lg">
          {/* 脉冲红点 */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <div className="relative w-2 h-2 bg-red-600 rounded-full" />
          </div>

          {/* 时长 */}
          <span className="text-sm font-mono text-red-100">
            {formatElapsedTime(elapsedTime)}
          </span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg">
          <span className="text-xs text-red-200">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* 停止录制确认对话框 */}
      <Dialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>确认停止录制</DialogTitle>
            <DialogDescription className="text-gray-400">
              您确定要停止当前录制吗？录制时长：
              <span className="font-mono text-white ml-1">
                {formatElapsedTime(elapsedTime)}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStopConfirm(false)}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              取消
            </Button>
            <Button
              onClick={handleStopRecording}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确认停止
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
