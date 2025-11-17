"use client";
import type { LiveProvider, LiveSession } from "@/lib/live/types";

const STORE_KEY = "rx_sessions_v1";

function nowISO() { return new Date().toISOString(); }

function readStore(): LiveSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeStore(items: LiveSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
}

// Seed demo data once
(() => {
  if (typeof window === "undefined") return;
  const existing = readStore();
  if (existing.length === 0) {
    const seed: LiveSession[] = [
      {
        id: crypto.randomUUID(),
        title: "示例 · 小班数学课",
        provider: "zego",
        status: "pending",
        createdAt: nowISO(),
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        durationMin: 60,
        recordOnStart: true,
      },
      {
        id: crypto.randomUUID(),
        title: "示例 · 内部培训（LiveKit）",
        provider: "livekit",
        status: "pending",
        createdAt: nowISO(),
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        durationMin: 45,
      },
    ];
    writeStore(seed);
  }
})();

export function listSessions(): LiveSession[] {
  return readStore().sort((a, b) => (a.scheduledAt || a.createdAt).localeCompare(b.scheduledAt || b.createdAt));
}

export function getSession(id: string): LiveSession | undefined {
  return readStore().find((s) => s.id === id);
}

export function createSession(input: {
  title: string;
  provider: LiveProvider;
  scheduledAt?: string;
  durationMin?: number;
  recordOnStart?: boolean;
}): LiveSession {
  const items = readStore();
  const session: LiveSession = {
    id: crypto.randomUUID(),
    title: input.title,
    provider: input.provider,
    status: "pending",
    scheduledAt: input.scheduledAt,
    durationMin: input.durationMin,
    recordOnStart: input.recordOnStart,
    createdAt: nowISO(),
  };
  items.push(session);
  writeStore(items);
  return session;
}

export function updateSession(id: string, patch: Partial<LiveSession>) {
  const items = readStore();
  const idx = items.findIndex((s) => s.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...patch };
    writeStore(items);
  }
}

