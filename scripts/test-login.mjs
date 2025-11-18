import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Testing login with student@test.com...\n');

try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'student@test.com',
    password: 'test123456',
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    console.error('Error details:', error);
  } else {
    console.log('✅ Login successful!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Access token (first 50 chars):', data.session.access_token.substring(0, 50) + '...');
  }
} catch (err) {
  console.error('❌ Unexpected error:', err);
}
