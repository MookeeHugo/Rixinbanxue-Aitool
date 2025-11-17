import type { ILiveProvider } from "@/lib/live/interfaces";
import { ZegoAdapter } from "@/lib/live/providers/zego";
import { LiveKitAdapter } from "@/lib/live/providers/livekit";
import type { LiveProvider } from "@/lib/live/types";

let zego: ZegoAdapter | null = null;
let livekit: LiveKitAdapter | null = null;

export function getProviderInstance(p: LiveProvider): ILiveProvider {
  if (p === "zego") {
    if (!zego) zego = new ZegoAdapter();
    return zego;
  }
  if (!livekit) livekit = new LiveKitAdapter();
  return livekit;
}

export function routeProvider(input?: { expectedSize?: number; region?: string }): LiveProvider {
  // M1: 简单策略，环境变量决定；M2: 按 expectedSize/region/budget 路由
  const d = (process.env.LIVE_PROVIDER_DEFAULT || "zego").toLowerCase();
  return d === "livekit" ? "livekit" : "zego";
}

