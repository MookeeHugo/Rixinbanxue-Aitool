#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const publishableKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const secretKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

console.log('🔍 Testing MCP Keys...\n')

// Test with secret key (equivalent to service role)
console.log('Test 1: Using SECRET key for admin operations')
const adminClient = createClient(supabaseUrl, secretKey)

try {
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 })

  if (error) {
    console.log('❌ Auth failed:', error.message)
  } else {
    console.log(`✅ Auth admin succeeded\n`)
  }
} catch (err) {
  console.log('❌ Exception:', err.message, '\n')
}

// Test Storage
console.log('Test 2: Storage listBuckets with SECRET key')
try {
  const { data, error } = await adminClient.storage.listBuckets()

  if (error) {
    console.log('❌ Storage failed:', error.message)
    console.log('   Status:', error.statusCode)
  } else {
    console.log(`✅ Storage succeeded (found ${data.length} buckets)`)
    data.forEach(bucket => {
      console.log(`   - ${bucket.id}`)
    })
  }
} catch (err) {
  console.log('❌ Exception:', err.message)
}

console.log('\n' + '='.repeat(50))
