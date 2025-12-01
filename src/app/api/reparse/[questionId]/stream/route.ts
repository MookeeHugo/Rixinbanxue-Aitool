/**
 * SSE (Server-Sent Events) endpoint for real-time reparse progress
 * GET /api/reparse/[questionId]/stream
 *
 * Streams reparse progress updates to the client in real-time.
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { logger } from '@/lib/logger';
import { downloadFile, uploadFile, FileAccessLevel } from '@/lib/storage';
import { parseQuestionWithCascadingFromBuffer } from '@/lib/ai-question-bank/gemini-vision-client';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { QuestionImageAsset } from '@/lib/ai-question-bank/types';

interface RouteParams {
  params: Promise<{
    questionId: string;
  }>;
}

function createServiceSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('缺少 Supabase 服务配置');
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

/**
 * 发送 SSE 消息
 */
function sendSSEMessage(
  controller: ReadableStreamDefaultController,
  type: 'progress' | 'status' | 'error' | 'complete',
  data: Record<string, unknown>
) {
  const message = JSON.stringify({ type, ...data, timestamp: Date.now() });
  controller.enqueue(new TextEncoder().encode(`data: ${message}\n\n`));
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  const { questionId } = await params;

  try {
    const supabase = createServerClient();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get question and verify ownership
    const { data: question, error: questionError } = await supabase
      .from('parsed_questions')
      .select(`
        id,
        upload_task_id,
        number,
        original_image_url,
        reparse_status
      `)
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return new Response('Question not found', { status: 404 });
    }

    // Verify task ownership
    const { data: task, error: taskError } = await supabase
      .from('upload_tasks')
      .select('id, user_id, file_url')
      .eq('id', question.upload_task_id)
      .single();

    if (taskError || !task || task.user_id !== user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    // Check if reparse is pending
    if (question.reparse_status !== 'pending') {
      return new Response('No pending reparse task', { status: 400 });
    }

    const sourceImageKey = question.original_image_url || task.file_url;
    if (!sourceImageKey) {
      return new Response('Missing source image', { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();

    // Create SSE stream
    const stream = new ReadableStream({
      start: async (controller) => {
        let aborted = false;

        // Handle abort
        req.signal.addEventListener('abort', () => {
          aborted = true;
          try {
            controller.close();
          } catch (e) {
            // Already closed
          }
        });

        try {
          // Update status to processing
          await serviceClient
            .from('parsed_questions')
            .update({ reparse_status: 'processing' })
            .eq('id', questionId);

          sendSSEMessage(controller, 'status', {
            status: 'processing',
            message: '开始重新解析...'
          });

          // Step 1: Download source image
          sendSSEMessage(controller, 'progress', {
            step: 'downloading',
            progress: 10,
            message: '正在下载原始图片...'
          });

          if (aborted) return;

          const imageBuffer = await downloadFile(sourceImageKey, FileAccessLevel.PRIVATE);

          sendSSEMessage(controller, 'progress', {
            step: 'downloaded',
            progress: 25,
            message: '图片下载完成'
          });

          if (aborted) return;

          // Step 2: Call Gemini Vision API
          sendSSEMessage(controller, 'progress', {
            step: 'parsing',
            progress: 30,
            message: '正在调用 AI 解析...'
          });

          const parseResult = await parseQuestionWithCascadingFromBuffer(imageBuffer);

          sendSSEMessage(controller, 'progress', {
            step: 'parsed',
            progress: 70,
            message: `AI 解析完成，识别到 ${parseResult.questions.length} 道题目`
          });

          if (aborted) return;

          // Step 3: Find matching question by number
          const questionNumber = question.number || '1';
          const matchedQuestion = parseResult.questions.find(
            q => q.number === questionNumber ||
                 q.number.replace(/\D/g, '') === questionNumber.replace(/\D/g, '')
          ) || parseResult.questions[0];

          if (!matchedQuestion) {
            throw new Error('未能在解析结果中找到对应题目');
          }

          sendSSEMessage(controller, 'progress', {
            step: 'matching',
            progress: 75,
            message: `已匹配到第 ${matchedQuestion.number} 题`
          });

          if (aborted) return;

          // Step 4: Upload cropped images if available
          const imageAssets: QuestionImageAsset[] = [];
          const imageRegions = matchedQuestion.image_regions || matchedQuestion.images || [];

          if (imageRegions.length > 0) {
            sendSSEMessage(controller, 'progress', {
              step: 'cropping',
              progress: 80,
              message: `正在处理 ${imageRegions.length} 张配图...`
            });

            for (let i = 0; i < imageRegions.length; i++) {
              const region = imageRegions[i];
              if (region.base64 && region.anchor_id) {
                try {
                  // Extract base64 data
                  const base64Data = region.base64.replace(/^data:image\/\w+;base64,/, '');
                  const buffer = Buffer.from(base64Data, 'base64');

                  // Upload to storage
                  const fileName = `ai-question-bank/${task.id}/reparse/${questionId}/${region.anchor_id}.png`;

                  const { data: urlData } = await serviceClient.storage
                    .from('question-images')
                    .upload(fileName, buffer, {
                      contentType: 'image/png',
                      upsert: true
                    });

                  const { data: publicUrlData } = serviceClient.storage
                    .from('question-images')
                    .getPublicUrl(fileName);

                  imageAssets.push({
                    id: region.anchor_id,
                    url: publicUrlData.publicUrl,
                    key: fileName,
                    questionNumber: matchedQuestion.number,
                    order: i + 1,
                    placeholder: region.label || region.anchor_id,
                    used: i === 0,
                    source: 'ai',
                    region: region.pixel_rect,
                    padding: region.padding
                  });

                  sendSSEMessage(controller, 'progress', {
                    step: 'uploading',
                    progress: 80 + (i + 1) * (15 / imageRegions.length),
                    message: `已上传配图 ${i + 1}/${imageRegions.length}`
                  });
                } catch (uploadError) {
                  logger.error('Failed to upload cropped image', {
                    questionId,
                    anchorId: region.anchor_id,
                    error: uploadError
                  });
                }
              }
            }
          }

          if (aborted) return;

          // Step 5: Update question record
          sendSSEMessage(controller, 'progress', {
            step: 'saving',
            progress: 95,
            message: '正在保存解析结果...'
          });

          const difficulty = matchedQuestion.meta?.difficulty || 'medium';
          const tags = matchedQuestion.meta?.tags || [];
          const type = matchedQuestion.meta?.type || 'essay';

          const updateData: Record<string, unknown> = {
            content: matchedQuestion.content,
            options: matchedQuestion.options || [],
            answer: matchedQuestion.answer || '',
            type,
            tags: {
              difficulty,
              knowledge: tags,
              type
            },
            confidence: 0.9, // AI重解析默认置信度
            reparse_status: 'completed',
            last_reparse_at: new Date().toISOString()
          };

          if (imageAssets.length > 0) {
            updateData.image_assets = imageAssets;
            updateData.question_image_url = imageAssets[0].url;
          }

          const { error: updateError } = await serviceClient
            .from('parsed_questions')
            .update(updateData)
            .eq('id', questionId);

          if (updateError) {
            throw new Error(`保存失败: ${updateError.message}`);
          }

          // Send completion message
          sendSSEMessage(controller, 'complete', {
            progress: 100,
            message: '重新解析完成',
            result: {
              content: matchedQuestion.content,
              type,
              difficulty,
              imageCount: imageAssets.length
            }
          });

          logger.info('Reparse completed', { questionId, userId: user.id });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '解析失败';

          logger.error('Reparse failed', { questionId, error });

          // Update status to failed
          await serviceClient
            .from('parsed_questions')
            .update({
              reparse_status: 'failed',
              last_reparse_at: new Date().toISOString()
            })
            .eq('id', questionId);

          sendSSEMessage(controller, 'error', {
            message: errorMessage
          });
        } finally {
          // Close stream
          try {
            controller.close();
          } catch (e) {
            // Already closed
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    logger.error('Reparse SSE endpoint error', { questionId, error });
    return new Response('Internal server error', { status: 500 });
  }
}
