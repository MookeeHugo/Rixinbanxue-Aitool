"use client";
import Link from "next/link";
import { listSessions as listMock } from "@/lib/mock/sessions";
import { useApiParam } from "@/lib/client/useApiParam";
import { StorageQuotaBadge } from "@/components/storage/StorageQuotaCard";
import { Suspense, useEffect, useState } from "react";

function ProviderBadge({ p }: { p: "zego" | "livekit" }) {
  const name = p === "zego" ? "ZEGO" : "LiveKit";
  return <span className="rx-badge">提供商: {name}</span>;
}

type Session = {
  id: string; title: string; provider: "zego"|"livekit"; status: string; createdAt: string; scheduledAt?: string; durationMin?: number;
};

export default function LiveSessionsPage() {
  return (
    <Suspense fallback={<p className="rx-muted">加载直播课堂...</p>}>
      <LiveSessionsPageContent />
    </Suspense>
  );
}

function LiveSessionsPageContent() {
  const { useApi, withApi } = useApiParam();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        if (useApi) {
          const r = await fetch("/api/live-sessions", { cache: "no-store" });
          const data = await r.json();
          if (mounted) setSessions(data);
        } else {
          const data = listMock();
          if (mounted) setSessions(data as any);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [useApi]);
  return (
    <div className="rx-list">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2>直播课堂列表</h2>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <StorageQuotaBadge />
          <Link className="rx-btn rx-btn-primary" href={withApi("/live/new")}>创建课堂</Link>
        </div>
      </div>
      {loading && <p className="rx-muted">加载中…</p>}
      {!loading && sessions.length === 0 && <p className="rx-muted">暂无课堂，点击“创建课堂”开始。</p>}
      <div className="rx-grid">
        {sessions.map((s) => (
          <article key={s.id} className="rx-card">
            <h3 style={{ marginTop: 0 }}>{s.title}</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ProviderBadge p={s.provider} />
              <span className="rx-badge">状态: {s.status}</span>
            </div>
            <p className="rx-muted">{s.scheduledAt ? `开始于：${new Date(s.scheduledAt).toLocaleString()}` : `创建于：${new Date(s.createdAt).toLocaleString()}`}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={withApi(`/live/${s.id}`)} className="rx-btn rx-btn-primary">进入课堂</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
