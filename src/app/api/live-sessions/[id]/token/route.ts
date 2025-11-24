import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateRequest, createAuthenticatedSupabaseClient } from "@/lib/server/auth";
import { AccessToken } from "livekit-server-sdk";
import { logger } from '@/lib/logger'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params?.id;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // 验证用户身份
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 获取用户profile信息
    const authenticatedSupabase = createAuthenticatedSupabaseClient();
    const client = authenticatedSupabase || supabase;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("name, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      logger.error('获取用户信息失败:', { error: profileError });
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // 验证会话存在
    const { data: session, error: sessionError } = await client
      .from("live_sessions")
      .select("id, title, provider, status")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      logger.error('获取直播会话失败:', { error: sessionError });
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // 检查provider是否为livekit
    if (session.provider !== "livekit") {
      return NextResponse.json(
        { error: "Session is not using LiveKit provider" },
        { status: 400 }
      );
    }

    // 获取LiveKit配置
    const livekitUrl = process.env.LIVEKIT_URL;
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      console.error("LiveKit configuration missing");
      return NextResponse.json(
        { error: "LiveKit service not configured" },
        { status: 500 }
      );
    }

    // 创建LiveKit访问令牌
    const roomName = `live-session-${sessionId}`;
    const participantName = profile.name || user.email || user.id;
    const participantIdentity = user.id;

    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: participantIdentity,
      name: participantName,
    });

    // 设置权限（教师有更多权限）
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
      // 教师可以管理房间
      roomAdmin: profile.role === "teacher",
      roomCreate: profile.role === "teacher",
    });

    const token = await at.toJwt();

    // 返回token和连接信息
    return NextResponse.json({
      token,
      livekitUrl,
      roomId: roomName,
      participantName,
      participantIdentity,
    }, { status: 200 });

  } catch (e: any) {
    logger.error('POST /api/live-sessions/[id]/token error:', { error: e });
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
