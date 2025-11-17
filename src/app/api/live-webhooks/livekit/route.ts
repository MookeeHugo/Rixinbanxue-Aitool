import { NextRequest, NextResponse } from "next/server";
import { verifyLiveKitWebhook } from "@/lib/server/webhook";

export async function POST(req: NextRequest) {
  try {
    // 获取原始payload用于签名验证
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // 获取签名header
    const signature = req.headers.get('Authorization') || req.headers.get('X-Signature');

    // 从环境变量获取LiveKit API Secret
    const liveKitSecret = process.env.LIVEKIT_API_SECRET;

    if (!liveKitSecret) {
      console.error('LiveKit webhook: LIVEKIT_API_SECRET not configured');
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 验证签名
    const isValid = verifyLiveKitWebhook(rawBody, signature, liveKitSecret);

    if (!isValid) {
      console.warn('LiveKit webhook: Invalid signature', {
        hasSignature: !!signature,
        bodyLength: rawBody.length
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 签名验证通过，处理webhook事件
    console.log("LiveKit webhook verified", {
      event: body.event,
      timestamp: body.createdAt
    });

    // TODO: 根据事件类型处理不同的业务逻辑
    // 例如：room_finished -> 更新session状态
    //      recording_finished -> 保存录制文件URL

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error: any) {
    console.error('LiveKit webhook error:', error);
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
}

