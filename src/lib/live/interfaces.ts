import type { LiveProvider } from "@/lib/live/types";

export type UserRole = "teacher" | "student";

export interface CreateRoomInput {
  title: string;
  sessionId: string;
}

export interface CreateRoomResult {
  roomId: string;
  provider: LiveProvider;
}

export interface IssueTokenInput {
  roomId: string;
  userId: string;
  role: UserRole;
  ttlSeconds: number;
}

export interface IssueTokenResult {
  token: string;
  expiresAt: number; // epoch seconds
}

export interface StartRecordingInput {
  sessionId: string;
  roomId: string;
  userId: string;
  layout?: string;
}

export interface StartRecordingResult {
  recordingId: string;
  egressId?: string;
}

export interface StopRecordingInput {
  sessionId: string;
  recordingId?: string;
}

export interface ILiveProvider {
  createRoom(input: CreateRoomInput): Promise<CreateRoomResult>;
  issueToken(input: IssueTokenInput): Promise<IssueTokenResult>;
  startRecording(input: StartRecordingInput): Promise<StartRecordingResult>;
  stopRecording(input: StopRecordingInput): Promise<void>;
}
