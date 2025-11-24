import { NextRequest, NextResponse } from "next/server";
import { verifyLiveKitWebhook } from "@/lib/server/webhook";
import { createWebhookHandler, WebhookEvent } from "@/lib/webhook-handler";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    // 获取原始payload用于签名验证
    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as WebhookEvent;

    // 获取签名header
    const signature = req.headers.get('Authorization') || req.headers.get('X-Signature');

    // 从环境变量获取LiveKit API Secret
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

    // 签名验证通过，处理webhook事件
    logger.info("LiveKit webhook verified", {
      event: body.event,
      eventId: body.id,
      timestamp: body.createdAt,
    });

    // 创建 Webhook 处理器
    const webhookHandler = createWebhookHandler();

    // 处理事件（异步，不等待完成）
    webhookHandler.handleEvent(body).catch((error) => {
      logger.error('Failed to handle webhook event', error, {
        eventType: body.event,
        eventId: body.id,
      });
    });

    // 立即返回 202 Accepted
    // LiveKit 期望快速响应，实际处理在后台进行
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error: any) {
    logger.error('LiveKit webhook error', error);
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
}
