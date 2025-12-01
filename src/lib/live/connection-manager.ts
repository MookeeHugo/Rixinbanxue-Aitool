/**
 * LiveKit 连接管理器
 * 处理 WebRTC 连接配置、状态监控和自动重连
 */

import { Room, RoomConnectOptions, ConnectionState, RoomEvent, DisconnectReason } from 'livekit-client';
import { logger } from '@/lib/logger';

// STUN/TURN 服务器配置
export const ICE_SERVERS: RTCIceServer[] = [
  // Google 公共 STUN 服务器
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
  },
  // 可以添加自定义 TURN 服务器（需要认证）
  // {
  //   urls: 'turn:your-turn-server.com:3478',
  //   username: 'username',
  //   credential: 'password',
  // },
];

// 连接选项配置
export const DEFAULT_CONNECT_OPTIONS: RoomConnectOptions = {
  autoSubscribe: true,
  rtcConfig: {
    iceServers: ICE_SERVERS,
    iceTransportPolicy: 'all', // 允许所有 ICE 候选（relay 和 host）
  },
};

// 连接重试配置
export interface RetryConfig {
  maxAttempts: number; // 最大重试次数
  baseDelay: number; // 基础延迟（毫秒）
  maxDelay: number; // 最大延迟（毫秒）
  backoffMultiplier: number; // 指数退避倍数
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000, // 1 秒
  maxDelay: 30000, // 30 秒
  backoffMultiplier: 2,
};

// 连接状态类型
export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

// 连接错误类型
export interface ConnectionError {
  code: string;
  message: string;
  details?: string;
  recoverable: boolean; // 是否可恢复（是否应该重试）
}

// 连接状态信息
export interface ConnectionInfo {
  status: ConnectionStatus;
  attempt: number; // 当前重试次数
  lastError?: ConnectionError;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'unknown';
}

/**
 * 连接管理器类
 * 封装 LiveKit Room 连接逻辑，提供自动重连和状态监控
 */
export class ConnectionManager {
  private room: Room;
  private retryConfig: RetryConfig;
  private currentAttempt = 0;
  private retryTimeout?: NodeJS.Timeout;
  private lastUrl?: string;
  private lastToken?: string;
  private lastOptions?: RoomConnectOptions;
  private connectionInfo: ConnectionInfo = {
    status: 'disconnected',
    attempt: 0,
  };
  private statusCallbacks: Array<(info: ConnectionInfo) => void> = [];

  constructor(room: Room, retryConfig: Partial<RetryConfig> = {}) {
    this.room = room;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.setupRoomListeners();
  }

  /**
   * 设置房间事件监听器
   */
  private setupRoomListeners() {
    // 监听连接状态变化
    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      logger.debug('[ConnectionManager] 连接状态变化:', state);
      this.handleConnectionStateChange(state);
    });

    // 监听断开连接
    this.room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
      logger.debug('[ConnectionManager] 已断开连接:', reason);
      this.handleDisconnect(reason);
    });

    // 监听重新连接中
    this.room.on(RoomEvent.Reconnecting, () => {
      logger.debug('[ConnectionManager] 正在重新连接...');
      this.updateStatus('reconnecting');
    });

    // 监听重新连接成功
    this.room.on(RoomEvent.Reconnected, () => {
      logger.debug('[ConnectionManager] 重新连接成功');
      this.currentAttempt = 0; // 重置重试计数
      this.updateStatus('connected');
    });

    // 监听连接质量变化
    this.room.on(RoomEvent.ConnectionQualityChanged, (quality: unknown) => {
      this.updateConnectionQuality(quality);
    });
  }

  /**
   * 连接到房间
   */
  async connect(url: string, token: string, options?: Partial<RoomConnectOptions>): Promise<void> {
    this.updateStatus('connecting');
    this.currentAttempt++;

    try {
      const connectOptions = {
        ...DEFAULT_CONNECT_OPTIONS,
        ...options,
      };

      this.lastUrl = url;
      this.lastToken = token;
      this.lastOptions = connectOptions;

      await this.room.connect(url, token, connectOptions);

      logger.debug('[ConnectionManager] 连接成功');
      this.currentAttempt = 0; // 重置重试计数
      this.updateStatus('connected');
    } catch (error: unknown) {
      logger.error('[ConnectionManager] 连接失败:', { error: error });
      this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * 处理连接状态变化
   */
  private handleConnectionStateChange(state: ConnectionState) {
    switch (state) {
      case ConnectionState.Connected:
        this.updateStatus('connected');
        break;
      case ConnectionState.Connecting:
        this.updateStatus('connecting');
        break;
      case ConnectionState.Reconnecting:
        this.updateStatus('reconnecting');
        break;
      case ConnectionState.Disconnected:
        this.updateStatus('disconnected');
        break;
      default:
        logger.warn('[ConnectionManager] 未知连接状态:', { error: state });
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(reason?: DisconnectReason) {
    this.updateStatus('disconnected', {
      code: 'DISCONNECTED',
      message: reason ? String(reason) : '连接已断开',
      recoverable: true,
    });

    // 如果不是主动断开，尝试重连
    if (reason !== DisconnectReason.CLIENT_INITIATED && this.shouldRetry()) {
      this.scheduleReconnect();
    }
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(error: unknown) {
    const err = error as { code?: string; message?: string };
    const connectionError: ConnectionError = {
      code: err.code || 'CONNECTION_FAILED',
      message: err.message || '连接失败',
      details: this.getErrorDetails(error),
      recoverable: this.isRecoverableError(error),
    };

    this.updateStatus('failed', connectionError);

    // 如果错误可恢复且应该重试，则安排重连
    if (connectionError.recoverable && this.shouldRetry()) {
      this.scheduleReconnect();
    }
  }

  /**
   * 获取错误详情
   */
  private getErrorDetails(error: unknown): string {
    const err = error as { message?: string; stack?: string };
    if (err.message?.includes('timeout')) {
      return '连接超时，请检查网络连接';
    }
    if (err.message?.includes('ice')) {
      return 'WebRTC ICE 连接失败，可能需要配置 TURN 服务器';
    }
    if (err.message?.includes('token')) {
      return 'Token 无效或已过期';
    }
    return err.stack || (error ? String(error) : '未知错误');
  }

  /**
   * 判断错误是否可恢复
   */
  private isRecoverableError(error: unknown): boolean {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : '';

    if (!message) {
      return true;
    }

    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('timeout')) {
      return true;
    }

    if (message.toLowerCase().includes('ice')) {
      return true;
    }

    if (message.toLowerCase().includes('token') || message.toLowerCase().includes('unauthorized')) {
      return false;
    }

    return true;
  }


  /**
   * 判断是否应该重试
   */
  private shouldRetry(): boolean {
    return this.currentAttempt < this.retryConfig.maxAttempts;
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private getRetryDelay(): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, this.currentAttempt - 1),
      this.retryConfig.maxDelay
    );
    // 添加随机抖动（±20%）避免多个客户端同时重连
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.floor(delay + jitter);
  }

  /**
   * 安排重连
   */
  private scheduleReconnect() {
    const delay = this.getRetryDelay();
    logger.debug(`[ConnectionManager] 将在 ${delay}ms 后重试连接（第 ${this.currentAttempt}/${this.retryConfig.maxAttempts} 次）`);

    // 清除之前的重试计时器
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(async () => {
      logger.debug('[ConnectionManager] 开始重新连接...');
      this.updateStatus('reconnecting');

      try {
        if (!this.lastUrl || !this.lastToken) {
          logger.error('[ConnectionManager] 缺少连接参数，无法重连');
          this.updateStatus('failed', {
            code: 'MISSING_PARAMS',
            message: '缺少连接参数，无法重连',
            recoverable: false,
          });
          return;
        }

        await this.room.connect(this.lastUrl, this.lastToken, this.lastOptions || DEFAULT_CONNECT_OPTIONS);
        logger.debug('[ConnectionManager] 重连成功');
        this.currentAttempt = 0;
        this.updateStatus('connected');
      } catch (error: unknown) {
        logger.error('[ConnectionManager] 重连失败:', { error: error });
        this.handleConnectionError(error);
      }
    }, delay);
  }

  /**
   * 更新连接质量
   */
  private updateConnectionQuality(quality: unknown) {
    let qualityLevel: ConnectionInfo['connectionQuality'] = 'unknown';
    const score = typeof quality === 'number' ? quality : 0;

    // LiveKit 的连接质量评分（0-5）
    if (score >= 4) {
      qualityLevel = 'excellent';
    } else if (score >= 2) {
      qualityLevel = 'good';
    } else {
      qualityLevel = 'poor';
    }

    this.connectionInfo.connectionQuality = qualityLevel;
    this.notifyStatusCallbacks();
  }

  /**
   * 更新状态
   */
  private updateStatus(status: ConnectionStatus, error?: ConnectionError) {
    this.connectionInfo = {
      status,
      attempt: this.currentAttempt,
      lastError: error,
      connectionQuality: this.connectionInfo.connectionQuality,
    };
    this.notifyStatusCallbacks();
  }

  /**
   * 通知所有状态回调
   */
  private notifyStatusCallbacks() {
    this.statusCallbacks.forEach(callback => {
      try {
        callback({ ...this.connectionInfo });
      } catch (error) {
        logger.error('[ConnectionManager] 状态回调执行错误:', { error: error });
      }
    });
  }

  /**
   * 订阅连接状态变化
   */
  onStatusChange(callback: (info: ConnectionInfo) => void) {
    this.statusCallbacks.push(callback);
    // 立即触发一次回调，提供当前状态
    callback({ ...this.connectionInfo });

    // 返回取消订阅函数
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 获取当前连接状态
   */
  getStatus(): ConnectionInfo {
    return { ...this.connectionInfo };
  }

  /**
   * 手动触发重连
   */
  async reconnect(): Promise<void> {
    logger.debug('[ConnectionManager] 手动触发重连');
    this.currentAttempt = 0; // 重置计数
    if (!this.lastUrl || !this.lastToken) {
      throw new Error('缺少连接参数，无法重连');
    }

    this.updateStatus('reconnecting');
    try {
      await this.room.connect(this.lastUrl, this.lastToken, this.lastOptions || DEFAULT_CONNECT_OPTIONS);
      this.updateStatus('connected');
    } catch (error: unknown) {
      logger.error('[ConnectionManager] 手动重连失败:', { error: error });
      this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    logger.debug('[ConnectionManager] 主动断开连接');
    // 清除重试计时器
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = undefined;
    }
    this.room.disconnect();
    this.updateStatus('disconnected');
  }

  /**
   * 清理资源
   */
  destroy() {
    this.disconnect();
    this.statusCallbacks = [];
  }
}

/**
 * 创建连接管理器的便捷函数
 */
export function createConnectionManager(
  room: Room,
  retryConfig?: Partial<RetryConfig>
): ConnectionManager {
  return new ConnectionManager(room, retryConfig);
}
