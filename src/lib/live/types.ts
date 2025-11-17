export type LiveProvider = "zego" | "livekit";

export type LiveSessionStatus = "pending" | "live" | "ended" | "failed";

export interface LiveSession {
  id: string;
  title: string;
  classId?: string;
  scheduledAt?: string; // ISO
  durationMin?: number;
  provider: LiveProvider; // chosen or routed
  recordOnStart?: boolean;
  status: LiveSessionStatus;
  roomId?: string;
  createdBy?: string;
  createdAt: string; // ISO
}

