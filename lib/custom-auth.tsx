'use client';

import { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { gql, setAuthToken, M_RECORD_STAFF_LOGOUT } from '@/lib/gql';

interface CustomAuthContextType {
  user: any;
  session: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data?: any; error: string | null }>;
  signInWithPin: (email: string, pin: string) => Promise<{ data?: any; error: string | null }>;
  requestLoginToken: (args: { email: string; phone?: string }) => Promise<{ error: string | null }>;
  verifyLoginToken: (args: { email: string; token: string; phone?: string }) => Promise<{ data?: any; error: string | null }>;
  signOut: () => Promise<void>;
}

const CustomAuthContext = createContext<CustomAuthContextType | undefined>(undefined);

const SESSION_VERSION = '1';

function sanitizeAuthError(message?: string): string {
  if (!message) return 'Something went wrong. Please try again.';
  const m = message.toLowerCase();
  if (m.includes('invalid credentials') || m.includes('invalid login') || m.includes('wrong password') || m.includes('invalid password'))
    return 'Invalid email or password.';
  if (m.includes('user not found') || m.includes('no user') || m.includes('not registered'))
    return 'No account found with that email.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a moment and try again.';
  if (m.includes('network') || m.includes('fetch') || m.includes('unreachable') || m.includes('econnrefused') || m.includes('failed to fetch'))
    return 'Unable to reach the server. Please check your connection and try again.';
  if (m.includes('graphql') || m.includes('http error') || m.includes('validation_failed') || m.includes('cannot query') || m.includes('syntax'))
    return 'Service temporarily unavailable. Please try again shortly.';
  if (m.includes('expired') || m.includes('invalid token'))
    return 'Your session has expired. Please log in again.';
  if (m.includes('unauthorized') || m.includes('forbidden'))
    return 'Access denied. Please contact your administrator.';
  return 'Login failed. Please try again or use token login.';
}

function decodeJwtPayload(token: string): any | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    return JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// ─── Offline credential cache ────────────────────────────────────────────────
// On each successful online sign-in we store a PBKDF2 verifier (never the PIN/
// password itself) keyed by email, plus the last-issued token and user profile.
// When the API is unreachable, the same PIN/password is verified locally and
// the cached session restored, so staff can sign in with no connectivity.

const OFFLINE_CREDS_KEY = 'offline_credentials';

interface OfflineCredential {
  verifier: string;
  user: any;
  token: string;
  storedAt: number;
}

async function deriveVerifier(userId: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(`azzay-offline:${userId}`), iterations: 100_000, hash: 'SHA-256' },
    key,
    256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getOfflineCredential(email: string): OfflineCredential | null {
  try {
    const map = JSON.parse(localStorage.getItem(OFFLINE_CREDS_KEY) || '{}');
    return map[email.trim().toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

async function cacheOfflineCredential(email: string, user: any, secret: string, token: string) {
  try {
    if (!crypto?.subtle || !user?.id || !secret) return;
    const map = JSON.parse(localStorage.getItem(OFFLINE_CREDS_KEY) || '{}');
    map[email.trim().toLowerCase()] = {
      verifier: await deriveVerifier(user.id, secret),
      user,
      token,
      storedAt: Date.now(),
    } satisfies OfflineCredential;
    localStorage.setItem(OFFLINE_CREDS_KEY, JSON.stringify(map));
  } catch {
    // Non-fatal — offline sign-in just won't be available for this user
  }
}

function isConnectivityError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('fetch') || m.includes('network') || m.includes('unreachable') ||
    m.includes('econnrefused') || m.includes('failed to fetch') ||
    /http error 5\d\d/.test(m) || m.includes('timeout') || m.includes('timed out')
  );
}

export function CustomAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    // Decode JWT locally first — no network needed
    const payload = decodeJwtPayload(token);

    if (!payload) {
      // Malformed token — clear immediately
      localStorage.removeItem('auth_token');
      setLoading(false);
      return;
    }

    // Expired tokens still hydrate the session: when offline there is no way
    // to re-authenticate, so the user must stay signed in. When online, the
    // background verifyToken below rejects the expired JWT and signs out.

    // Token looks valid locally — hydrate state immediately so UI is ready
    setAuthToken(token);
    const cachedUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      branchId: payload.branchId ?? null,
      name: payload.name ?? payload.email,
    };
    setUser(cachedUser);
    setSession({ access_token: token, user: cachedUser });
    setLoading(false);

    // Background verify against server to catch revoked/inactive users
    verifyToken(token).catch(() => {});
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const result = await gql<{ verifyCustomJwt: string }>(
        `mutation VerifyCustomJwt($token: String!) {
          verifyCustomJwt(token: $token)
        }`,
        { token }
      );

      if (result.verifyCustomJwt) {
        const userData = JSON.parse(result.verifyCustomJwt);
        setUser(userData);
        setSession({ access_token: token, user: userData });
        setAuthToken(token);
      } else {
        // Server explicitly rejected the token (not a network error)
        localStorage.removeItem('auth_token');
        setAuthToken(null);
        setUser(null);
        setSession(null);
      }
    } catch (error: any) {
      const msg = (error?.message || '').toLowerCase();
      // Only clear the session on a definitive auth rejection. Anything else —
      // network failures, 5xx, timeouts — is transient and must not log the
      // user out (an API blip during a remount was wiping valid sessions).
      const isAuthRejection =
        msg.includes('unauthorized') ||
        msg.includes('invalid token') ||
        msg.includes('jwt expired') ||
        msg.includes('not found or inactive') ||
        msg.includes('http error 401') ||
        msg.includes('http error 403');
      if (isAuthRejection) {
        // Server confirmed token is invalid — log out
        localStorage.removeItem('auth_token');
        setAuthToken(null);
        setUser(null);
        setSession(null);
      }
      // Transient errors: keep token alive, user stays logged in
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await gql<{ customLogin: string }>(
        `mutation CustomLogin($email: String!, $password: String!) {
          customLogin(email: $email, password: $password)
        }`,
        { email, password }
      );
      
      if (result.customLogin) {
        const authData = JSON.parse(result.customLogin);
        localStorage.setItem('auth_token', authData.access_token);
        setUser(authData.user);
        setSession({ access_token: authData.access_token, user: authData.user });
        setAuthToken(authData.access_token);
        cacheOfflineCredential(email, authData.user, password, authData.access_token);
        return { data: authData, error: null };
      }
      return { error: 'Login failed. Please check your credentials.' };
    } catch (error: any) {
      if (isConnectivityError(error?.message || '')) {
        return await attemptOfflineLogin(email, password, 'password');
      }
      return { error: sanitizeAuthError(error.message) };
    }
  };

  const signInWithPin = async (email: string, pin: string) => {
    try {
      const result = await gql<{ loginWithPin: string }>(
        `mutation LoginWithPin($email: String!, $pin: String!) {
          loginWithPin(email: $email, pin: $pin)
        }`,
        { email, pin }
      );
      
      if (result.loginWithPin) {
        const authData = JSON.parse(result.loginWithPin);
        localStorage.setItem('auth_token', authData.access_token);
        setUser(authData.user);
        setSession({ access_token: authData.access_token, user: authData.user });
        setAuthToken(authData.access_token);
        cacheOfflineCredential(email, authData.user, pin, authData.access_token);
        return { data: authData, error: null };
      }
      return { error: 'Invalid PIN. Please try again.' };
    } catch (error: any) {
      if (isConnectivityError(error?.message || '')) {
        return await attemptOfflineLogin(email, pin, 'PIN');
      }
      return { error: sanitizeAuthError(error.message) };
    }
  };

  // Verify PIN/password against the credential cached at last online login.
  // Restores the previous token + profile so queued offline work continues.
  const attemptOfflineLogin = async (email: string, secret: string, kind: string) => {
    const entry = getOfflineCredential(email);
    if (!entry) {
      return { error: `Unable to reach the server. Offline sign-in isn't available for this account yet — sign in online once to enable it.` };
    }
    try {
      const verifier = await deriveVerifier(entry.user.id, secret);
      if (verifier !== entry.verifier) {
        return { error: kind === 'PIN' ? 'Invalid PIN. Please try again.' : 'Login failed. Please check your credentials.' };
      }
      localStorage.setItem('auth_token', entry.token);
      setAuthToken(entry.token);
      setUser(entry.user);
      setSession({ access_token: entry.token, user: entry.user });
      return { data: { user: entry.user, access_token: entry.token, offline: true }, error: null };
    } catch {
      return { error: 'Offline sign-in failed on this device.' };
    }
  };

  const requestLoginToken = async ({ email }: { email: string; phone?: string }) => {
    try {
      await gql<{ guardLoginTokenRequest: boolean }>(
        `mutation GuardLoginTokenRequest($email: String!) { guardLoginTokenRequest(email: $email) }`,
        { email: email.trim() }
      );
      return { error: null };
    } catch (err: any) {
      return { error: sanitizeAuthError(err?.message) || 'Failed to send login token.' };
    }
  };

  const verifyLoginToken = async ({ email, token }: { email: string; token: string; phone?: string }) => {
    try {
      const result = await gql<{ verifyCustomLoginToken: string }>(
        `mutation VerifyCustomLoginToken($email: String!, $otp: String!) { verifyCustomLoginToken(email: $email, otp: $otp) }`,
        { email: email.trim(), otp: token }
      );
      if (result.verifyCustomLoginToken) {
        const accessToken = result.verifyCustomLoginToken;
        localStorage.setItem('auth_token', accessToken);
        setAuthToken(accessToken);
        // Decode user data locally — no extra network round-trip needed
        const payload = decodeJwtPayload(accessToken);
        const userData = payload ? {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          branchId: payload.branchId ?? null,
          name: payload.name ?? payload.email,
        } : { email: email.trim() };
        setUser(userData);
        setSession({ access_token: accessToken, user: userData });
        return { data: { session: { access_token: accessToken }, user: userData }, error: null };
      }
      return { error: 'Invalid or expired token. Please request a new one.' };
    } catch (err: any) {
      return { error: sanitizeAuthError(err?.message) || 'Failed to verify token.' };
    }
  };

  const signOut = useCallback(async () => {
    // Record logout and set off-duty in staff activity log before clearing token
    const currentUserId = userRef.current?.id;
    try {
      if (currentUserId) {
        await gql(M_RECORD_STAFF_LOGOUT, { userId: currentUserId });
      }
    } catch (_) {}

    setAuthToken(null);
    setUser(null);
    setSession(null);

    try {
      localStorage.clear();
    } catch (_) {}
    try {
      sessionStorage.clear();
    } catch (_) {}
    try {
      const { clearCache } = await import('@/lib/offline');
      await clearCache();
    } catch (_) {}
    try {
      const keys = await caches?.keys?.() ?? [];
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (_) {}
    try {
      const registrations = await navigator?.serviceWorker?.getRegistrations?.() ?? [];
      await Promise.all(registrations.map((reg) => reg.unregister()));
    } catch (_) {}
    try {
      document.cookie.split(';').forEach((cookie) => {
        const [name] = cookie.split('=');
        document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
      });
    } catch (_) {}

    window.location.href = '/';
  }, []);

  // Auto sign-out after 30 minutes of inactivity
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;

    const IDLE_TIMEOUT = 30 * 60 * 1000;
    const THROTTLE = 1000;
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'wheel'];

    let idleTimer: ReturnType<typeof setTimeout>;
    let lastReset = 0;

    const resetTimer = () => {
      const now = Date.now();
      if (now - lastReset < THROTTLE) return;
      lastReset = now;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        signOut();
      }, IDLE_TIMEOUT);
    };

    resetTimer();
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, signOut]);

  return (
    <CustomAuthContext.Provider value={{ user, session, loading, signIn, signInWithPin, requestLoginToken, verifyLoginToken, signOut }}>
      {children}
    </CustomAuthContext.Provider>
  );
}

export function useCustomAuth() {
  const context = useContext(CustomAuthContext);
  if (context === undefined) {
    throw new Error('useCustomAuth must be used within CustomAuthProvider');
  }
  return context;
}
