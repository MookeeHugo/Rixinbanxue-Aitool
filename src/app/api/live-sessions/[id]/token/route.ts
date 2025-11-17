import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/server/store";
import { getProviderInstance } from "@/lib/live/router";
import { authenticateRequest, requireAuth } from "@/lib/server/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // 验证用户身份 - 必须已登录
  const user = await authenticateRequest(req);
  if (!user || !requireAuth(user)) {
    return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
  }

  const id = params?.id;
  const s = id ? await getSession(id) : undefined;
  if (!s) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  try {
    const provider = getProviderInstance(s.provider);

    // 使用真实用户ID和角色，而不是写死的值
    const userRole = user.role === 'teacher' ? 'teacher' : 'student';

    // Token 有效期设置为 1 小时，可以根据实际需求调整
    const res = await provider.issueToken({
      roomId: s.roomId!,
      userId: user.id,
      role: userRole,
      ttlSeconds: 3600
    });

    return NextResponse.json({
      provider: s.provider,
      roomId: s.roomId,
      token: res.token,
      expiresAt: res.expiresAt,
      userId: user.id,
      userRole
    }, { status: 200 });
  } catch (e: any) {
    console.error('Issue token error:', e);
    return NextResponse.json({ error: e?.message || "Failed to issue token" }, { status: 500 });
  }
}

