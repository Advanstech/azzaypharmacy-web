'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, getSessionSafe } from '@/lib/supabase';
import {
  gql,
  setAuthToken,
  M_GUARD_LOGIN_TOKEN_REQUEST,
  M_GUARD_LOGIN_TOKEN_VERIFY,
  M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT,
} from '@/lib/gql';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  requestLoginToken: (args: { email: string; phone?: string }) => Promise<{ error: string | null }>;
  verifyLoginToken: (args: { email: string; token: string; phone?: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Bump this when auth config changes (e.g. key format change) to force all clients to re-login
const SESSION_VERSION = '3';
const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true';

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  if (name.length <= 2) return `${name[0] ?? '*'}*@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone?: string): string {
  if (!phone) return 'N/A';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '***';
  return `***${digits.slice(-4)}`;
}

function normalizeOtpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('rate limit')) {
    return 'Email rate limit exceeded. Please wait about 60 seconds and try again.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Account credentials are invalid. Please use password login or reset your password.';
  }
  return message;
}

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
    getSessionSafe().then(({ session }) => {
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

  const requestLoginToken = async ({ email, phone }: { email: string; phone?: string }) => {
    try {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        return { error: 'Email is required for token login.' };
      }

      if (DEBUG_AUTH) {
        console.log('[AUTH][OTP] Request started', {
          email: maskEmail(cleanEmail),
          phone: maskPhone(phone),
          shouldCreateUser: false,
        });
      }

      await gql<{ guardLoginTokenRequest: boolean }>(M_GUARD_LOGIN_TOKEN_REQUEST, {
        email: cleanEmail,
      });

      const { error: emailError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (DEBUG_AUTH) {
        console.log('[AUTH][OTP] Email OTP response', {
          email: maskEmail(cleanEmail),
          ok: !emailError,
          error: emailError?.message ?? null,
        });
      }

      let smsError: string | null = null;
      const cleanPhone = phone?.trim();
      if (cleanPhone) {
        const { error } = await supabase.auth.signInWithOtp({
          phone: cleanPhone,
          options: { shouldCreateUser: false },
        });
        smsError = error?.message ?? null;

        if (DEBUG_AUTH) {
          console.log('[AUTH][OTP] SMS OTP response', {
            phone: maskPhone(cleanPhone),
            ok: !smsError,
            error: smsError,
          });
        }
      }

      if (emailError && smsError) {
        return { error: normalizeOtpError(emailError.message) };
      }

      if (emailError && !cleanPhone) {
        return { error: normalizeOtpError(emailError.message) };
      }

      if (DEBUG_AUTH) {
        console.log('[AUTH][OTP] Request completed', {
          emailOk: !emailError,
          smsOk: cleanPhone ? !smsError : null,
          hasAnySuccess: !emailError || !!(cleanPhone && !smsError),
        });
      }

      return { error: null };
    } catch (error: any) {
      if (DEBUG_AUTH) {
        console.error('[AUTH][OTP] Request crashed', {
          error: error?.message || error,
        });
      }
      return { error: 'Failed to send login token. Please try again.' };
    }
  };

  const verifyLoginToken = async ({ email, token, phone }: { email: string; token: string; phone?: string }) => {
    try {
      const cleanEmail = email.trim();
      const cleanPhone = phone?.trim();

      await gql<{ guardLoginTokenVerify: boolean }>(M_GUARD_LOGIN_TOKEN_VERIFY, {
        email: cleanEmail,
      });

      if (DEBUG_AUTH) {
        console.log('[AUTH][OTP] Verify started', {
          email: maskEmail(cleanEmail),
          phone: maskPhone(cleanPhone),
          tokenLength: token.length,
        });
      }

      const { error: emailError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: 'email',
      });

      if (DEBUG_AUTH) {
        console.log('[AUTH][OTP] Verify email response', {
          email: maskEmail(cleanEmail),
          ok: !emailError,
          error: emailError?.message ?? null,
        });
      }

      if (!emailError) {
        await gql<{ recordLoginTokenVerifyAttempt: boolean }>(M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT, {
          email: cleanEmail,
          success: true,
          reason: null,
        });
        return { error: null };
      }

      if (cleanPhone) {
        const { error: smsError } = await supabase.auth.verifyOtp({
          phone: cleanPhone,
          token,
          type: 'sms',
        });

        if (DEBUG_AUTH) {
          console.log('[AUTH][OTP] Verify SMS response', {
            phone: maskPhone(cleanPhone),
            ok: !smsError,
            error: smsError?.message ?? null,
          });
        }

        if (!smsError) {
          await gql<{ recordLoginTokenVerifyAttempt: boolean }>(M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT, {
            email: cleanEmail,
            success: true,
            reason: null,
          });
          return { error: null };
        }

        await gql<{ recordLoginTokenVerifyAttempt: boolean }>(M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT, {
          email: cleanEmail,
          success: false,
          reason: smsError.message,
        }).catch(() => null);

        return { error: normalizeOtpError(smsError.message) };
      }

      await gql<{ recordLoginTokenVerifyAttempt: boolean }>(M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT, {
        email: cleanEmail,
        success: false,
        reason: emailError.message,
      }).catch(() => null);

      return { error: normalizeOtpError(emailError.message) };
    } catch (error: any) {
      if (DEBUG_AUTH) {
        console.error('[AUTH][OTP] Verify crashed', {
          error: error?.message || error,
        });
      }
      return { error: 'Failed to verify login token. Please try again.' };
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
    <AuthContext.Provider value={{ user, session, loading, signIn, requestLoginToken, verifyLoginToken, signOut }}>
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
