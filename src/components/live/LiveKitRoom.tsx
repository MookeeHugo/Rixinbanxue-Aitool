"use client";

import { useEffect, useState, useRef } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoom,
} from '@livekit/components-react';
import { Track, Room } from 'livekit-client';
import '@/styles/livekit.css';
import { ConnectionManager, ConnectionInfo, DEFAULT_CONNECT_OPTIONS } from '@/lib/live/connection-manager';
import { logger } from '@/lib/logger'

interface LiveKitRoomComponentProps {
  sessionId: string;
  onDisconnect?: () => void;
  onMicToggle?: (enabled: boolean) => void;
  onCameraToggle?: (enabled: boolean) => void;
  onScreenShareToggle?: (enabled: boolean) => void;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  screenShareEnabled?: boolean;
  children?: React.ReactNode;
}

interface TokenResponse {
  token: string;
  livekitUrl: string;
  roomId: string;
}

export function LiveKitRoomComponent({
  sessionId,
  onDisconnect,
  onMicToggle,
  onCameraToggle,
  onScreenShareToggle,
  micEnabled = true,
  cameraEnabled = true,
  screenShareEnabled = false,
  children,
}: LiveKitRoomComponentProps) {
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
          <div className="text-lg">正在连接直播...</div>
          <div className="text-sm text-gray-500 mt-2">请稍候</div>
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
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

  return (
    <div className="h-full">
      <LiveKitRoom
        video={cameraEnabled}
        audio={micEnabled}
        token={tokenInfo.token}
        serverUrl={tokenInfo.livekitUrl}
        data-lk-theme="default"
        style={{ height: '100%' }}
        onDisconnected={onDisconnect}
        connectOptions={DEFAULT_CONNECT_OPTIONS}
      >
        {/* 连接状态监控 */}
        <ConnectionStatusMonitor />
        {/* 使用自定义布局，不显示控制栏 */}
        <MyVideoConference />
        {/* 音频渲染器 */}
        <RoomAudioRenderer />
        {/* 媒体控制器 */}
        <MediaControlsHandler
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          screenShareEnabled={screenShareEnabled}
          onMicToggle={onMicToggle}
          onCameraToggle={onCameraToggle}
          onScreenShareToggle={onScreenShareToggle}
        />
        {/* 渲染children以支持在LiveKit上下文中的其他组件 */}
        {children}
      </LiveKitRoom>
    </div>
  );
}

// 简化版的自定义布局组件（可选）
export function SimpleLiveKitRoom({
  sessionId,
  onDisconnect,
  onMicToggle,
  onCameraToggle,
  onScreenShareToggle,
  micEnabled = true,
  cameraEnabled = true,
  screenShareEnabled = false,
}: LiveKitRoomComponentProps) {
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
          <div className="text-lg">正在连接直播...</div>
        </div>
      </div>
    );
  }

  if (error || !tokenInfo) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center text-red-600">
          <div className="text-lg font-semibold">连接失败</div>
          <div className="text-sm mt-2">{error || '未知错误'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <LiveKitRoom
        video={cameraEnabled}
        audio={micEnabled}
        token={tokenInfo.token}
        serverUrl={tokenInfo.livekitUrl}
        data-lk-theme="default"
        style={{ height: '100%' }}
        onDisconnected={onDisconnect}
        connectOptions={DEFAULT_CONNECT_OPTIONS}
      >
        <ConnectionStatusMonitor />
        <MyVideoConference />
        <RoomAudioRenderer />
        <MediaControlsHandler
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          screenShareEnabled={screenShareEnabled}
          onMicToggle={onMicToggle}
          onCameraToggle={onCameraToggle}
          onScreenShareToggle={onScreenShareToggle}
        />
      </LiveKitRoom>
    </div>
  );
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} style={{ height: '100%', width: '100%' }}>
      <ParticipantTile />
    </GridLayout>
  );
}

interface MediaControlsHandlerProps {
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  screenShareEnabled?: boolean;
  onMicToggle?: (enabled: boolean) => void;
  onCameraToggle?: (enabled: boolean) => void;
  onScreenShareToggle?: (enabled: boolean) => void;
}

function MediaControlsHandler({
  micEnabled,
  cameraEnabled,
  screenShareEnabled,
  onMicToggle,
  onCameraToggle,
  onScreenShareToggle,
}: MediaControlsHandlerProps) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!localParticipant) return;

    const updateMicState = async () => {
      try {
        await localParticipant.setMicrophoneEnabled(micEnabled ?? true);
        // 同步实际状态回父组件
        const isMicEnabled = localParticipant.isMicrophoneEnabled;
        if (onMicToggle && isMicEnabled !== micEnabled) {
          onMicToggle(isMicEnabled);
        }
      } catch (error) {
        logger.error('设置麦克风状态失败:', { error: error });
      }
    };

    updateMicState();
  }, [micEnabled, localParticipant, onMicToggle]);

  useEffect(() => {
    if (!localParticipant) return;

    const updateCameraState = async () => {
      try {
        await localParticipant.setCameraEnabled(cameraEnabled ?? true);
        // 同步实际状态回父组件
        const isCameraEnabled = localParticipant.isCameraEnabled;
        if (onCameraToggle && isCameraEnabled !== cameraEnabled) {
          onCameraToggle(isCameraEnabled);
        }
      } catch (error) {
        logger.error('设置摄像头状态失败:', { error: error });
      }
    };

    updateCameraState();
  }, [cameraEnabled, localParticipant, onCameraToggle]);

  useEffect(() => {
    if (!localParticipant) return;

    const updateScreenShareState = async () => {
      try {
        await localParticipant.setScreenShareEnabled(screenShareEnabled ?? false);
        // 同步实际状态回父组件
        const isScreenShareEnabled = localParticipant.isScreenShareEnabled;
        if (onScreenShareToggle && isScreenShareEnabled !== screenShareEnabled) {
          onScreenShareToggle(isScreenShareEnabled);
        }
      } catch (error) {
        logger.error('设置屏幕共享状态失败:', { error: error });
        // 如果失败（比如用户拒绝），通知父组件关闭
        if (onScreenShareToggle && screenShareEnabled) {
          onScreenShareToggle(false);
        }
      }
    };

    updateScreenShareState();
  }, [screenShareEnabled, localParticipant, onScreenShareToggle]);

  return null; // 这是一个无UI的控制组件
}

/**
 * 连接状态监控组件
 * 显示实时连接状态和质量指示器
 */
function ConnectionStatusMonitor() {
  const room = useRoom();
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    status: 'connecting',
    attempt: 0,
  });
  const [showDetails, setShowDetails] = useState(false);
  const connectionManagerRef = useRef<ConnectionManager | null>(null);

  useEffect(() => {
    if (!room) return;

    // 创建连接管理器
    const manager = new ConnectionManager(room.room as Room);
    connectionManagerRef.current = manager;

    // 订阅状态变化
    const unsubscribe = manager.onStatusChange((info) => {
      setConnectionInfo(info);
      // 如果连接失败或质量差，自动显示详情
      if (info.status === 'failed' || info.connectionQuality === 'poor') {
        setShowDetails(true);
      }
    });

    return () => {
      unsubscribe();
      manager.destroy();
    };
  }, [room]);

  // 如果连接正常且质量好，不显示任何内容
  if (connectionInfo.status === 'connected' && connectionInfo.connectionQuality !== 'poor') {
    return null;
  }

  // 获取状态显示信息
  const getStatusDisplay = () => {
    switch (connectionInfo.status) {
      case 'connecting':
        return {
          text: '正在连接...',
          color: 'bg-yellow-500',
          icon: '⏳',
        };
      case 'reconnecting':
        return {
          text: `重新连接中... (${connectionInfo.attempt}/${5})`,
          color: 'bg-orange-500',
          icon: '🔄',
        };
      case 'failed':
        return {
          text: '连接失败',
          color: 'bg-red-500',
          icon: '⚠️',
        };
      case 'disconnected':
        return {
          text: '已断开连接',
          color: 'bg-gray-500',
          icon: '🔌',
        };
      default:
        return {
          text: '连接中',
          color: 'bg-blue-500',
          icon: '📡',
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-lg p-3 min-w-[200px]">
        {/* 状态指示器 */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusDisplay.color} animate-pulse`} />
          <span className="text-white text-sm font-medium">
            {statusDisplay.icon} {statusDisplay.text}
          </span>
          {connectionInfo.lastError && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="ml-auto text-gray-400 hover:text-white text-xs"
            >
              {showDetails ? '隐藏' : '详情'}
            </button>
          )}
        </div>

        {/* 连接质量指示器 */}
        {connectionInfo.connectionQuality && connectionInfo.status === 'connected' && (
          <div className="mt-2 text-xs text-gray-400">
            质量: {
              connectionInfo.connectionQuality === 'excellent' ? '优秀 🟢' :
              connectionInfo.connectionQuality === 'good' ? '良好 🟡' :
              connectionInfo.connectionQuality === 'poor' ? '较差 🔴' : '未知'
            }
          </div>
        )}

        {/* 错误详情 */}
        {showDetails && connectionInfo.lastError && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-300">
              <div className="font-semibold">错误信息:</div>
              <div className="mt-1 text-gray-400">{connectionInfo.lastError.message}</div>
              {connectionInfo.lastError.details && (
                <div className="mt-2 text-gray-500 text-[10px] max-w-[300px] overflow-auto max-h-[100px]">
                  {connectionInfo.lastError.details}
                </div>
              )}
            </div>
            {connectionInfo.lastError.recoverable && (
              <button
                onClick={() => {
                  connectionManagerRef.current?.reconnect().catch(console.error);
                }}
                className="mt-3 w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
              >
                手动重连
              </button>
            )}
            {!connectionInfo.lastError.recoverable && (
              <div className="mt-3 text-xs text-yellow-400">
                ⚠️ 此错误无法自动恢复，建议刷新页面
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
