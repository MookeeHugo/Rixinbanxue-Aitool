import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface RecordingData {
  id: string;
  title: string;
  file_url: string;
  file_path: string;
  file_size: number;
  duration_seconds: number;
}

export function useMediaRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // 获取屏幕共享流
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true, // 尝试捕获系统音频
      });

      // 获取麦克风音频
      let audioStream: MediaStream | null = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });
      } catch (error) {
        console.warn('无法获取麦克风音频，将仅录制屏幕:', error);
      }

      // 合并视频轨道
      const tracks: MediaStreamTrack[] = [
        ...displayStream.getVideoTracks(),
      ];

      // 添加屏幕音频轨道
      const displayAudioTracks = displayStream.getAudioTracks();
      if (displayAudioTracks.length > 0) {
        tracks.push(...displayAudioTracks);
      }

      // 添加麦克风音频轨道
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);
      streamRef.current = combinedStream;

      // 检测支持的 MIME 类型
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      // 创建 MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

        setRecordedBlob(blob);
        setRecordingDuration(duration);
        setIsRecording(false);

        // 清理媒体流
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event: Event) => {
        console.error('录制错误:', event);
        setIsRecording(false);

        // 清理媒体流
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // 监听用户停止屏幕共享的事件（点击浏览器的"停止共享"按钮）
      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && isRecording) {
          stopRecording();
        }
      };

      mediaRecorder.start(1000); // 每秒保存一次数据块
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      return { success: true };
    } catch (error: any) {
      console.error('启动录制失败:', error);
      setIsRecording(false);

      // 确保清理所有流
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      return { success: false, error: error.message };
    }
  }, [isRecording, stopRecording]);

  const uploadRecording = useCallback(async (
    sessionId: string,
    userId: string,
    title?: string
  ): Promise<RecordingData | null> => {
    if (!recordedBlob) {
      throw new Error('没有可上传的录制内容');
    }

    try {
      // 生成文件名
      const timestamp = Date.now();
      const fileName = `recording-${timestamp}.webm`;
      const filePath = `${userId}/${sessionId}/${fileName}`;

      console.log('开始上传录制内容...', {
        size: recordedBlob.size,
        path: filePath,
      });

      // 上传到 Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('live-recordings')
        .upload(filePath, recordedBlob, {
          contentType: 'video/webm',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('上传失败:', uploadError);
        throw uploadError;
      }

      console.log('上传成功:', uploadData);

      // 获取公开 URL
      const { data: urlData } = supabase.storage
        .from('live-recordings')
        .getPublicUrl(filePath);

      console.log('获取公开URL:', urlData.publicUrl);

      // 保存元数据到数据库
      const recordingTitle = title || `录制 - ${new Date().toLocaleString('zh-CN')}`;

      const { data: recording, error: dbError } = await supabase
        .from('live_recordings')
        .insert({
          session_id: sessionId,
          title: recordingTitle,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: recordedBlob.size,
          duration_seconds: recordingDuration,
          recorded_by: userId,
          status: 'completed',
        })
        .select()
        .single();

      if (dbError) {
        console.error('保存数据库记录失败:', dbError);
        throw dbError;
      }

      console.log('录制内容已保存到数据库:', recording);

      // 清理 blob
      setRecordedBlob(null);
      setRecordingDuration(0);

      return recording as RecordingData;
    } catch (error: any) {
      console.error('上传录制失败:', error);
      throw error;
    }
  }, [recordedBlob, recordingDuration]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setRecordedBlob(null);
    setRecordingDuration(0);
    setIsRecording(false);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    recordedBlob,
    recordingDuration,
    startRecording,
    stopRecording,
    uploadRecording,
    cancelRecording,
  };
}
