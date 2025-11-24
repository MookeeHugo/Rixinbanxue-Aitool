"use client";

import { useEffect } from 'react';
import {
  GridLayout,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { logger } from '@/lib/logger'

interface LiveVideoDisplayProps {
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  screenShareEnabled?: boolean;
  onMicToggle?: (enabled: boolean) => void;
  onCameraToggle?: (enabled: boolean) => void;
  onScreenShareToggle?: (enabled: boolean) => void;
}

export function LiveVideoDisplay({
  micEnabled = true,
  cameraEnabled = true,
  screenShareEnabled = false,
  onMicToggle,
  onCameraToggle,
  onScreenShareToggle,
}: LiveVideoDisplayProps) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <>
      <GridLayout tracks={tracks} style={{ height: '100%', width: '100%' }}>
        <ParticipantTile />
      </GridLayout>
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
    </>
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
