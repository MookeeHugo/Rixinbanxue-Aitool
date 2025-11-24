import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  // Test creating a client with SERVICE_ROLE_KEY
  const testClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Try to list buckets
  const { data, error } = await testClient.storage.listBuckets()

  return NextResponse.json({
    config: {
      SUPABASE_URL,
      SERVICE_KEY_PREFIX: SUPABASE_SERVICE_KEY?.substring(0, 30) + '...',
      SERVICE_KEY_LENGTH: SUPABASE_SERVICE_KEY?.length || 0,
    },
    test: {
      success: !error,
      bucketsCount: data?.length || 0,
      error: error ? {
        message: error.message,
        status: (error as any).statusCode
      } : null,
    },
  })
}
