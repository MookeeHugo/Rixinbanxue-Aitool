/**
 * Inngest API路由
 * @description 用于接收Inngest事件和执行Worker函数
 */

import { serve } from 'inngest/next';
import { inngest } from '../../../../inngest/client';
import { processPdfUpload } from '../../../../inngest/functions/process-pdf-upload';

/**
 * Inngest服务端点
 * 路径: /api/inngest
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processPdfUpload
    // 未来可添加更多Worker函数
  ]
});
