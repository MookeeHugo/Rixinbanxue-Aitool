#!/usr/bin/env node

import jwt from 'jsonwebtoken'

const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long'

// Generate ANON key - match Supabase demo defaults
const anonToken = jwt.sign(
  {
    role: 'anon',
    iss: 'supabase-demo',
  },
  JWT_SECRET,
  {
    expiresIn: '10y',
  }
)

// Generate SERVICE_ROLE key - match Supabase demo defaults
const serviceRoleToken = jwt.sign(
  {
    role: 'service_role',
    iss: 'supabase-demo',
  },
  JWT_SECRET,
  {
    expiresIn: '10y',
  }
)

console.log('✅ Generated JWT tokens with correct secret:\n')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=')
console.log(anonToken)
console.log('\nSUPABASE_SERVICE_ROLE_KEY=')
console.log(serviceRoleToken)

console.log('\n\n🔍 Verifying tokens...\n')

// Verify ANON token
const anonDecoded = jwt.verify(anonToken, JWT_SECRET)
console.log('ANON token:', JSON.stringify(anonDecoded, null, 2))

// Verify SERVICE_ROLE token
const serviceDecoded = jwt.verify(serviceRoleToken, JWT_SECRET)
console.log('\nSERVICE_ROLE token:', JSON.stringify(serviceDecoded, null, 2))

console.log('\n✅ All tokens verified successfully!')
