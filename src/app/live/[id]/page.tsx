"use client";
import { useParams } from "next/navigation";
import { getSession as getMock, updateSession as updateMock } from "@/lib/mock/sessions";
import { useEffect, useState } from "react";
import { useApiParam } from "@/lib/client/useApiParam";

function ProviderBadge({ p }: { p: "zego" | "livekit" }) {
  return <span className="rx-badge">当前提供商：{p === "zego" ? "ZEGO" : "LiveKit"}</span>;
}

type Session = { id: string; title: string; provider: "zego"|"livekit"; status: "pending"|"live"|"ended"|"failed"; createdAt: string; scheduledAt?: string; roomId?: string };

export default function LiveSessionDetail() {
  const params = useParams<{ id: string }>();
  const { useApi, withApi } = useApiParam();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | undefined>(undefined);

  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    let mounted = true;
    const id = params?.id;
    if (!id) return;
    async function load() {
      if (useApi) {
        const r = await fetch(`/api/live-sessions/${id}`, { cache: "no-store" });
        if (r.ok) {
          const s = await r.json();
          if (mounted) setSession(s);
        } else {
          if (mounted) setSession(undefined);
        }
      } else {
        const s = getMock(id);
        if (mounted) setSession(s as any);
      }
    }
    load();
    return () => { mounted = false; };
  }, [params?.id, useApi]);

  if (!session) {
    return (
      <div className="rx-card">
        <p>未找到课堂。</p>
        <a className="rx-btn" href={withApi("/live")}>返回列表</a>
      </div>
    );
  }

  async function join() {
    if (!session) return; // 添加空值检查

    if (useApi) {
      // 获取 token（桩），后续用于 SDK 入会
      await fetch(`/api/live-sessions/${session.id}/token`, { method: "POST" });
      setSession({ ...session, status: "live" });
    } else {
      updateMock(session.id, { status: "live" });
      location.reload();
    }
  }

  const isLive = session.status === "live";

  return (
    <div className="rx-grid">
      <section className="rx-card">
        <h2 style={{ marginTop: 0 }}>{session.title}</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ProviderBadge p={session.provider} />
          <span className="rx-badge">状态：{session.status}</span>
        </div>
        <p className="rx-muted">{session.scheduledAt ? `开始于：${new Date(session.scheduledAt).toLocaleString()}` : `创建于：${new Date(session.createdAt).toLocaleString()}`}</p>
        {!isLive && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="rx-btn rx-btn-primary" onClick={join} disabled={!ready}>进入课堂（模拟）</button>
            <a className="rx-btn" href={withApi("/live")}>返回</a>
          </div>
        )}
      </section>
      <section className="rx-card" style={{ minHeight: 360 }}>
        <h3 style={{ marginTop: 0 }}>课堂画面（占位）</h3>
        {!isLive ? (
          <p className="rx-muted">点击“进入课堂（模拟）”后显示占位画面。上线时在此挂载 ZEGO 或 LiveKit SDK。</p>
        ) : (
          <div style={{
            height: 280,
            borderRadius: 8,
            border: "1px dashed #2a3a4d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9fb0c0",
            background: "#0b1220",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎥</div>
              <div>这里将显示 {session.provider === "zego" ? "ZEGO" : "LiveKit"} 音视频画面</div>
            </div>
          </div>
        )}
      </section>
      <section className="rx-card">
        <h3 style={{ marginTop: 0 }}>白板（占位）</h3>
        <div style={{ height: 240, borderRadius: 8, border: "1px dashed #2a3a4d", background: "#0b1220" }} />
        <p className="rx-muted">上线时在此挂载 tldraw + Yjs；本原型先行布局 UI 与交互位置。</p>
      </section>
    </div>
  );
}
