#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorageBucket() {
  console.log('🚀 Setting up question-files storage bucket...\n')

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Failed to list buckets:', listError)
      process.exit(1)
    }

    const existingBucket = buckets.find(b => b.id === 'question-files')

    if (existingBucket) {
      console.log('✅ Bucket "question-files" already exists')
      console.log('   Public:', existingBucket.public)
      console.log('   File size limit:', existingBucket.file_size_limit)
      console.log('   Allowed MIME types:', existingBucket.allowed_mime_types)
      return
    }

    // Create bucket
    const { data, error } = await supabase.storage.createBucket('question-files', {
      public: false,
      fileSizeLimit: 20 * 1024 * 1024, // 20MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    })

    if (error) {
      console.error('❌ Failed to create bucket:', error)
      process.exit(1)
    }

    console.log('✅ Successfully created bucket "question-files"')
    console.log('   ID:', data.id || data.name)
    console.log('   Public: false')
    console.log('   File size limit: 20MB')
    console.log('   Allowed MIME types: JPG, PNG, PDF')

    // Note: RLS policies need to be set up via SQL
    console.log('\n📝 Note: RLS policies should be configured via SQL migration')
    console.log('   See: supabase/migrations/20241124000002_create_question_files_storage.sql')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

setupStorageBucket()
