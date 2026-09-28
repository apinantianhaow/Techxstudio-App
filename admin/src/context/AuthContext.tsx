'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, apiRequest, type RequestOptions } from '@/lib/api';
import type { OtpChallenge, User } from '@/types';

// Separate from the storefront's "techx-token" (the apps run on different origins anyway).
const TOKEN_KEY = 'techx-admin-token';

type Api = <T>(path: string, options?: RequestOptions) => Promise<T>;
type Session = { user: User; token: string };

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Step 1: checks the password (admins only) and emails a code. */
  login: (email: string, password: string) => Promise<OtpChallenge>;
  /** Step 2: exchanges the emailed code for a session. */
  verifyCode: (challengeId: string, code: string) => Promise<void>;
  resendCode: (challengeId: string) => Promise<OtpChallenge>;
  /** Signs in with the ID token from Google's button (no emailed code). */
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  /** apiRequest with the admin token; signs out on 401/403. */
  api: Api;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode / blocked storage: the session just won't survive a reload.
  }
}

const isAuthError = (err: unknown) => err instanceof ApiError && (err.status === 401 || err.status === 403);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    writeToken(null);
  }, []);

  // Restore the session; /api/admin/me also re-checks the admin role.
  useEffect(() => {
    const saved = readToken();
    if (!saved) {
      setLoading(false);
      return;
    }
    apiRequest<{ user: User }>('/api/admin/me', saved)
      .then((data) => {
        setToken(saved);
        setUser(data.user);
      })
      .catch((err) => {
        if (isAuthError(err)) writeToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const startSession = (data: Session) => {
    writeToken(data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const login = (email: string, password: string) =>
    apiRequest<OtpChallenge>('/api/admin/login', null, { method: 'POST', body: { email, password } });

  const verifyCode = async (challengeId: string, code: string) =>
    startSession(await apiRequest<Session>('/api/admin/login/verify', null, { method: 'POST', body: { challenge_id: challengeId, code } }));

  const resendCode = (challengeId: string) =>
    apiRequest<OtpChallenge>('/api/auth/login/resend', null, { method: 'POST', body: { challenge_id: challengeId } });

  const loginWithGoogle = async (credential: string) =>
    startSession(await apiRequest<Session>('/api/admin/login/google', null, { method: 'POST', body: { credential } }));

  const api = useCallback(
    async <T,>(path: string, options?: RequestOptions): Promise<T> => {
      try {
        return await apiRequest<T>(path, token, options);
      } catch (err) {
        if (isAuthError(err)) logout();
        throw err;
      }
    },
    [token, logout]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyCode, resendCode, loginWithGoogle, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
