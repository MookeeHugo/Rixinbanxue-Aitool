import { NextRequest, NextResponse } from "next/server";
import { routeProvider, getProviderInstance } from "@/lib/live/router";
import { authenticateRequest, requireTeacher, createAuthenticatedSupabaseClient } from "@/lib/server/auth";
import { supabase } from "@/lib/supabase";
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    // 验证用户身份（可选：如果需要只返回自己创建的课堂）
    const user = await authenticateRequest(req);

    // 如果未登录，返回空列表
    if (!user) {
      return NextResponse.json([], { status: 200 });
    }

    // 创建带认证的客户端
    const authenticatedSupabase = createAuthenticatedSupabaseClient();
    if (!authenticatedSupabase) {
      return NextResponse.json({ error: "Failed to create authenticated client" }, { status: 500 });
    }

    // 从Supabase数据库获取直播课堂列表（使用带认证的客户端）
    const { data: sessions, error } = await authenticatedSupabase
      .from('live_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('加载直播会话失败:', { error: error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(sessions || [], { status: 200 });
  } catch (e: any) {
    logger.error('GET /api/live-sessions error:', { error: e });
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份 - 必须是教师
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }

    if (!requireTeacher(user)) {
      return NextResponse.json({ error: "Forbidden: Teacher role required" }, { status: 403 });
    }

    // 创建带有用户认证的Supabase客户端（这样RLS策略可以看到用户的JWT）
    const authenticatedSupabase = createAuthenticatedSupabaseClient();
    if (!authenticatedSupabase) {
      return NextResponse.json({ error: "Failed to create authenticated client" }, { status: 500 });
    }

    const body = await req.json();
    const title = (body?.title || "未命名课堂") as string;
    const provider = (body?.provider as "zego" | "livekit") || routeProvider();
    const scheduledAt = body?.scheduledAt as string | undefined;
    const durationMin = body?.durationMin as number | undefined;
    const recordOnStart = Boolean(body?.recordOnStart);

    // 使用带认证的客户端创建数据库记录（RLS策略会从JWT中验证教师角色）
    const { data: session, error: insertError } = await authenticatedSupabase
      .from('live_sessions')
      .insert({
        title,
        provider,
        status: 'pending',
        scheduled_at: scheduledAt,
        duration_min: durationMin,
        record_on_start: recordOnStart,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('创建直播会话失败:', { error: insertError });
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 使用对应的provider创建房间
    const roomRes = await getProviderInstance(provider).createRoom({
      title: session.title,
      sessionId: session.id
    });

    // 更新房间ID
    const { error: updateError } = await authenticatedSupabase
      .from('live_sessions')
      .update({ room_id: roomRes.roomId })
      .eq('id', session.id);

    if (updateError) {
      logger.error('更新房间ID失败:', { error: updateError });
    }

    // 返回完整的session对象
    const finalSession = { ...session, room_id: roomRes.roomId };

    return NextResponse.json(finalSession, { status: 201 });
  } catch (e: any) {
    logger.error('Create live session error:', { error: e });
    return NextResponse.json({ error: e?.message || "bad request" }, { status: 400 });
  }
}

