"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LiveRoomProvider } from "@/components/live/LiveRoomProvider";
import { LiveVideoDisplay } from "@/components/live/LiveVideoDisplay";
import { LiveChat } from "@/components/live/LiveChat";
import { LiveParticipants } from "@/components/live/LiveParticipants";
import { FileShare } from "@/components/live/FileShare";
import { CollaborativeWhiteboard } from "@/components/live/CollaborativeWhiteboard";
import { RecordingControls } from "@/components/live/RecordingControls";
import { getCurrentUser } from "@/lib/auth";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import Link from "next/link";
import { logger } from '@/lib/logger';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  Presentation,
  PhoneOff,
  MessageSquare,
  Users,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  Circle,
} from "lucide-react";

type Session = {
  id: string;
  title: string;
  provider: "zego" | "livekit";
  status: "pending" | "live" | "ended" | "failed";
  created_at: string;
  created_by?: string;
  scheduled_at?: string;
  room_id?: string;
};

type ViewMode = "live" | "whiteboard";
type SidebarTab = "chat" | "users" | "files";

export default function LiveSessionDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // UI状态
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chat");
  const [displayedFile, setDisplayedFile] = useState<any>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState(false);

  // 录制功能
  const {
    isRecording,
    recordedBlob,
    recordingDuration,
    startRecording,
    stopRecording,
    uploadRecording,
    cancelRecording,
  } = useMediaRecorder();

  useEffect(() => {
    setReady(true);
  }, []);

  // 获取当前用户ID
  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUserId(user.id);
          setCurrentUserName(user.email || "用户");
        }
      } catch (err) {
        logger.error('获取用户信息失败:', { error: err });
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    let mounted = true;
    const id = params?.id;
    if (!id) return;

    async function load() {
      try {
        setLoading(true);
        const r = await fetch(`/api/live-sessions/${id}`, { cache: "no-store" });

        if (r.ok) {
          const s = await r.json();
          if (mounted) {
            setSession(s);
          }
        } else {
          if (mounted) {
            setError("未找到课堂");
            setSession(undefined);
          }
        }
      } catch (err: any) {
        logger.error('加载直播会话失败:', { error: err });
        if (mounted) {
          setError(err.message || "加载失败");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [params?.id]);

  // 自动上传录制完成的内容
  useEffect(() => {
    if (recordedBlob && !isRecording && currentUserId && session) {
      handleUploadRecording();
    }
  }, [recordedBlob, isRecording]);

  async function handleUploadRecording() {
    if (!recordedBlob || !currentUserId || !session) return;

    setUploadingRecording(true);
    try {
      const recording = await uploadRecording(
        session.id,
        currentUserId,
        `${session.title} - 录制`
      );

      if (recording) {
        alert(`录制已保存！时长: ${Math.floor(recording.duration_seconds / 60)}分${recording.duration_seconds % 60}秒`);
      }
    } catch (error: any) {
      logger.error('上传录制失败:', { error: error });
      alert(`上传失败: ${error.message}`);
    } finally {
      setUploadingRecording(false);
    }
  }

  async function handleRecordingToggle() {
    if (isRecording) {
      // 停止录制
      stopRecording();
    } else {
      // 开始录制
      const result = await startRecording();
      if (!result.success) {
        alert(`启动录制失败: ${result.error || '未知错误'}`);
      }
    }
  }

  async function join() {
    if (!session) return;
    setIsJoining(true);
    setSession({ ...session, status: "live" });
  }

  function handleDisconnect() {
    router.push("/live");
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <p className="text-slate-400">加载中...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-slate-400 mb-4">{error || "未找到课堂"}</p>
          <Link
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            href="/live"
          >
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  const isLive = session.status === "live";

  if (!isLive) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">{session.title}</h2>
          <p className="text-slate-400">
            {session.scheduled_at
              ? `开始于：${new Date(session.scheduled_at).toLocaleString()}`
              : `创建于：${new Date(session.created_at).toLocaleString()}`}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed"
              onClick={join}
              disabled={!ready || isJoining}
            >
              {isJoining ? "正在进入..." : "进入课堂"}
            </button>
            <Link
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              href="/live"
            >
              返回列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveRoomProvider
      sessionId={session.id}
      onDisconnect={handleDisconnect}
      micEnabled={isMicOn}
      cameraEnabled={isCameraOn}
    >
      <div className="flex h-screen bg-slate-950 overflow-hidden">
        {/* 左侧导航栏 */}
        <div className="w-16 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 flex flex-col items-center py-6 gap-6">
        <button
          onClick={() => setViewMode("live")}
          className={`p-3 rounded-lg transition-all ${
            viewMode === "live"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/50"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title="直播视图"
        >
          <Video size={20} />
        </button>
        <button
          onClick={() => setViewMode("whiteboard")}
          className={`p-3 rounded-lg transition-all ${
            viewMode === "whiteboard"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/50"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title="互动白板"
        >
          <Presentation size={20} />
        </button>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部信息栏 */}
        <div className="h-16 bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">{session.title}</h1>
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg">
                <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
                <span className="text-sm text-red-400 font-mono">
                  {formatRecordingTime(recordingDuration)}
                </span>
              </div>
            )}
            {uploadingRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/50 rounded-lg">
                <span className="text-sm text-cyan-400">上传中...</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            {sidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
          </button>
        </div>

        {/* 视频/白板区域 */}
        <div className="flex-1 relative">
          {viewMode === "live" ? (
            <div className="w-full h-full p-6">
              <div className="w-full h-full bg-slate-900/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden">
                <LiveVideoDisplay
                  micEnabled={isMicOn}
                  cameraEnabled={isCameraOn}
                  screenShareEnabled={isScreenSharing}
                  onMicToggle={(enabled: boolean) => setIsMicOn(enabled)}
                  onCameraToggle={(enabled: boolean) => setIsCameraOn(enabled)}
                  onScreenShareToggle={(enabled: boolean) => setIsScreenSharing(enabled)}
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-full p-6">
              <div className="w-full h-full bg-slate-900/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden">
                <CollaborativeWhiteboard
                  sessionId={session.id}
                  displayedFile={displayedFile}
                />
              </div>
            </div>
          )}
        </div>

        {/* 底部控制栏 */}
        <div className="h-20 bg-slate-900/50 backdrop-blur-xl border-t border-slate-800 px-6 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-4 rounded-full transition-all ${
                isMicOn
                  ? "bg-slate-800 hover:bg-slate-700 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`p-4 rounded-full transition-all ${
                isCameraOn
                  ? "bg-slate-800 hover:bg-slate-700 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`p-4 rounded-full transition-all ${
                isScreenSharing
                  ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
              title={isScreenSharing ? "停止共享屏幕" : "共享屏幕"}
            >
              <MonitorUp size={20} />
            </button>
            <button
              onClick={() => setViewMode(viewMode === "live" ? "whiteboard" : "live")}
              className={`p-4 rounded-full transition-all ${
                viewMode === "whiteboard"
                  ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
            >
              <Presentation size={20} />
            </button>
            <div className="w-px h-8 bg-slate-700 mx-2" />
            <button
              onClick={handleRecordingToggle}
              disabled={uploadingRecording}
              className={`px-6 py-3 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
              title="客户端录制"
            >
              {uploadingRecording ? "上传中..." : isRecording ? "停止录制" : "开始录制"}
            </button>
            {/* 服务端录制控制 */}
            {currentUserId && session.created_by === currentUserId && (
              <RecordingControls
                sessionId={session.id}
                userId={currentUserId}
                userRole="teacher"
                className="ml-2"
              />
            )}
            <div className="w-px h-8 bg-slate-700 mx-2" />
            <button
              onClick={handleDisconnect}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 右侧边栏 */}
      {sidebarOpen && (
        <div className="w-96 bg-slate-900/50 backdrop-blur-xl border-l border-slate-800 flex flex-col">
          {/* 标签页切换 */}
          <div className="h-16 border-b border-slate-800 flex items-center px-4 gap-2">
            <button
              onClick={() => setSidebarTab("chat")}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                sidebarTab === "chat"
                  ? "bg-cyan-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <MessageSquare size={16} className="inline mr-1" />
              聊天
            </button>
            <button
              onClick={() => setSidebarTab("users")}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                sidebarTab === "users"
                  ? "bg-cyan-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Users size={16} className="inline mr-1" />
              成员
            </button>
            <button
              onClick={() => setSidebarTab("files")}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                sidebarTab === "files"
                  ? "bg-cyan-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <FileText size={16} className="inline mr-1" />
              文件
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden">
            {sidebarTab === "chat" ? (
              <div className="h-full">
                <LiveChat sessionId={session.id} currentUserId={currentUserId || undefined} />
              </div>
            ) : sidebarTab === "users" ? (
              <div className="h-full">
                <LiveParticipants sessionId={session.id} />
              </div>
            ) : (
              <div className="h-full">
                <FileShare
                  sessionId={session.id}
                  currentUserId={currentUserId || ""}
                  currentUserName={currentUserName}
                  isCreator={session.created_by === currentUserId}
                  onFileDisplayOnWhiteboard={(file) => setDisplayedFile(file)}
                />
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </LiveRoomProvider>
  );
}
