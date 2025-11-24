/**
 * Inngest客户端配置
 * @description 用于异步任务处理（替代BullMQ+Redis）
 */

import { Inngest } from 'inngest';

/**
 * 创建Inngest客户端实例
 */
export const inngest = new Inngest({
  id: 'rixin-ai-question-bank',
  name: '日新AI题库系统'
});

/**
 * 事件类型定义
 */
export type Events = {
  'question/upload.started': {
    data: {
      taskId: string;
      userId: string;
      fileName: string;
      fileUrl: string;
      traceId: string;
    };
  };
  'question/parse.completed': {
    data: {
      taskId: string;
      questionCount: number;
      avgConfidence: number;
    };
  };
  'question/parse.failed': {
    data: {
      taskId: string;
      error: string;
    };
  };
};
