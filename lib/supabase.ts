import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

function isRefreshTokenError(message?: string): boolean {
  if (!message) return false;
  const text = message.toLowerCase();
  return text.includes('refresh token') || text.includes('jwt expired');
}

export function clearSupabaseAuthStorage() {
  if (typeof window === 'undefined') return;

  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('sb-') && key.includes('auth-token')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage cleanup failures
  }
}

export async function getSessionSafe() {
  const { data, error } = await supabase.auth.getSession();

  if (error && isRefreshTokenError(error.message)) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    clearSupabaseAuthStorage();
    return { session: null, error };
  }

  return { session: data.session ?? null, error };
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
    clearSupabaseAuthStorage();
  }
});
