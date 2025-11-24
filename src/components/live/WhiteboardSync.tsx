"use client";

import { useEffect, useCallback } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { DataPacket_Kind, RoomEvent } from 'livekit-client';
import { logger } from '@/lib/logger';

interface DrawAction {
  tool: "pen" | "eraser" | "line" | "rectangle" | "circle" | "text";
  color: string;
  lineWidth: number;
  points?: { x: number; y: number }[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  text?: string;
}

interface SharedFile {
  id: string;
  session_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  storage_url: string;
  is_displayed_on_whiteboard: boolean;
  created_at: string;
  uploader_name?: string;
}

interface WhiteboardSyncProps {
  onRemoteDrawAction?: (action: DrawAction) => void;
  onRemoteFileShared?: (file: SharedFile) => void;
  onRemoteFileDisplayed?: (file: SharedFile) => void;
}

/**
 * WhiteboardSync handles broadcasting and receiving drawing actions via LiveKit Data Channel
 * This component must be rendered inside LiveKitRoom context
 */
export function WhiteboardSync({
  onRemoteDrawAction,
  onRemoteFileShared,
  onRemoteFileDisplayed
}: WhiteboardSyncProps) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: any,
      kind?: DataPacket_Kind
    ) => {
      // Only process reliable data packets (not lossy)
      if (kind !== DataPacket_Kind.RELIABLE) return;

      try {
        const decoder = new TextDecoder();
        const message = decoder.decode(payload);
        const data = JSON.parse(message);

        // Handle different event types
        switch (data.type) {
          case 'whiteboard-draw':
            if (data.action) {
              onRemoteDrawAction?.(data.action);
            }
            break;

          case 'file-shared':
            if (data.file) {
              onRemoteFileShared?.(data.file);
            }
            break;

          case 'file-displayed':
            if (data.file) {
              onRemoteFileDisplayed?.(data.file);
            }
            break;

          default:
            console.debug('未知的数据类型:', data.type);
        }
      } catch (error) {
        logger.error('解析数据失败:', { error: error });
      }
    };

    // Listen for data received events
    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, onRemoteDrawAction, onRemoteFileShared, onRemoteFileDisplayed]);

  return null; // This is a headless component
}

/**
 * Hook to broadcast drawing actions to all participants
 */
export function useBroadcastDrawAction() {
  const room = useRoomContext();

  const broadcastDrawAction = useCallback(
    (action: DrawAction) => {
      // Check if room and participant are available and connected
      if (!room?.localParticipant) {
        return;
      }

      // Check connection state
      if (room.state !== 'connected') {
        console.warn('房间未连接，跳过广播绘图动作');
        return;
      }

      try {
        const message = JSON.stringify({
          type: 'whiteboard-draw',
          action,
          timestamp: Date.now(),
        });

        const encoder = new TextEncoder();
        const data = encoder.encode(message);

        // Send as reliable data to ensure delivery
        room.localParticipant.publishData(data, { reliable: true });
      } catch (error) {
        // Silently ignore connection errors during disconnection
        if (error instanceof Error && error.message.includes('closed')) {
          console.debug('连接已关闭，跳过广播');
        } else {
          logger.error('广播绘图动作失败:', { error: error });
        }
      }
    },
    [room]
  );

  return broadcastDrawAction;
}

/**
 * Hook to broadcast file shared events to all participants
 */
export function useBroadcastFileShared() {
  const room = useRoomContext();

  const broadcastFileShared = useCallback(
    (file: SharedFile) => {
      if (!room?.localParticipant || room.state !== 'connected') {
        return;
      }

      try {
        const message = JSON.stringify({
          type: 'file-shared',
          file,
          timestamp: Date.now(),
        });

        const encoder = new TextEncoder();
        const data = encoder.encode(message);

        room.localParticipant.publishData(data, { reliable: true });
      } catch (error) {
        if (error instanceof Error && error.message.includes('closed')) {
          console.debug('连接已关闭，跳过广播');
        } else {
          logger.error('广播文件共享事件失败:', { error: error });
        }
      }
    },
    [room]
  );

  return broadcastFileShared;
}

/**
 * Hook to broadcast file displayed on whiteboard events
 */
export function useBroadcastFileDisplayed() {
  const room = useRoomContext();

  const broadcastFileDisplayed = useCallback(
    (file: SharedFile) => {
      if (!room?.localParticipant || room.state !== 'connected') {
        return;
      }

      try {
        const message = JSON.stringify({
          type: 'file-displayed',
          file,
          timestamp: Date.now(),
        });

        const encoder = new TextEncoder();
        const data = encoder.encode(message);

        room.localParticipant.publishData(data, { reliable: true });
      } catch (error) {
        if (error instanceof Error && error.message.includes('closed')) {
          console.debug('连接已关闭，跳过广播');
        } else {
          logger.error('广播文件显示事件失败:', { error: error });
        }
      }
    },
    [room]
  );

  return broadcastFileDisplayed;
}
