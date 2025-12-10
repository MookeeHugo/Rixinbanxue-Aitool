import crypto from 'crypto'
import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'
import { checkRateLimit, getClientId } from "@/lib/server/rate-limit";
import { detectWebhookReplay, verifyZegoWebhook } from "@/lib/server/webhook";

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req)
    const rate = checkRateLimit(`webhook-zego:${clientId}`, { limit: 20, windowMs: 60_000 })
    if (!rate.ok) {
      return NextResponse.json(
        { error: "请求过于频繁" },
        { status: 429, headers: { 'Retry-After': Math.ceil(rate.retryAfterMs / 1000).toString() } }
      )
    }

    // 获取原始 payload 用于签名验证
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // 获取签名和时间戳 header
    const signature = req.headers.get('X-Signature');
    const timestamp = req.headers.get('X-Timestamp');

    // 从环境变量获取 ZEGO AppSign
    const zegoSecret = process.env.ZEGO_APP_SIGN;

    if (!zegoSecret) {
      logger.error('ZEGO webhook: ZEGO_APP_SIGN not configured');
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 验证签名
    const isValid = verifyZegoWebhook(rawBody, signature, timestamp, zegoSecret);

    if (!isValid) {
      logger.warn('ZEGO webhook: Invalid signature', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        bodyLength: rawBody.length
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 基于签名/内容的重放防护（5 分钟 TTL）
    const fingerprint = signature || crypto.createHash('sha256').update(rawBody).digest('hex')
    if (detectWebhookReplay('zego', fingerprint, 5 * 60_000)) {
      logger.warn('ZEGO webhook replay detected', { event: body.event_type || body.type })
      return NextResponse.json({ error: 'Replay detected' }, { status: 409 })
    }

    logger.debug("ZEGO webhook verified", {
      event: body.event_type || body.type,
      timestamp: body.timestamp
    });

    // TODO: 根据事件类型处理不同的业务逻辑
    // 例如：stream_end -> 更新 session 状态；record_complete -> 保存录制文件 URL

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error: any) {
    logger.error('ZEGO webhook error:', { error: error });
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
}
