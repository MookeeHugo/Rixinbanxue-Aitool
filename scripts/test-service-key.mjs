#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Testing Supabase Service Role Key...\n')
console.log('URL:', supabaseUrl)
console.log('Service Key (first 20 chars):', supabaseServiceKey?.substring(0, 20) + '...')
console.log('Anon Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...\n')

// Test 1: Database query with Service Role
console.log('Test 1: Database query with Service Role Key')
const adminClient = createClient(supabaseUrl, supabaseServiceKey)

try {
  const { data, error } = await adminClient
    .from('profiles')
    .select('count')
    .limit(1)

  if (error) {
    console.log('❌ Database query failed:', error.message)
  } else {
    console.log('✅ Database query succeeded\n')
  }
} catch (err) {
  console.log('❌ Exception:', err.message, '\n')
}

// Test 2: Auth admin query
console.log('Test 2: Auth admin list users')
try {
  const { data: { users }, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 })

  if (error) {
    console.log('❌ Auth admin failed:', error.message)
  } else {
    console.log(`✅ Auth admin succeeded (found ${users.length} user)\n`)
  }
} catch (err) {
  console.log('❌ Exception:', err.message, '\n')
}

// Test 3: Storage listBuckets
console.log('Test 3: Storage listBuckets')
try {
  const { data, error } = await adminClient.storage.listBuckets()

  if (error) {
    console.log('❌ Storage listBuckets failed:', error.message)
    console.log('   Error details:', error)
  } else {
    console.log(`✅ Storage listBuckets succeeded (found ${data.length} buckets)`)
    data.forEach(bucket => {
      console.log(`   - ${bucket.id} (public: ${bucket.public})`)
    })
  }
} catch (err) {
  console.log('❌ Exception:', err.message)
  console.log('   Stack:', err.stack)
}

console.log('\n' + '='.repeat(50))
console.log('Diagnosis Complete')
console.log('='.repeat(50))
