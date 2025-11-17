import type {
  ILiveProvider,
  CreateRoomInput,
  CreateRoomResult,
  IssueTokenInput,
  IssueTokenResult,
  StartRecordingInput,
  StartRecordingResult,
  StopRecordingInput,
} from "@/lib/live/interfaces";

export class LiveKitAdapter implements ILiveProvider {
  async createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
    // M1: 返回桩 roomId；M2: 调用 LiveKit Server API 创建房间
    return { roomId: `lk_${input.sessionId}`, provider: "livekit" };
  }

  async issueToken(input: IssueTokenInput): Promise<IssueTokenResult> {
    // M1: 返回桩 token；M2: 使用 API Key/Secret 签发 AccessToken
    const ttl = input.ttlSeconds ?? 3600;
    const exp = Math.floor(Date.now() / 1000) + ttl;
    return { token: `stub-token-livekit-${input.userId}`, expiresAt: exp };
  }

  async startRecording(_input: StartRecordingInput): Promise<StartRecordingResult> {
    return { recordingId: `lk-rec-${Date.now()}` };
  }

  async stopRecording(_input: StopRecordingInput): Promise<void> {
    return;
  }
}

