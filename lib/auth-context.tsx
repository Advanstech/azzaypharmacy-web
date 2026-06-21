'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, getSessionSafe } from '@/lib/supabase';
import {
  gql,
  setAuthToken,
  M_GUARD_LOGIN_TOKEN_REQUEST,
  M_GUARD_LOGIN_TOKEN_VERIFY,
  M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT,
  M_GENERATE_CUSTOM_LOGIN_TOKEN,
  M_VERIFY_CUSTOM_LOGIN_TOKEN,
} from '@/lib/gql';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data?: any; error: string | null }>;
  requestLoginToken: (args: { email: string; phone?: string }) => Promise<{ error: string | null }>;
  verifyLoginToken: (args: { email: string; token: string; phone?: string }) => Promise<{ data?: any; error: string | null }>;
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
  if (lower.includes('otp expired') || lower.includes('token has expired') || lower.includes('invalid otp')) {
    return 'Token has expired or is invalid. Please request a new code and try again.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Invalid or expired token. Please request a new code and try again.';
  }
  if (lower.includes('user not found') || lower.includes('no user')) {
    return 'No account found with this email. Contact your manager.';
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
    getSessionSafe().then(({ session, error }) => {
      console.log('[AUTH] Initial session:', session ? `user=${session.user.email} expires=${new Date(session.expires_at! * 1000).toISOString()}` : `null (error=${error?.message ?? 'none'})`);
      setSession(session);
      setUser(session?.user ?? null);
      setAuthToken(session?.access_token ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log(`[AUTH] onAuthStateChange: event=${_event} user=${session?.user?.email ?? 'null'} token=${session?.access_token ? 'YES' : 'MISSING'}`);
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
      return { data, error: null };
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

      // Generate custom OTP for logging (parallel to Supabase OTP)
      gql<{ generateCustomLoginToken: boolean }>(M_GENERATE_CUSTOM_LOGIN_TOKEN, {
        email: cleanEmail,
      }).catch((err) => {
        if (DEBUG_AUTH) console.warn('[AUTH][OTP] Custom OTP generation failed (non-blocking):', err?.message);
      });

      const { data: emailData, error: emailError } = await supabase.auth.signInWithOtp({
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
        // Log the OTP if available in development
        if (emailData) {
          console.log('[AUTH][OTP] 🔐 6-DIGIT EMAIL TOKEN (development):', emailData);
        }
      }

      let smsError: string | null = null;
      const cleanPhone = phone?.trim();
      if (cleanPhone) {
        const { data: smsData, error } = await supabase.auth.signInWithOtp({
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
          // Log the OTP if available in development
          if (smsData) {
            console.log('[AUTH][OTP] 🔐 6-DIGIT SMS TOKEN (development):', smsData);
          }
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

      // Rate-limit / lock check — non-blocking: if this call fails (network, etc), still attempt verify
      gql<{ guardLoginTokenVerify: boolean }>(M_GUARD_LOGIN_TOKEN_VERIFY, {
        email: cleanEmail,
      }).catch((err) => {
        if (DEBUG_AUTH) console.warn('[AUTH][OTP] guardLoginTokenVerify call failed (non-blocking):', err?.message);
      });

      if (DEBUG_AUTH) {
        console.log('[AUTH][OTP] Verify started', {
          email: maskEmail(cleanEmail),
          phone: maskPhone(cleanPhone),
          tokenLength: token.length,
        });
      }

      // Try custom OTP verification first (for development - uses backend terminal OTP)
      let customOtpAccessToken: string | null = null;
      try {
        const verifyResult = await gql<{ verifyCustomLoginToken: string }>(M_VERIFY_CUSTOM_LOGIN_TOKEN, {
          email: cleanEmail,
          token,
        });
        customOtpAccessToken = verifyResult.verifyCustomLoginToken || null;
        
        if (DEBUG_AUTH) {
          console.log('[AUTH][OTP] Custom OTP verification', {
            email: maskEmail(cleanEmail),
            hasAccessToken: !!customOtpAccessToken,
          });
        }
      } catch (err: any) {
        if (DEBUG_AUTH) {
          console.log('[AUTH][OTP] Custom OTP verification failed (non-fatal)', {
            error: err?.message,
          });
        }
      }

      if (customOtpAccessToken) {
        // Custom OTP verified - use the access token to set Supabase session
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: customOtpAccessToken,
            refresh_token: customOtpAccessToken, // custom JWT — Supabase will reject refresh; session lifespan = JWT expiry (7d)
          });

          if (DEBUG_AUTH) {
            console.log('[AUTH][OTP] Supabase session set from custom OTP', {
              ok: !sessionError,
              error: sessionError?.message,
              hasSession: !!sessionData?.session,
            });
          }

          if (!sessionError && sessionData?.session) {
            setSession(sessionData.session);
            setUser(sessionData.session.user);
            setAuthToken(sessionData.session.access_token);

            gql<{ recordLoginTokenVerifyAttempt: boolean }>(M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT, {
              email: cleanEmail,
              success: true,
              reason: null,
            }).catch(() => null);
            return { data: sessionData, error: null };
          }
        } catch (sessionErr: any) {
          if (DEBUG_AUTH) {
            console.error('[AUTH][OTP] Failed to set Supabase session from custom OTP', sessionErr);
          }
        }
      }

      // Try email OTP (Supabase - this is the actual authentication)
      const { data: emailData, error: emailError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: 'email',
      });

      if (DEBUG_AUTH) {
        console.log('[AUTH][OTP] Verify email response', {
          email: maskEmail(cleanEmail),
          ok: !emailError,
          error: emailError?.message ?? null,
          hasSession: !!emailData?.session,
        });
      }

      if (!emailError && emailData?.session) {
        // Explicitly hydrate auth state so the session is ready before redirect
        setSession(emailData.session);
        setUser(emailData.session.user);
        setAuthToken(emailData.session.access_token);

        gql<{ recordLoginTokenVerifyAttempt: boolean }>(M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT, {
          email: cleanEmail,
          success: true,
          reason: null,
        }).catch(() => null);
        return { data: emailData, error: null };
      }

      // Fall back to SMS OTP if phone is available
      if (cleanPhone) {
        const { data: smsData, error: smsError } = await supabase.auth.verifyOtp({
          phone: cleanPhone,
          token,
          type: 'sms',
        });

        if (DEBUG_AUTH) {
          console.log('[AUTH][OTP] Verify SMS response', {
            phone: maskPhone(cleanPhone),
            ok: !smsError,
            hasSession: !!smsData?.session,
            error: smsError?.message ?? null,
          });
        }

        if (!smsError && smsData?.session) {
          setSession(smsData.session);
          setUser(smsData.session.user);
          setAuthToken(smsData.session.access_token);

          gql<{ recordLoginTokenVerifyAttempt: boolean }>(M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT, {
            email: cleanEmail,
            success: true,
            reason: null,
          }).catch(() => null);
          return { data: smsData, error: null };
        }

        // Both failed
        const failReason = smsError?.message || emailError?.message || 'Unknown';
        gql<{ recordLoginTokenVerifyAttempt: boolean }>(M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT, {
          email: cleanEmail,
          success: false,
          reason: failReason,
        }).catch(() => null);

        return { error: normalizeOtpError(smsError?.message || emailError?.message || 'Token verification failed') };
      }

      // Email-only failure
      const failReason = emailError?.message || 'Unknown';
      gql<{ recordLoginTokenVerifyAttempt: boolean }>(M_RECORD_LOGIN_TOKEN_VERIFY_ATTEMPT, {
        email: cleanEmail,
        success: false,
        reason: failReason,
      }).catch(() => null);

      return { error: normalizeOtpError(emailError?.message || 'Token verification failed') };
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

// Re-export new auth hook under the old name for any remaining imports
export { useCustomAuth as useAuthCompat } from '@/lib/custom-auth';
