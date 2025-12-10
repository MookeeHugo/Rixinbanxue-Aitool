import crypto from 'crypto'
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientId } from "@/lib/server/rate-limit";
import { verifyLiveKitWebhook, detectWebhookReplay } from "@/lib/server/webhook";
import { createWebhookHandler, WebhookEvent } from "@/lib/webhook-handler";

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req)
    const rate = checkRateLimit(`webhook-livekit:${clientId}`, { limit: 20, windowMs: 60_000 })
    if (!rate.ok) {
      return NextResponse.json(
        { error: "请求过于频繁" },
        { status: 429, headers: { 'Retry-After': Math.ceil(rate.retryAfterMs / 1000).toString() } }
      )
    }

    // 获取原始 payload 用于签名验证
    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as WebhookEvent;

    // 获取签名 header
    const signature = req.headers.get('Authorization') || req.headers.get('X-Signature');

    // 从环境变量获取 LiveKit API Secret
    const liveKitSecret = process.env.LIVEKIT_API_SECRET;

    if (!liveKitSecret) {
      logger.error('LiveKit webhook: LIVEKIT_API_SECRET not configured');
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 验证签名
    const isValid = verifyLiveKitWebhook(rawBody, signature, liveKitSecret);

    if (!isValid) {
      logger.warn('LiveKit webhook: Invalid signature', {
        hasSignature: !!signature,
        bodyLength: rawBody.length,
        eventType: body.event,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 基于签名/内容的重放防护（5 分钟 TTL）
    const fingerprint = signature || crypto.createHash('sha256').update(rawBody).digest('hex')
    if (detectWebhookReplay('livekit', fingerprint, 5 * 60_000)) {
      logger.warn('LiveKit webhook replay detected', { event: body.event, eventId: body.id })
      return NextResponse.json({ error: 'Replay detected' }, { status: 409 })
    }

    logger.info("LiveKit webhook verified", {
      event: body.event,
      eventId: body.id,
      timestamp: body.createdAt,
    });

    const webhookHandler = createWebhookHandler();

    webhookHandler.handleEvent(body).catch((error) => {
      logger.error('Failed to handle webhook event', error, {
        eventType: body.event,
        eventId: body.id,
      });
    });

    // LiveKit 期望快速响应，实际处理在后台进行
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error: any) {
    logger.error('LiveKit webhook error', error);
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
}
