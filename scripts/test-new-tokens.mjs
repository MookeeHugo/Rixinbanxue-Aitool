#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTc2MzkzNTgwMiwiZXhwIjoyMDc5NTExODAyfQ.icBbD2tC2SgjBdIT15HtlSEaZJVfY6a-bowT92BSxlo'

console.log('🔍 Testing Storage with NEW SERVICE_ROLE_KEY (generated with correct secret)...\n')

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
  const testKey = 'test-upload-' + Date.now() + '.png'

  const { data, error } = await supabase.storage
    .from('question-files')
    .upload(testKey, testContent, {
      contentType: 'image/png',
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
console.log('Test Complete')
console.log('='.repeat(50))
