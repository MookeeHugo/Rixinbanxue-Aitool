import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateRequest, createAuthenticatedSupabaseClient } from "@/lib/server/auth";
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // 创建带认证的客户端以便RLS策略可以验证
    const authenticatedSupabase = createAuthenticatedSupabaseClient();
    if (!authenticatedSupabase) {
      // 如果没有认证，使用普通客户端（可能会被RLS拒绝）
      const { data: session, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !session) {
        logger.error('查询直播会话失败:', { error: error });
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }

      return NextResponse.json(session, { status: 200 });
    }

    // 使用带认证的客户端查询
    const { data: session, error } = await authenticatedSupabase
      .from('live_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !session) {
      logger.error('查询直播会话失败:', { error: error });
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json(session, { status: 200 });
  } catch (e: any) {
    logger.error('GET /api/live-sessions/[id] error:', { error: e });
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // 验证用户身份
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 解析请求体
    const body = await req.json();
    const { status, title, scheduled_at, duration_min } = body;

    // 构建更新对象
    const updates: any = {};
    if (status) updates.status = status;
    if (title) updates.title = title;
    if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at;
    if (duration_min !== undefined) updates.duration_min = duration_min;

    // 更新会话（RLS策略会自动检查 created_by）
    const { data: session, error } = await supabase
      .from('live_sessions')
      .update(updates)
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) {
      logger.error('更新直播会话失败:', { error: error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(session, { status: 200 });
  } catch (e: any) {
    logger.error('PUT /api/live-sessions/[id] error:', { error: e });
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}

