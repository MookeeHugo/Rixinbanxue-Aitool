"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, File, Image, FileText, X, Download, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SharedFile {
  id: string;
  session_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  storage_url: string;
  is_displayed_on_whiteboard: boolean;
  created_at: string;
  uploader_name?: string;
}

interface FileShareProps {
  sessionId: string;
  currentUserId: string;
  currentUserName: string;
  isCreator: boolean;
  onFileDisplayOnWhiteboard?: (file: SharedFile) => void;
  onFileShared?: (file: SharedFile) => void;
}

export function FileShare({
  sessionId,
  currentUserId,
  currentUserName,
  isCreator,
  onFileDisplayOnWhiteboard,
  onFileShared,
}: FileShareProps) {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载已共享的文件列表
  const loadFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_session_files')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 为每个文件添加上传者名称（使用 user_id 作为显示名）
      const filesWithUploader = data.map((file: any) => ({
        ...file,
        uploader_name: file.user_id === currentUserId ? '我' : '其他用户',
      }));

      setFiles(filesWithUploader);
    } catch (error) {
      logger.error('加载文件列表失败:', { error: error });
    }
  }, [sessionId, currentUserId]);

  // 组件加载时加载文件列表
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // 上传文件
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      const file = selectedFiles[0];

      // 检查文件大小（限制50MB）
      if (file.size > 50 * 1024 * 1024) {
        alert('文件大小不能超过50MB');
        return;
      }

      // 检查文件类型
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ];

      if (!allowedTypes.includes(file.type)) {
        alert('不支持的文件类型。支持的格式：图片（JPG、PNG、GIF、WebP）、PDF、PPT');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        // 生成唯一的文件路径
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${currentUserId}/${sessionId}/${fileName}`;

        // 上传到Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('live-session-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // 获取公开URL
        const { data: urlData } = supabase.storage
          .from('live-session-files')
          .getPublicUrl(filePath);

        // 保存文件信息到数据库
        const { data: fileData, error: dbError } = await supabase
          .from('live_session_files')
          .insert({
            session_id: sessionId,
            user_id: currentUserId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: filePath,
            storage_url: urlData.publicUrl,
            is_displayed_on_whiteboard: false,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // 添加上传者名称
        const newFile = {
          ...fileData,
          uploader_name: currentUserName,
        };

        setFiles((prev) => [newFile, ...prev]);
        setUploadProgress(100);

        // 广播文件共享事件
        if (onFileShared) {
          onFileShared(newFile);
        }

        // 重置文件输入
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error: any) {
        logger.error('文件上传失败:', { error: error });
        const errorMessage = error?.message || '未知错误';
        alert(`文件上传失败: ${errorMessage}\n\n请检查：\n1. 是否已运行数据库迁移\n2. Storage 桶是否已创建\n3. 网络连接是否正常`);
      } finally {
        setUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    },
    [sessionId, currentUserId, currentUserName, onFileShared]
  );

  // 删除文件
  const handleDeleteFile = useCallback(
    async (file: SharedFile) => {
      if (!confirm('确定要删除这个文件吗？')) return;

      try {
        // 从Storage删除
        const { error: storageError } = await supabase.storage
          .from('live-session-files')
          .remove([file.storage_path]);

        if (storageError) throw storageError;

        // 从数据库删除
        const { error: dbError } = await supabase
          .from('live_session_files')
          .delete()
          .eq('id', file.id);

        if (dbError) throw dbError;

        setFiles((prev) => prev.filter((f) => f.id !== file.id));
      } catch (error) {
        logger.error('删除文件失败:', { error: error });
        alert('删除文件失败，请重试');
      }
    },
    [supabase]
  );

  // 在白板上显示文件
  const handleDisplayOnWhiteboard = useCallback(
    async (file: SharedFile) => {
      try {
        // 更新数据库
        const { error } = await supabase
          .from('live_session_files')
          .update({ is_displayed_on_whiteboard: true })
          .eq('id', file.id);

        if (error) throw error;

        // 更新本地状态
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, is_displayed_on_whiteboard: true } : f
          )
        );

        // 触发回调
        if (onFileDisplayOnWhiteboard) {
          onFileDisplayOnWhiteboard({ ...file, is_displayed_on_whiteboard: true });
        }
      } catch (error) {
        logger.error('显示文件失败:', { error: error });
        alert('显示文件失败，请重试');
      }
    },
    [supabase, onFileDisplayOnWhiteboard]
  );

  // 下载文件
  const handleDownloadFile = useCallback((file: SharedFile) => {
    const link = document.createElement('a');
    link.href = file.storage_url;
    link.download = file.file_name;
    link.target = '_blank';
    link.click();
  }, []);

  // 获取文件图标
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-5 h-5" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-5 h-5" />;
    } else {
      return <File className="w-5 h-5" />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/30 backdrop-blur-sm">
      {/* 头部 */}
      <div className="px-5 py-4 border-b border-slate-800/50">
        <h3 className="text-base font-semibold text-white mb-3">共享文件</h3>

        {/* 上传按钮 */}
        {isCreator && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.ppt,.pptx"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  上传中 {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  上传文件
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 mt-2">
              支持图片、PDF、PPT，最大50MB
            </p>
          </div>
        )}
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {files.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">暂无共享文件</p>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* 文件图标 */}
                <div className="flex-shrink-0 text-cyan-400">
                  {getFileIcon(file.file_type)}
                </div>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {file.file_name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatFileSize(file.file_size)} · {file.uploader_name}
                  </p>
                  {file.is_displayed_on_whiteboard && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                      已显示在白板
                    </span>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1">
                  {/* 在白板上显示 */}
                  {isCreator && file.file_type.startsWith('image/') && !file.is_displayed_on_whiteboard && (
                    <button
                      onClick={() => handleDisplayOnWhiteboard(file)}
                      className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-cyan-400 transition-colors"
                      title="在白板上显示"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}

                  {/* 下载 */}
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* 删除 */}
                  {(file.user_id === currentUserId || isCreator) && (
                    <button
                      onClick={() => handleDeleteFile(file)}
                      className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-colors"
                      title="删除"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
