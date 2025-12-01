/**
 * LiveKit Egress 配置管理器
 * 处理服务端录制功能
 */

import { EgressClient, EncodedFileOutput } from 'livekit-server-sdk';
import { logger } from '@/lib/logger';

// Egress 输出配置
export interface EgressOutputConfig {
  filepath: string; // 输出文件路径（相对于存储桶）
  format?: 'mp4' | 'webm'; // 输出格式
  width?: number; // 视频宽度
  height?: number; // 视频高度
  videoBitrate?: number; // 视频比特率
  audioBitrate?: number; // 音频比特率
}

// Egress 录制选项
export interface EgressRecordingOptions {
  sessionId: string;
  roomId: string;
  userId: string; // 发起录制的用户ID
  title?: string; // 录制标题
  layout?: 'grid' | 'speaker' | 'custom'; // 布局类型
  outputConfig?: Partial<EgressOutputConfig>;
}

// Egress 录制信息
export interface EgressRecordingInfo {
  egressId: string; // Egress 任务 ID
  roomId: string;
  sessionId: string;
  startedAt: Date;
  status: 'starting' | 'active' | 'ending' | 'complete' | 'failed';
  outputUrl?: string;
  error?: string;
}

export interface StorageConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKey?: string;
  secret?: string;
}

/**
 * LiveKit Egress 管理器
 */
export class EgressManager {
  private egressClient: EgressClient;
  private apiKey: string;
  private apiSecret: string;
  private livekitUrl: string;
  private storageConfig: StorageConfig;

  constructor(config: {
    livekitUrl: string;
    apiKey: string;
    apiSecret: string;
    storageConfig?: StorageConfig;
  }) {
    this.livekitUrl = config.livekitUrl;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;

    // 创建 Egress 客户端
    this.egressClient = new EgressClient(this.livekitUrl, this.apiKey, this.apiSecret);

    // 存储配置（用于直接上传）
    this.storageConfig = config.storageConfig || {
      bucket: 'live-recordings',
    };

    logger.info('EgressManager initialized', {
      livekitUrl: this.livekitUrl,
      storageConfigured: !!config.storageConfig,
    });
  }

  /**
   * 启动房间录制
   */
  async startRoomRecording(options: EgressRecordingOptions): Promise<EgressRecordingInfo> {
    const perfLogger = logger.child({ operation: 'startRoomRecording', sessionId: options.sessionId });
    perfLogger.info('Starting room recording');

    try {
      // 构建输出配置
      const outputConfig = this.buildOutputConfig(options);

      perfLogger.debug('Egress request prepared', {
        roomId: options.roomId,
        layout: this.getLayoutType(options.layout),
        output: outputConfig,
      });

      // 发起录制
      const egressInfo = await this.egressClient.startRoomCompositeEgress(
        options.roomId,
        outputConfig,
        {
          layout: this.getLayoutType(options.layout),
        }
      );

      if (!egressInfo.egressId) {
        throw new Error('Failed to start egress: no egress ID returned');
      }

      perfLogger.info('Recording started successfully', {
        egressId: egressInfo.egressId,
        status: egressInfo.status,
      });

      return {
        egressId: egressInfo.egressId,
        roomId: options.roomId,
        sessionId: options.sessionId,
        startedAt: new Date(),
        status: this.mapEgressStatus(egressInfo.status),
      };
    } catch (error: unknown) {
      perfLogger.error('Failed to start recording', { error });
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start recording: ${message}`);
    }
  }

  /**
   * 停止录制
   */
  async stopRecording(egressId: string): Promise<void> {
    logger.info('Stopping recording', { egressId });

    try {
      await this.egressClient.stopEgress(egressId);
      logger.info('Recording stopped successfully', { egressId });
    } catch (error: unknown) {
      logger.error('Failed to stop recording', error, { egressId });
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to stop recording: ${message}`);
    }
  }

  /**
   * 获取录制状态
   */
  async getRecordingStatus(egressId: string): Promise<EgressRecordingInfo | null> {
    try {
      const egressInfo = await this.egressClient.listEgress({ egressId });

      if (!egressInfo || egressInfo.length === 0) {
        return null;
      }

      const info = egressInfo[0];
      return {
        egressId: info.egressId || egressId,
        roomId: info.roomName || '',
        sessionId: '', // 需要从元数据中获取
        startedAt: new Date(
          typeof info.startedAt === 'bigint' ? Number(info.startedAt) : info.startedAt || 0
        ),
        status: this.mapEgressStatus(info.status),
        outputUrl: this.extractOutputUrl(info),
        error: info.error,
      };
    } catch (error: unknown) {
      logger.error('Failed to get recording status', error, { egressId });
      return null;
    }
  }

  /**
   * 列出房间的所有录制
   */
  async listRoomRecordings(roomId: string): Promise<EgressRecordingInfo[]> {
    try {
      const egressList = await this.egressClient.listEgress({ roomName: roomId });

      return egressList.map(info => ({
        egressId: info.egressId || '',
        roomId: info.roomName || roomId,
        sessionId: '',
        startedAt: new Date(
          typeof info.startedAt === 'bigint' ? Number(info.startedAt) : info.startedAt || 0
        ),
        status: this.mapEgressStatus(info.status),
        outputUrl: this.extractOutputUrl(info),
        error: info.error,
      }));
    } catch (error: unknown) {
      logger.error('Failed to list room recordings', error, { roomId });
      return [];
    }
  }

  /**
   * 构建输出配置
   */
  private buildOutputConfig(options: EgressRecordingOptions): EncodedFileOutput {
    const config = options.outputConfig || {};
    const filename = this.generateFilename(options);

    // 基础配置
    const output = {
      fileType: this.getFileType(config.format),
      filepath: config.filepath || filename,
      // 如需输出到自建 S3，请解除下方注释并填入凭证
      // s3: {
      //   bucket: this.storageConfig.bucket,
      //   accessKey: this.storageConfig.accessKey,
      //   secret: this.storageConfig.secret,
      //   region: this.storageConfig.region,
      // },
    } as EncodedFileOutput;

    return output;
  }

  /**
   * 生成文件名
   */
  private generateFilename(options: EgressRecordingOptions): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionPart = options.sessionId.substring(0, 8);
    const format = options.outputConfig?.format || 'mp4';

    return `recordings/${sessionPart}-${timestamp}.${format}`;
  }

  /**
   * 获取文件类型
   */
  private getFileType(format?: string): number {
    // LiveKit 文件类型枚举
    // 0 = DEFAULT (MP4)
    // 1 = MP4
    // 2 = OGG
    // 3 = WEBM
    switch (format) {
      case 'webm':
        return 3;
      case 'mp4':
      default:
        return 1;
    }
  }

  /**
   * 获取布局类型
   */
  private getLayoutType(layout?: string): string {
    switch (layout) {
      case 'speaker':
        return 'speaker-dark';
      case 'grid':
        return 'grid-dark';
      case 'custom':
        return 'custom';
      default:
        return 'grid-dark';
    }
  }

  /**
   * 映射 Egress 状态
   */
  private mapEgressStatus(status: unknown): EgressRecordingInfo['status'] {
    // LiveKit Egress 状态映射
    switch (status) {
      case 0: // EGRESS_STARTING
        return 'starting';
      case 1: // EGRESS_ACTIVE
        return 'active';
      case 2: // EGRESS_ENDING
        return 'ending';
      case 3: // EGRESS_COMPLETE
        return 'complete';
      case 4: // EGRESS_FAILED
        return 'failed';
      default:
        return 'starting';
    }
  }

  /**
   * 提取输出 URL
   */
  private extractOutputUrl(egressInfo: unknown): string | undefined {
    const info = egressInfo as {
      file?: { location?: string };
      stream?: { url?: string };
    };
    if (info.file?.location) {
      return info.file.location;
    }
    if (info.stream?.url) {
      return info.stream.url;
    }
    return undefined;
  }

  /**
   * 验证录制是否完成
   */
  async waitForRecordingComplete(
    egressId: string,
    options: {
      maxWaitMs?: number;
      checkIntervalMs?: number;
    } = {}
  ): Promise<EgressRecordingInfo> {
    const { maxWaitMs = 300000, checkIntervalMs = 2000 } = options; // 默认最多等待 5 分钟
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getRecordingStatus(egressId);

      if (!status) {
        throw new Error('Recording not found');
      }

      if (status.status === 'complete') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`Recording failed: ${status.error || 'Unknown error'}`);
      }

      // 等待后再次检查
      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }

    throw new Error('Recording completion timeout');
  }
}

/**
 * 创建 Egress 管理器的便捷函数
 */
export function createEgressManager(config?: {
  livekitUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  storageConfig?: StorageConfig;
}): EgressManager {
  return new EgressManager({
    livekitUrl: config?.livekitUrl || process.env.LIVEKIT_URL || 'http://localhost:7880',
    apiKey: config?.apiKey || process.env.LIVEKIT_API_KEY || 'devkey',
    apiSecret: config?.apiSecret || process.env.LIVEKIT_API_SECRET || 'secret',
    storageConfig: config?.storageConfig,
  });
}
