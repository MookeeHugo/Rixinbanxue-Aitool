/**
 * Webhook 事件处理器
 * 处理 LiveKit Webhook 事件并执行相应的业务逻辑
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Import broadcast function for SSE updates
// Note: This creates a circular dependency, but it's safe since we only call the function
let broadcastRecordingStatus: ((sessionId: string, status: any) => void) | null = null;

// Lazy load the broadcast function to avoid circular dependencies at module load time
function getBroadcastFunction() {
  if (!broadcastRecordingStatus) {
    try {
      const routeModule = require('../app/api/live-sessions/[id]/recording-status/stream/route');
      broadcastRecordingStatus = routeModule.broadcastRecordingStatus;
    } catch (error) {
      logger.warn('Failed to load broadcastRecordingStatus function', error);
    }
  }
  return broadcastRecordingStatus;
}

// Webhook 事件类型
export enum WebhookEventType {
  ROOM_STARTED = 'room_started',
  ROOM_FINISHED = 'room_finished',
  PARTICIPANT_JOINED = 'participant_joined',
  PARTICIPANT_LEFT = 'participant_left',
  TRACK_PUBLISHED = 'track_published',
  TRACK_UNPUBLISHED = 'track_unpublished',
  EGRESS_STARTED = 'egress_started',
  EGRESS_UPDATED = 'egress_updated',
  EGRESS_ENDED = 'egress_ended',
}

// Webhook 事件数据
export interface WebhookEvent {
  event: string;
  id: string; // 事件ID，用于幂等性检查
  createdAt: number;
  room?: {
    name: string;
    sid: string;
  };
  participant?: {
    identity: string;
    sid: string;
  };
  egressInfo?: {
    egressId: string;
    roomName: string;
    status: number;
    startedAt: number;
    endedAt?: number;
    error?: string;
    file?: {
      filename: string;
      location: string;
      size: number;
      duration: number;
    };
  };
}

/**
 * Webhook 处理器
 */
export class WebhookHandler {
  private supabase: any;

  constructor() {
    // 初始化 Supabase 客户端（使用 service role key）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * 处理 Webhook 事件
   */
  async handleEvent(event: WebhookEvent): Promise<void> {
    logger.info('Processing webhook event', {
      eventType: event.event,
      eventId: event.id,
    });

    try {
      // 检查幂等性
      const isDuplicate = await this.checkDuplicate(event.id);
      if (isDuplicate) {
        logger.warn('Duplicate webhook event, skipping', { eventId: event.id });
        return;
      }

      // 记录事件已处理
      await this.markEventProcessed(event.id, event);

      // 根据事件类型分发处理
      switch (event.event) {
        case WebhookEventType.ROOM_STARTED:
          await this.handleRoomStarted(event);
          break;
        case WebhookEventType.ROOM_FINISHED:
          await this.handleRoomFinished(event);
          break;
        case WebhookEventType.PARTICIPANT_JOINED:
          await this.handleParticipantJoined(event);
          break;
        case WebhookEventType.PARTICIPANT_LEFT:
          await this.handleParticipantLeft(event);
          break;
        case WebhookEventType.EGRESS_ENDED:
          await this.handleEgressEnded(event);
          break;
        default:
          logger.debug('Unhandled webhook event type', { eventType: event.event });
      }

      logger.info('Webhook event processed successfully', {
        eventType: event.event,
        eventId: event.id,
      });
    } catch (error: unknown) {
      logger.error('Failed to process webhook event', error, {
        eventType: event.event,
        eventId: event.id,
      });
      throw error;
    }
  }

  /**
   * 检查事件是否已处理（幂等性检查）
   */
  private async checkDuplicate(eventId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('Failed to check duplicate event', error);
      // 继续处理，避免因为检查失败而丢失事件
      return false;
    }

    return !!data;
  }

  /**
   * 标记事件已处理
   */
  private async markEventProcessed(eventId: string, event: WebhookEvent): Promise<void> {
    const { error } = await this.supabase
      .from('webhook_events')
      .insert({
        event_id: eventId,
        event_type: event.event,
        payload: event,
        processed_at: new Date().toISOString(),
      } as any);

    if (error) {
      logger.error('Failed to mark event as processed', error);
      // 不抛出错误，避免影响实际业务逻辑
    }
  }

  /**
   * 处理房间开始事件
   */
  private async handleRoomStarted(event: WebhookEvent): Promise<void> {
    if (!event.room) return;

    const roomName = event.room.name;
    const sessionId = this.extractSessionId(roomName);

    if (!sessionId) {
      logger.warn('Cannot extract session ID from room name', { roomName });
      return;
    }

    // 更新 session 状态为 'live'
    const { error } = await this.supabase
      .from('live_sessions')
      .update({
        status: 'live',
        started_at: new Date(event.createdAt).toISOString(),
      } as any)
      .eq('id', sessionId);

    if (error) {
      logger.error('Failed to update session status to live', error, { sessionId });
    } else {
      logger.info('Session marked as live', { sessionId });
    }
  }

  /**
   * 处理房间结束事件
   */
  private async handleRoomFinished(event: WebhookEvent): Promise<void> {
    if (!event.room) return;

    const roomName = event.room.name;
    const sessionId = this.extractSessionId(roomName);

    if (!sessionId) return;

    // 更新 session 状态为 'ended'
    const { error } = await this.supabase
      .from('live_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      } as any)
      .eq('id', sessionId);

    if (error) {
      logger.error('Failed to update session status to ended', error, { sessionId });
    } else {
      logger.info('Session marked as ended', { sessionId });
    }
  }

  /**
   * 处理参与者加入事件
   */
  private async handleParticipantJoined(event: WebhookEvent): Promise<void> {
    if (!event.room || !event.participant) return;

    logger.info('Participant joined', {
      room: event.room.name,
      participant: event.participant.identity,
    });

    // 可以在这里记录参与者信息到数据库
    // 例如：参与者列表、参与时长统计等
  }

  /**
   * 处理参与者离开事件
   */
  private async handleParticipantLeft(event: WebhookEvent): Promise<void> {
    if (!event.room || !event.participant) return;

    logger.info('Participant left', {
      room: event.room.name,
      participant: event.participant.identity,
    });
  }

  /**
   * 处理 Egress 结束事件（录制完成）
   */
  private async handleEgressEnded(event: WebhookEvent): Promise<void> {
    if (!event.egressInfo) {
      logger.warn('Egress ended event missing egressInfo');
      return;
    }

    const { egressId, roomName, status, file, error: egressError } = event.egressInfo;
    const sessionId = this.extractSessionId(roomName);

    if (!sessionId) {
      logger.warn('Cannot extract session ID from room name', { roomName });
      return;
    }

    logger.info('Processing egress ended event', {
      egressId,
      sessionId,
      status,
      hasFile: !!file,
    });

    // 如果录制失败
    if (status === 4 || egressError) {
      logger.error('Egress recording failed', new Error(egressError), {
        egressId,
        sessionId,
      });

      // 更新数据库记录状态为失败
      await this.updateRecordingStatus(egressId, sessionId, 'failed', egressError);

      // Broadcast recording stopped via SSE
      const broadcast = getBroadcastFunction();
      if (broadcast) {
        broadcast(sessionId, {
          isRecording: false,
          recordingId: null,
          startedAt: null,
          egressId: null,
          error: egressError,
        });
      }

      return;
    }

    // 如果录制成功且有文件
    if (file && file.location) {
      await this.processRecordingFile(egressId, sessionId, file);

      // Broadcast recording completed via SSE
      const broadcast = getBroadcastFunction();
      if (broadcast) {
        broadcast(sessionId, {
          isRecording: false,
          recordingId: null,
          startedAt: null,
          egressId: null,
        });
      }
    } else {
      logger.warn('Egress ended but no file location', { egressId, sessionId });
    }
  }

  /**
   * 处理录制文件
   */
  private async processRecordingFile(
    egressId: string,
    sessionId: string,
    file: NonNullable<WebhookEvent['egressInfo']>['file']
  ): Promise<void> {
    try {
      logger.info('Processing recording file', {
        egressId,
        sessionId,
        filename: file!.filename,
        size: file!.size,
      });

      // 从 Egress 输出位置下载文件
      // 注意：这取决于 Egress 的存储配置
      // 如果已经配置直接上传到 S3/Supabase，可能不需要下载

      // 创建或更新录制记录
      const { data: existingRecording } = await this.supabase
        .from('live_recordings')
        .select('*')
        .eq('session_id', sessionId)
        .eq('file_path', file!.filename)
        .maybeSingle();

      if (existingRecording) {
        // 更新现有记录
        await this.supabase
          .from('live_recordings')
          .update({
            file_url: file!.location,
            file_size: file!.size,
            duration_seconds: Math.floor(file!.duration / 1000),
            status: 'completed',
            completed_at: new Date().toISOString(),
          } as any)
          .eq('id', existingRecording.id);

        logger.info('Recording record updated', {
          recordingId: existingRecording.id,
          sessionId,
        });
      } else {
        // 创建新记录
        const { data: session } = await this.supabase
          .from('live_sessions')
          .select('created_by, title')
          .eq('id', sessionId)
          .single();

        await this.supabase
          .from('live_recordings')
          .insert({
            session_id: sessionId,
            title: session?.title ? `${session.title} - 服务端录制` : '服务端录制',
            file_path: file!.filename,
            file_url: file!.location,
            file_size: file!.size,
            duration_seconds: Math.floor(file!.duration / 1000),
            recorded_by: session?.created_by,
            status: 'completed',
            completed_at: new Date().toISOString(),
          } as any);

        logger.info('Recording record created', { sessionId });
      }
    } catch (error: unknown) {
      logger.error('Failed to process recording file', error, {
        egressId,
        sessionId,
      });
      throw error;
    }
  }

  /**
   * 更新录制状态
   */
  private async updateRecordingStatus(
    egressId: string,
    sessionId: string,
    status: string,
    error?: string
  ): Promise<void> {
    const { error: updateError } = await this.supabase
      .from('live_recordings')
      .update({
        status,
        error_message: error,
        completed_at: new Date().toISOString(),
      } as any)
      .eq('session_id', sessionId);

    if (updateError) {
      logger.error('Failed to update recording status', updateError, {
        egressId,
        sessionId,
        status,
      });
    }
  }

  /**
   * 从房间名提取 Session ID
   */
  private extractSessionId(roomName: string): string | null {
    // 假设房间名格式为 "room_{sessionId}" 或 "live-session-{sessionId}"
    const match = roomName.match(/(?:room_|live-session-)(.+)/);
    return match ? match[1] : null;
  }
}

/**
 * 创建 Webhook 处理器实例
 */
export function createWebhookHandler(): WebhookHandler {
  return new WebhookHandler();
}
