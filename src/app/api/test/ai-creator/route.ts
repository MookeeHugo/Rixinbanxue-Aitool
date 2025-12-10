/**
 * AI 创作测试 API 端点
 *
 * 用于测试脚本调用，通过Authorization header认证后设置cookies，然后调用Server Action
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { generateMathQuestion } from '@/app/actions/ai-creator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parameters } = body;

    if (!parameters) {
      return NextResponse.json(
        { success: false, error: '缺少 parameters 参数', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // 从Authorization header获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '缺少认证token', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '认证失败', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 设置cookies以供Server Action使用
    const cookieStore = cookies();
    const sessionData = {
      access_token: token,
      refresh_token: '',
      expires_in: 3600,
      token_type: 'bearer',
      user: user,
    };

    // 设置认证cookie（URL编码的JSON）
    cookieStore.set('sb-auth-token', encodeURIComponent(JSON.stringify(sessionData)), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
    });

    // 调用 Server Action
    const result = await generateMathQuestion(parameters);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Test API] 执行失败:', {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
