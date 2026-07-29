import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = String(
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || ''
).trim();
const supabaseAnonKey = String(
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
).trim();

function validateConfiguration() {
  const problems: string[] = [];
  if (!supabaseUrl) problems.push('NEXT_PUBLIC_SUPABASE_URL is missing');
  if (!supabaseAnonKey) problems.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) problems.push('Supabase URL is not a valid https://*.supabase.co project URL');
    } catch { problems.push('Supabase URL is malformed'); }
  }
  if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ') && !supabaseAnonKey.startsWith('sb_publishable_')) {
    problems.push('Supabase anonymous/publishable key has an unrecognized format');
  }
  if (problems.length) {
    console.error('[supabase:init] Invalid configuration', { problems, hasUrl: Boolean(supabaseUrl), hasAnonKey: Boolean(supabaseAnonKey) });
    throw new Error(`Supabase configuration error: ${problems.join('; ')}`);
  }
  console.info('[supabase:init] Client configuration verified', {
    projectHost: new URL(supabaseUrl).hostname,
    keyType: supabaseAnonKey.startsWith('sb_publishable_') ? 'publishable' : 'legacy-anon',
    sdk: '@supabase/supabase-js v2',
  });
}

validateConfiguration();

declare global {
  // eslint-disable-next-line no-var
  var __studyMateSupabase: SupabaseClient | undefined;
}

const supabase = globalThis.__studyMateSupabase ?? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'studymate-auth',
  },
});

if (import.meta.env.DEV) globalThis.__studyMateSupabase = supabase;

export const supabaseConfig = {
  urlConfigured: Boolean(supabaseUrl),
  anonKeyConfigured: Boolean(supabaseAnonKey),
  projectHost: new URL(supabaseUrl).hostname,
};

export default supabase;
