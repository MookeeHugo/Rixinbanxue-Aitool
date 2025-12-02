"use client";

import { useEffect, useState } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import '@/styles/livekit.css';
import { logger } from '@/lib/logger';

interface LiveRoomProviderProps {
  sessionId: string;
  onDisconnect?: () => void;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  children: React.ReactNode;
}

interface TokenResponse {
  token: string;
  livekitUrl: string;
  roomId: string;
}

/**
 * LiveRoomProvider provides LiveKit context to all children components
 * This allows components like LiveParticipants to use LiveKit hooks
 */
export function LiveRoomProvider({
  sessionId,
  onDisconnect,
  micEnabled = true,
  cameraEnabled = true,
  children,
}: LiveRoomProviderProps) {
  const [tokenInfo, setTokenInfo] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchToken() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/live-sessions/${sessionId}/token`, {
          method: 'POST',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '获取token失败');
        }

        const data = await response.json();

        if (mounted) {
          setTokenInfo(data);
        }
      } catch (err: any) {
        logger.error('获取LiveKit token失败:', { error: err });
        if (mounted) {
          setError(err.message || '获取token失败');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchToken();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="text-lg text-white">正在连接直播...</div>
          <div className="text-sm text-slate-400 mt-2">请稍候</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center text-red-600">
          <div className="text-lg font-semibold">连接失败</div>
          <div className="text-sm mt-2">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            重新尝试
          </button>
        </div>
      </div>
    );
  }

  if (!tokenInfo) {
    return null;
  }

  const handleConnectionError = (error: Error) => {
    logger.error('LiveKit 连接错误:', { error: error });
    // 不要自动跳转，而是显示错误信息
    setError(`连接错误: ${error.message}`);
  };

  const handleDisconnected = () => {
    logger.debug('LiveKit 已断开连接');
    if (onDisconnect) {
      onDisconnect();
    }
  };

  return (
    <LiveKitRoom
      video={cameraEnabled}
      audio={micEnabled}
      token={tokenInfo.token}
      serverUrl={tokenInfo.livekitUrl}
      data-lk-theme="default"
      onDisconnected={handleDisconnected}
      onError={handleConnectionError}
      connect={true}
      options={{
        // 添加重连配置
        reconnectPolicy: {
          nextRetryDelayInMs: (context) => {
            // 限制最多5次重连
            if (context.retryCount >= 5) {
              return null;
            }
            // 自定义重连延迟：1s, 2s, 4s, 8s, ...
            return Math.min(1000 * Math.pow(2, context.retryCount), 10000);
          },
        },
        // 断开连接后自动重连
        disconnectOnPageLeave: false,
      }}
    >
      {children}
    </LiveKitRoom>
  );
}
