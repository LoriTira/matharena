import { createClient } from '@supabase/supabase-js';

let adminClient: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Diagnostic: understand why the env var might be missing
  console.log('[admin] ENV diagnostic:', {
    hasUrl: !!url,
    hasServiceKey: !!serviceKey,
    serviceKeyType: typeof serviceKey,
    serviceKeyLength: serviceKey?.length ?? 'undefined',
    // Check for common issues: wrong name, extra spaces
    allSupabaseKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
  });

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return adminClient;
}
