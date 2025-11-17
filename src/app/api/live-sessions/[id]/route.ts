import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/server/store";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  const s = id ? await getSession(id) : undefined;
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(s, { status: 200 });
}

