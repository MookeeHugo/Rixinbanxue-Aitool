from pathlib import Path
import re
path = Path('src/app/actions/tags.ts')
text = path.read_text(encoding='utf-8')
text = text.replace("import { createClient } from '@supabase/supabase-js'\nimport { cookies } from 'next/headers'\nimport { createServerClient } from '@supabase/ssr'", "import { createAuthenticatedServerClient } from '@/lib/server/supabase'", 1)
pattern = r"async function createAuthenticatedClient\(\) \{[\s\S]*?\n\}\n"
text, count = re.subn(pattern, "async function createAuthenticatedClient() {\n  return createAuthenticatedServerClient()\n}\n\n", text, count=1)
if count != 1:
    raise SystemExit('function replace failed')
path.write_text(text, encoding='utf-8')
