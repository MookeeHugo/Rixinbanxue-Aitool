#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Testing Supabase Storage with SERVICE_ROLE_KEY...\n')
console.log('URL:', supabaseUrl)
console.log('Service Key (first 30 chars):', serviceRoleKey?.substring(0, 30) + '...\n')

// Create admin client
const supabase = createClient(supabaseUrl, serviceRoleKey)

// Test 1: List buckets
console.log('Test 1: List Storage Buckets')
try {
  const { data, error } = await supabase.storage.listBuckets()

  if (error) {
    console.log('❌ List buckets failed:', error.message)
    console.log('   Status:', error.statusCode)
  } else {
    console.log(`✅ List buckets succeeded (found ${data.length} buckets)`)
    data.forEach(bucket => {
      console.log(`   - ${bucket.id} (public: ${bucket.public})`)
    })
  }
} catch (err) {
  console.log('❌ Exception:', err.message)
}

console.log()

// Test 2: Upload a test file
console.log('Test 2: Upload test file to question-files bucket')
try {
  const testContent = Buffer.from('test content ' + Date.now())
  const testKey = 'test-upload-' + Date.now() + '.txt'

  const { data, error } = await supabase.storage
    .from('question-files')
    .upload(testKey, testContent, {
      contentType: 'text/plain',
      upsert: true,
    })

  if (error) {
    console.log('❌ Upload failed:', error.message)
    console.log('   Status:', error.statusCode)
    console.log('   Error:', JSON.stringify(error, null, 2))
  } else {
    console.log('✅ Upload succeeded!')
    console.log('   Path:', data.path)

    // Clean up: delete test file
    const { error: deleteError } = await supabase.storage
      .from('question-files')
      .remove([testKey])

    if (!deleteError) {
      console.log('   (Test file cleaned up)')
    }
  }
} catch (err) {
  console.log('❌ Exception:', err.message)
  console.log('   Stack:', err.stack)
}

console.log('\n' + '='.repeat(50))
console.log('Diagnosis Complete')
console.log('='.repeat(50))
