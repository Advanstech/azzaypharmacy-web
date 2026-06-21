'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { gql, setAuthToken } from '@/lib/gql';

interface CustomAuthContextType {
  user: any;
  session: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data?: any; error: string | null }>;
  requestLoginToken: (args: { email: string; phone?: string }) => Promise<{ error: string | null }>;
  verifyLoginToken: (args: { email: string; token: string; phone?: string }) => Promise<{ data?: any; error: string | null }>;
  signOut: () => Promise<void>;
}

const CustomAuthContext = createContext<CustomAuthContextType | undefined>(undefined);

const SESSION_VERSION = '1';

export function CustomAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
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
      }
    } catch (error) {
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
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
        return { data: authData, error: null };
      }
      return { error: 'Login failed' };
    } catch (error: any) {
      return { error: error.message || 'Authentication failed' };
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
      return { error: err?.message || 'Failed to send login token.' };
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
        const verifyResult = await gql<{ verifyCustomJwt: string }>(
          `mutation VerifyCustomJwt($token: String!) { verifyCustomJwt(token: $token) }`,
          { token: accessToken }
        );
        if (verifyResult.verifyCustomJwt) {
          const userData = JSON.parse(verifyResult.verifyCustomJwt);
          setUser(userData);
          setSession({ access_token: accessToken, user: userData });
        }
        return { data: { session: { access_token: accessToken } }, error: null };
      }
      return { error: 'Token verification failed' };
    } catch (err: any) {
      return { error: err?.message || 'Failed to verify token.' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    setAuthToken(null);
    setUser(null);
    setSession(null);
    window.location.href = '/';
  };

  return (
    <CustomAuthContext.Provider value={{ user, session, loading, signIn, requestLoginToken, verifyLoginToken, signOut }}>
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
