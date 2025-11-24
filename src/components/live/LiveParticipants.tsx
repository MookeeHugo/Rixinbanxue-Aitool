"use client";

import { useParticipants } from '@livekit/components-react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, User } from 'lucide-react';

interface LiveParticipantsProps {
  sessionId: string;
}

export function LiveParticipants({ sessionId }: LiveParticipantsProps) {
  const participants = useParticipants();

  return (
    <div className="flex flex-col h-full bg-slate-900/30 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-slate-800/50">
        <h3 className="text-base font-semibold text-white">
          成员列表 ({participants.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {participants.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            暂无成员
          </div>
        ) : (
          participants.map((participant) => {
            const isMicEnabled = participant.isMicrophoneEnabled;
            const isCameraEnabled = participant.isCameraEnabled;
            const isScreenSharing = participant.isScreenShareEnabled;
            const isLocal = participant.isLocal;

            return (
              <div
                key={participant.identity}
                className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 hover:bg-slate-800/70 rounded-lg transition-colors"
              >
                {/* 用户头像 */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-semibold">
                  {participant.name?.[0]?.toUpperCase() || <User size={20} />}
                </div>

                {/* 用户信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {participant.name || participant.identity}
                    </span>
                    {isLocal && (
                      <span className="text-xs px-1.5 py-0.5 bg-cyan-600 text-white rounded">
                        你
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {/* 麦克风状态 */}
                    <div
                      className={`flex items-center gap-1 ${
                        isMicEnabled ? 'text-slate-400' : 'text-red-400'
                      }`}
                      title={isMicEnabled ? '麦克风已开启' : '麦克风已关闭'}
                    >
                      {isMicEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                    </div>

                    {/* 摄像头状态 */}
                    <div
                      className={`flex items-center gap-1 ${
                        isCameraEnabled ? 'text-slate-400' : 'text-red-400'
                      }`}
                      title={isCameraEnabled ? '摄像头已开启' : '摄像头已关闭'}
                    >
                      {isCameraEnabled ? <Video size={14} /> : <VideoOff size={14} />}
                    </div>

                    {/* 屏幕共享状态 */}
                    {isScreenSharing && (
                      <div
                        className="flex items-center gap-1 text-cyan-400"
                        title="正在共享屏幕"
                      >
                        <MonitorUp size={14} />
                      </div>
                    )}
                  </div>
                </div>

                {/* 连接质量指示器 (可选) */}
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-green-500" title="连接良好" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
