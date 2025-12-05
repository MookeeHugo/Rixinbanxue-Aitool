"use client"

import { logger } from '@/lib/logger'
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { StorageQuotaCard } from "@/components/storage/StorageQuotaCard";
import Link from "next/link";
import { Play, Calendar, Clock, FileVideo, Loader2 } from "lucide-react";

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

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  async function loadRecordings() {
    try {
      setLoading(true);
      const user = await getCurrentUser();

      if (!user) {
        setError("请先登录");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("live_recordings")
        .select(`
          *,
          live_sessions (
            title
          )
        `)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setRecordings(data || []);
    } catch (err: any) {
      logger.error('加载录制列表失败:', { error: err });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link
            href="/"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">课堂录制</h1>
              <p className="text-slate-400">
                共 {recordings.length} 个录制
              </p>
            </div>
            <Link
              href="/live"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              返回直播列表
            </Link>
          </div>
        </div>

        {/* Storage Quota Card */}
        <div className="mb-8">
          <StorageQuotaCard />
        </div>

        {/* Recordings Grid */}
        {recordings.length === 0 ? (
          <div className="text-center py-16">
            <FileVideo className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">
              还没有录制
            </h3>
            <p className="text-slate-500 mb-6">
              在直播课堂中点击“开始录制”按钮来录制您的课程
            </p>
            <Link
              href="/live/new"
              className="inline-block px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              创建新课堂
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recordings.map((recording) => (
              <Link
                key={recording.id}
                href={`/recordings/${recording.id}`}
                className="group"
              >
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 overflow-hidden hover:border-cyan-600 transition-all">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-slate-800 flex items-center justify-center">
                    <FileVideo className="w-16 h-16 text-slate-600 group-hover:text-cyan-500 transition-colors" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-cyan-600 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-1" />
                      </div>
                    </div>
                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white font-mono">
                      {formatDuration(recording.duration_seconds)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                      {recording.title}
                    </h3>

                    {recording.description && (
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                        {recording.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(recording.created_at).toLocaleDateString("zh-CN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(recording.duration_seconds)}</span>
                        <span className="text-slate-600">•</span>
                        <span>{formatFileSize(recording.file_size)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
