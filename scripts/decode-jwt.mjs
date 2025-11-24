#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found')
  process.exit(1)
}

console.log('🔍 Decoding SERVICE_ROLE_KEY JWT...\n')

// JWT format: header.payload.signature
const parts = serviceRoleKey.split('.')

if (parts.length !== 3) {
  console.error('Invalid JWT format')
  process.exit(1)
}

try {
  // Decode header
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
  console.log('Header:', JSON.stringify(header, null, 2))

  // Decode payload
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
  console.log('\nPayload:', JSON.stringify(payload, null, 2))

  // Check role
  console.log('\n✅ JWT Role:', payload.role)
  console.log('✅ JWT Issuer:', payload.iss)
  console.log('✅ JWT Expiry:', new Date(payload.exp * 1000).toLocaleString())

} catch (err) {
  console.error('Failed to decode JWT:', err.message)
  process.exit(1)
}
