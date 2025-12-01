import type {
  ILiveProvider,
  CreateRoomInput,
  CreateRoomResult,
  IssueTokenInput,
  IssueTokenResult,
  StartRecordingInput,
  StartRecordingResult,
  StopRecordingInput,
} from "@/lib/live/interfaces";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { EgressManager, createEgressManager } from "@/lib/live/egress";
import { logger } from "@/lib/logger";

export class LiveKitAdapter implements ILiveProvider {
  private apiKey: string;
  private apiSecret: string;
  private livekitUrl: string;
  private egressManager: EgressManager;
  // 存储活跃的录制会话 (sessionId -> egressId)
  private activeRecordings: Map<string, string> = new Map();

  constructor() {
    // 在生产环境必须提供真实凭证
    const isProduction = process.env.NODE_ENV === 'production';

    this.apiKey = process.env.LIVEKIT_API_KEY || (isProduction ? '' : 'devkey');
    this.apiSecret = process.env.LIVEKIT_API_SECRET || (isProduction ? '' : 'secret');
    this.livekitUrl = process.env.LIVEKIT_URL || (isProduction ? '' : 'http://localhost:7880');

    // 验证必需的环境变量
    if (!this.apiKey || !this.apiSecret || !this.livekitUrl) {
      throw new Error(
        'Missing required LiveKit environment variables: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL'
      );
    }

    // 初始化 Egress 管理器
    this.egressManager = createEgressManager({
      livekitUrl: this.livekitUrl,
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
    });

    logger.info('LiveKitAdapter initialized', {
      livekitUrl: this.livekitUrl,
      egressEnabled: true,
    });
  }

  async createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
    // 使用LiveKit RoomServiceClient创建房间
    const roomService = new RoomServiceClient(this.livekitUrl, this.apiKey, this.apiSecret);
    const roomId = `room_${input.sessionId}`;

    try {
      // 创建房间（如果不存在）
      await roomService.createRoom({
        name: roomId,
        emptyTimeout: 10 * 60, // 10分钟无人后自动关闭
        maxParticipants: 100,
      });

      return { roomId, provider: "livekit" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // 如果房间已存在，直接返回
      if (message.includes('already exists')) {
        return { roomId, provider: "livekit" };
      }
      throw error instanceof Error ? error : new Error(message);
    }
  }

  async issueToken(input: IssueTokenInput): Promise<IssueTokenResult> {
    // 使用LiveKit SDK签发AccessToken
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: input.userId,
      ttl: input.ttlSeconds ?? 3600,
    });

    // 设置权限
    at.addGrant({
      roomJoin: true,
      room: input.roomId,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    const exp = Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 3600);

    return { token, expiresAt: exp };
  }

  async startRecording(input: StartRecordingInput): Promise<StartRecordingResult> {
    logger.info('Starting recording', {
      sessionId: input.sessionId,
      roomId: input.roomId,
      userId: input.userId,
    });

    try {
      // 检查是否已经有活跃的录制
      if (this.activeRecordings.has(input.sessionId)) {
        const existingEgressId = this.activeRecordings.get(input.sessionId);
        logger.warn('Recording already active for session', {
          sessionId: input.sessionId,
          egressId: existingEgressId,
        });
        return { recordingId: existingEgressId! };
      }

      // 启动 Egress 录制
      const recordingInfo = await this.egressManager.startRoomRecording({
        sessionId: input.sessionId,
        roomId: input.roomId,
        userId: input.userId,
        layout: 'grid', // 默认使用网格布局
        outputConfig: {
          format: 'mp4', // 输出 MP4 格式
          width: 1920,
          height: 1080,
          videoBitrate: 3000000, // 3 Mbps
          audioBitrate: 128000, // 128 kbps
        },
      });

      // 保存活跃录制
      this.activeRecordings.set(input.sessionId, recordingInfo.egressId);

      logger.info('Recording started successfully', {
        sessionId: input.sessionId,
        egressId: recordingInfo.egressId,
      });

      return { recordingId: recordingInfo.egressId, egressId: recordingInfo.egressId };
    } catch (error: unknown) {
      logger.error('Failed to start recording', error, {
        sessionId: input.sessionId,
        roomId: input.roomId,
      });
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start recording: ${message}`);
    }
  }

  async stopRecording(input: StopRecordingInput): Promise<void> {
    logger.info('Stopping recording', {
      sessionId: input.sessionId,
      recordingId: input.recordingId,
    });

    try {
      // 使用提供的 recordingId 或从 activeRecordings 查找
      const egressId = input.recordingId || this.activeRecordings.get(input.sessionId);

      if (!egressId) {
        logger.warn('No active recording found for session', {
          sessionId: input.sessionId,
        });
        return; // 没有活跃录制，直接返回
      }

      // 停止 Egress 录制
      await this.egressManager.stopRecording(egressId);

      // 从活跃录制中移除
      this.activeRecordings.delete(input.sessionId);

      logger.info('Recording stopped successfully', {
        sessionId: input.sessionId,
        egressId,
      });
    } catch (error: unknown) {
      logger.error('Failed to stop recording', error, {
        sessionId: input.sessionId,
        recordingId: input.recordingId,
      });
      // 即使停止失败，也从活跃录制中移除
      this.activeRecordings.delete(input.sessionId);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to stop recording: ${message}`);
    }
  }

  /**
   * 获取活跃录制的 Egress ID
   */
  getActiveRecordingId(sessionId: string): string | undefined {
    return this.activeRecordings.get(sessionId);
  }

  /**
   * 获取所有活跃录制
   */
  getAllActiveRecordings(): Map<string, string> {
    return new Map(this.activeRecordings);
  }
}
