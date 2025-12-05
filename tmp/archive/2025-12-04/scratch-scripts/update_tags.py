from pathlib import Path
path = Path('src/app/actions/tags.ts')
text = path.read_text(encoding='utf-8')
old_imports = "import { createClient } from '@supabase/supabase-js'\nimport { cookies } from 'next/headers'\nimport { createServerClient } from '@supabase/ssr'"
if old_imports not in text:
    raise SystemExit('imports pattern missing')
text = text.replace(old_imports, "import { createAuthenticatedServerClient } from '@/lib/server/supabase'", 1)
old_fn = "async function createAuthenticatedClient() {\n  const cookieStore = await cookies()\n\n  return createServerClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,\n    {\n      cookies: {\n        getAll() {\n          return cookieStore.getAll()\n        },\n        setAll(cookiesToSet) {\n          try {\n            cookiesToSet.forEach(({ name, value, options }) =>\n              cookieStore.set(name, value, options)\n            )\n          } catch {\n            // Server Component 中忽略报错\n          }\n        },\n      },\n    }\n  )\n}\n"
if old_fn not in text:
    raise SystemExit('function pattern missing')
text = text.replace(old_fn, "async function createAuthenticatedClient() {\n  return createAuthenticatedServerClient()\n}\n", 1)
path.write_text(text, encoding='utf-8')
