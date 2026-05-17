'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { setAuthToken } from '@/lib/gql';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Bump this when auth config changes (e.g. key format change) to force all clients to re-login
const SESSION_VERSION = '3';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If session version mismatch, clear all stale storage and force re-login
    const storedVersion = localStorage.getItem('_sv');
    if (storedVersion !== SESSION_VERSION) {
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setAuthToken(null);
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('_sv', SESSION_VERSION);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthToken(session?.access_token ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthToken(session?.access_token ?? null);
        setLoading(false);
        // Stale refresh token — clear everything
        if (!session && _event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Handle refresh token errors specifically
        if (error.message.includes('refresh token')) {
          // Clear stale tokens
          await supabase.auth.signOut();
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('supabase.auth.refreshToken');
        }
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      return { error: 'Authentication failed. Please try again.' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_) {}

    // Clear gql token cache
    setAuthToken(null);

    // Clear all localStorage keys (Supabase stores session here)
    try {
      localStorage.clear();
    } catch (_) {}

    // Clear sessionStorage
    try {
      sessionStorage.clear();
    } catch (_) {}

    // Clear IndexedDB app caches
    try {
      const { clearCache } = await import('@/lib/offline');
      await clearCache();
    } catch (_) {}

    // Re-stamp version so next login doesn't re-trigger a forced clear
    try { localStorage.setItem('_sv', SESSION_VERSION); } catch (_) {}

    // Hard redirect to login — no stale React state
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
