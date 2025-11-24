import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateRequest, createAuthenticatedSupabaseClient } from "@/lib/server/auth";
import { logger } from '@/lib/logger'

// GET - 获取聊天消息历史
export async function GET(
  _req: NextRequest,
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

    // 创建带认证的客户端
    const authenticatedSupabase = createAuthenticatedSupabaseClient();
    const client = authenticatedSupabase || supabase;

    // 查询消息，关联用户信息（使用name字段，不是username）
    const { data: messages, error } = await client
      .from("live_chat_messages")
      .select(
        `
        id,
        session_id,
        user_id,
        message,
        message_type,
        created_at,
        profiles:user_id (
          id,
          name,
          role
        )
      `
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error('获取聊天消息失败:', { error: error });
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(messages || [], { status: 200 });
  } catch (e: any) {
    logger.error('GET /api/live-sessions/[id]/messages error:', { error: e });
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - 发送新消息
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

    // 解析请求体
    const body = await req.json();
    const { message, messageType = "text" } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message content required" },
        { status: 400 }
      );
    }

    // 验证消息类型
    const validTypes = ["text", "system", "raise_hand"];
    if (!validTypes.includes(messageType)) {
      return NextResponse.json(
        { error: "Invalid message type" },
        { status: 400 }
      );
    }

    // 创建带认证的客户端
    const authenticatedSupabase = createAuthenticatedSupabaseClient();
    if (!authenticatedSupabase) {
      return NextResponse.json(
        { error: "Failed to create authenticated client" },
        { status: 500 }
      );
    }

    // 插入新消息
    const { data: newMessage, error: insertError } = await authenticatedSupabase
      .from("live_chat_messages")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        message: message.trim(),
        message_type: messageType,
      })
      .select(
        `
        id,
        session_id,
        user_id,
        message,
        message_type,
        created_at,
        profiles:user_id (
          id,
          name,
          role
        )
      `
      )
      .single();

    if (insertError) {
      logger.error('创建消息失败:', { error: insertError });
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(newMessage, { status: 201 });
  } catch (e: any) {
    logger.error('POST /api/live-sessions/[id]/messages error:', { error: e });
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
