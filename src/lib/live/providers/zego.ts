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

export class ZegoAdapter implements ILiveProvider {
  async createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
    // M1: 返回桩 roomId；M2: 可在此调用 ZEGO 服务端 API（若需要）
    return { roomId: `zego_${input.sessionId}`, provider: "zego" };
  }

  async issueToken(input: IssueTokenInput): Promise<IssueTokenResult> {
    // M1: 返回桩 token；M2: 使用 AppID/AppSign 服务端签发真正 token
    const ttl = input.ttlSeconds ?? 3600;
    const exp = Math.floor(Date.now() / 1000) + ttl;
    return { token: `stub-token-zego-${input.userId}`, expiresAt: exp };
  }

  async startRecording(_input: StartRecordingInput): Promise<StartRecordingResult> {
    // M1: 返回桩 recordingId；M2: 调 ZEGO 录制接口
    return { recordingId: `zego-rec-${Date.now()}` };
  }

  async stopRecording(_input: StopRecordingInput): Promise<void> {
    return;
  }
}

