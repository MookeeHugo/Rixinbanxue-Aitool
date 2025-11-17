"use client";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/mock/sessions";
import { useState } from "react";
import { useApiParam } from "@/lib/client/useApiParam";

export default function NewLiveSessionPage() {
  const router = useRouter();
  const { useApi, withApi } = useApiParam();
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const [provider, setProvider] = useState<"zego" | "livekit">("zego");
  const [recordOnStart, setRecordOnStart] = useState(true);

  function toISO(dt: string) {
    if (!dt) return undefined;
    const d = new Date(dt);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: title.trim() || "未命名课堂",
      provider,
      scheduledAt: toISO(scheduledAt),
      durationMin: duration,
      recordOnStart,
    };
    if (useApi) {
      const r = await fetch("/api/live-sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { alert("创建失败"); return; }
      const s = await r.json();
      router.push(withApi(`/live/${s.id}`));
    } else {
      const s = createSession(payload as any);
      router.push(`/live/${s.id}`);
    }
  }

  return (
    <form className="rx-card" onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>创建课堂</h2>
      <div style={{ display: "grid", gap: 12 }}>
        <label>
          标题
          <input className="rx-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：周三晚辅导班" />
        </label>
        <div className="rx-row">
          <label>
            开始时间
            <input className="rx-input" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </label>
          <label>
            时长（分钟）
            <input className="rx-input" type="number" min={15} max={240} value={duration} onChange={(e) => setDuration(parseInt(e.target.value || "60", 10))} />
          </label>
        </div>
        <div className="rx-row">
          <label>
            提供商
            <select className="rx-select" value={provider} onChange={(e) => setProvider(e.target.value as any)}>
              <option value="zego">ZEGO（默认）</option>
              <option value="livekit">LiveKit（小班/成本敏感）</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={recordOnStart} onChange={(e) => setRecordOnStart(e.target.checked)} />
            开课即录制
          </label>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="rx-btn" href={withApi("/live")}>取消</a>
          <button type="submit" className="rx-btn rx-btn-primary">创建并进入</button>
        </div>
      </div>
    </form>
  );
}
