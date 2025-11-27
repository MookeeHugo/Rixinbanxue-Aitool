"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, FileVideo, Loader2, Download } from "lucide-react";

interface Recording {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_size: number;
  duration_seconds: number;
  created_at: string;
  live_sessions?: {
    title: string;
  };
}

export default function RecordingPlaybackPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      loadRecording(params.id);
    }
  }, [params?.id]);

  async function loadRecording(id: string) {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("live_recordings")
        .select(`
          *,
          live_sessions (
            title
          )
        `)
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      setRecording(data);
    } catch (err: any) {
      logger.error('加载录制失败:', { error: err });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "录制不存在"}</p>
          <Link
            href="/recordings"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            返回录制列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/recordings"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回录制列表</span>
            </Link>
            <a
              href={recording.file_url}
              download
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>下载视频</span>
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
              <video
                controls
                className="w-full aspect-video bg-black"
                src={recording.file_url}
              >
                <source src={recording.file_url} type="video/webm" />
                您的浏览器不支持视频播放。
              </video>
            </div>

            {/* Video Info */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-6">
              <h1 className="text-2xl font-bold text-white mb-4">
                {recording.title}
              </h1>

              {recording.description && (
                <p className="text-slate-300 mb-6">{recording.description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <div>
                    <div className="text-slate-500 text-xs">录制时间</div>
                    <div className="text-white">
                      {new Date(recording.created_at).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <div>
                    <div className="text-slate-500 text-xs">时长</div>
                    <div className="text-white">
                      {formatDuration(recording.duration_seconds)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <FileVideo className="w-4 h-4" />
                  <div>
                    <div className="text-slate-500 text-xs">文件大小</div>
                    <div className="text-white">
                      {formatFileSize(recording.file_size)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Session Info */}
            {recording.live_sessions && (
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">课堂信息</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-slate-500 mb-1">课堂名称</div>
                    <div className="text-white">{recording.live_sessions.title}</div>
                  </div>
                  <Link
                    href={`/live/${recording.session_id}`}
                    className="block w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-center rounded-lg transition-colors"
                  >
                    查看课堂
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">快捷操作</h3>
              <div className="space-y-3">
                <a
                  href={recording.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-center rounded-lg transition-colors"
                >
                  在新标签页打开
                </a>
                <a
                  href={recording.file_url}
                  download
                  className="block w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-center rounded-lg transition-colors"
                >
                  下载到本地
                </a>
              </div>
            </div>

            {/* Technical Info */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">技术信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">格式</span>
                  <span className="text-white">WebM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">编码</span>
                  <span className="text-white">VP9 + Opus</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">比特率</span>
                  <span className="text-white">2.5 Mbps</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
