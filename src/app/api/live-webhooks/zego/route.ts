import { NextRequest, NextResponse } from "next/server";
import { verifyZegoWebhook } from "@/lib/server/webhook";
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    // 获取原始payload用于签名验证
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // 获取签名和时间戳header
    const signature = req.headers.get('X-Signature');
    const timestamp = req.headers.get('X-Timestamp');

    // 从环境变量获取ZEGO AppSign
    const zegoSecret = process.env.ZEGO_APP_SIGN;

    if (!zegoSecret) {
      console.error('ZEGO webhook: ZEGO_APP_SIGN not configured');
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 验证签名
    const isValid = verifyZegoWebhook(rawBody, signature, timestamp, zegoSecret);

    if (!isValid) {
      console.warn('ZEGO webhook: Invalid signature', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        bodyLength: rawBody.length
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 签名验证通过，处理webhook事件
    logger.debug("ZEGO webhook verified", {
      event: body.event_type || body.type,
      timestamp: body.timestamp
    });

    // TODO: 根据事件类型处理不同的业务逻辑
    // 例如：stream_end -> 更新session状态
    //      record_complete -> 保存录制文件URL

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error: any) {
    logger.error('ZEGO webhook error:', { error: error });
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
}

