import { NextRequest, NextResponse } from "next/server";
import { listSessions as listMem, saveSession } from "@/lib/server/store";
import { routeProvider, getProviderInstance } from "@/lib/live/router";
import { randomUUID } from "crypto";
import { authenticateRequest, requireTeacher } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  // 验证用户身份（可选：如果需要只返回自己创建的课堂）
  const user = await authenticateRequest(req);

  // 如果未登录，返回空列表
  if (!user) {
    return NextResponse.json([], { status: 200 });
  }

  // 从数据库获取直播课堂列表
  const list = await listMem();

  return NextResponse.json(list, { status: 200 });
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

    const body = await req.json();
    const title = (body?.title || "未命名课堂") as string;
    const provider = (body?.provider as "zego" | "livekit") || routeProvider();
    const scheduledAt = body?.scheduledAt as string | undefined;
    const durationMin = body?.durationMin as number | undefined;
    const recordOnStart = Boolean(body?.recordOnStart);

    const sessionId = randomUUID();
    const roomRes = await getProviderInstance(provider).createRoom({ title, sessionId });
    const record = {
      id: sessionId,
      title,
      provider,
      status: "pending" as const,
      scheduledAt,
      durationMin,
      recordOnStart,
      roomId: roomRes.roomId,
      createdAt: new Date().toISOString(),
      createdBy: user.id, // 记录创建者
    };
    await saveSession(record);
    return NextResponse.json(record, { status: 201 });
  } catch (e: any) {
    console.error('Create live session error:', e);
    return NextResponse.json({ error: e?.message || "bad request" }, { status: 400 });
  }
}

