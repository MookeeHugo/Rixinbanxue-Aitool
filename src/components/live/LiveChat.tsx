"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from '@/lib/logger'

// Supabase返回的原始消息类型（profiles是数组）
interface RawChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message: string;
  message_type: "text" | "system" | "raise_hand";
  created_at: string;
  profiles: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

// 应用使用的消息类型（profiles是单个对象）
interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message: string;
  message_type: "text" | "system" | "raise_hand";
  created_at: string;
  profiles: {
    id: string;
    name: string;
    role: string;
  };
}

// 辅助函数：转换原始消息为应用消息
function normalizeMessage(raw: RawChatMessage): ChatMessage {
  return {
    ...raw,
    profiles: Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles,
  };
}

interface LiveChatProps {
  sessionId: string;
  currentUserId?: string;
}

export function LiveChat({ sessionId, currentUserId }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 加载历史消息
  useEffect(() => {
    async function loadMessages() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/live-sessions/${sessionId}/messages`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("加载消息失败");
        }

        const data = await response.json();
        // 转换消息格式（处理profiles数组）
        const normalizedMessages = data.map((msg: RawChatMessage) => normalizeMessage(msg));
        setMessages(normalizedMessages);

        // 延迟滚动，确保DOM已更新
        setTimeout(scrollToBottom, 100);
      } catch (err: any) {
        logger.error('加载聊天消息失败:', { error: err });
        setError(err.message || "加载消息失败");
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      loadMessages();
    }
  }, [sessionId]);

  // Supabase Realtime订阅 - 实时接收新消息
  useEffect(() => {
    if (!sessionId) return;

    logger.debug("订阅聊天消息实时更新:", { sessionId });

    // 创建Realtime订阅
    const channel = supabase
      .channel(`live_chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          logger.debug("收到新消息:", payload);

          // 获取完整的消息信息（包括用户profile）
          const { data: newMsg, error } = await supabase
            .from("live_chat_messages")
            .select(
              `
              id,
              session_id,
              user_id,
              message,
              message_type,
              created_at,
              profiles:user_id (
                id,
                name,
                role
              )
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (!error && newMsg) {
            // 转换消息格式
            const normalized = normalizeMessage(newMsg as RawChatMessage);
            setMessages((prev) => {
              // 避免重复添加
              if (prev.some((m) => m.id === normalized.id)) {
                return prev;
              }
              return [...prev, normalized];
            });

            // 滚动到最新消息
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe((status) => {
        logger.debug("Realtime订阅状态:", { status });
      });

    // 清理订阅
    return () => {
      logger.debug("取消订阅聊天消息");
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // 发送消息
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) {
      return;
    }

    try {
      setSending(true);
      setError(null);

      const response = await fetch(
        `/api/live-sessions/${sessionId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: newMessage.trim(),
            messageType: "text",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("发送消息失败");
      }

      const sentMessage = await response.json();

      // 转换消息格式
      const normalized = normalizeMessage(sentMessage as RawChatMessage);

      // 添加到消息列表（如果Realtime没有立即同步的话）
      setMessages((prev) => {
        // 避免重复添加
        if (prev.some((m) => m.id === normalized.id)) {
          return prev;
        }
        return [...prev, normalized];
      });

      setNewMessage("");
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      logger.error('发送消息失败:', { error: err });
      setError(err.message || "发送消息失败");
    } finally {
      setSending(false);
    }
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) {
      return "刚刚";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}小时前`;
    } else {
      return date.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  // 获取用户角色标签
  const getRoleBadge = (role: string) => {
    if (role === "teacher") {
      return (
        <span className="inline-block px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
          教师
        </span>
      );
    } else if (role === "student") {
      return (
        <span className="inline-block px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
          学生
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-500">加载聊天记录...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/30 backdrop-blur-sm">
      {/* 头部 */}
      <div className="px-5 py-4 border-b border-slate-800/50">
        <h3 className="text-base font-semibold text-white">聊天室</h3>
        <p className="text-xs text-slate-400 mt-1">
          {messages.length} 条消息
        </p>
      </div>

      {/* 消息列表 */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        style={{ minHeight: "300px" }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-500">暂无消息，开始聊天吧！</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.user_id === currentUserId ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {getRoleBadge(msg.profiles.role)}
                <span className="text-sm font-medium text-slate-300">
                  {msg.profiles.name || "未知用户"}
                </span>
                <span className="text-xs text-slate-500">
                  {formatTime(msg.created_at)}
                </span>
              </div>
              <div
                className={`px-4 py-2.5 rounded-lg max-w-[85%] ${
                  msg.user_id === currentUserId
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-800/70 text-slate-200"
                }`}
              >
                {msg.message_type === "raise_hand" ? (
                  <div className="flex items-center gap-2">
                    <span>✋</span>
                    <span className="text-sm">举手提问</span>
                  </div>
                ) : msg.message_type === "system" ? (
                  <span className="text-sm italic">{msg.message}</span>
                ) : (
                  <span className="text-sm whitespace-pre-wrap break-words">
                    {msg.message}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="px-5 py-3 bg-red-500/20 border-t border-red-500/50">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* 输入框 */}
      <form
        onSubmit={handleSendMessage}
        className="px-5 py-4 border-t border-slate-800/50"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="输入消息..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-slate-800/50 disabled:cursor-not-allowed transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? "发送中..." : "发送"}
          </button>
        </div>
      </form>
    </div>
  );
}
