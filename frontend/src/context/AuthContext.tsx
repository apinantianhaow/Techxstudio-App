'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthFetch, OtpChallenge, User } from '@/types';

interface AuthResponse {
  user: User;
  token: string;
}

interface ProfileUpdate {
  full_name?: string;
  phone?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  isLoggedIn: boolean;
  /** Step 1: checks the password and emails a code. */
  login: (email: string, password: string) => Promise<OtpChallenge>;
  /** Creates the account and emails a code. */
  signup: (email: string, password: string, full_name: string) => Promise<OtpChallenge>;
  /** Step 2: exchanges the emailed code for a session. */
  verifyCode: (challengeId: string, code: string) => Promise<AuthResponse>;
  resendCode: (challengeId: string) => Promise<OtpChallenge>;
  /** Signs in with the ID token from Google's button (no emailed code). */
  loginWithGoogle: (credential: string) => Promise<AuthResponse>;
  logout: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<{ user: User }>;
  deleteAccount: () => Promise<{ success: boolean }>;
  authFetch: AuthFetch;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** POSTs JSON and returns the parsed body, throwing the API's error message. */
async function post<T>(url: string, body: unknown, fallbackError: string): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || fallbackError);
  return data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-attach Authorization header
  const authFetch = useCallback<AuthFetch>(
    async (url, options = {}) => {
      const headers = new Headers(options.headers);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(url, { ...options, headers });
    },
    [token]
  );

  // Load user on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('techx-token');
    if (savedToken) {
      setToken(savedToken);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => (res.ok ? (res.json() as Promise<{ user?: User }>) : null))
        .then((data) => {
          if (data?.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem('techx-token');
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('techx-token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const startSession = (data: AuthResponse): AuthResponse => {
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('techx-token', data.token);
    return data;
  };

  const login = (email: string, password: string) =>
    post<OtpChallenge>('/api/auth/login', { email, password }, 'Login failed');

  const signup = (email: string, password: string, full_name: string) =>
    post<OtpChallenge>('/api/auth/signup', { email, password, full_name }, 'Signup failed');

  const verifyCode = async (challengeId: string, code: string) =>
    startSession(await post<AuthResponse>('/api/auth/login/verify', { challenge_id: challengeId, code }, 'Verification failed'));

  const resendCode = (challengeId: string) =>
    post<OtpChallenge>('/api/auth/login/resend', { challenge_id: challengeId }, 'Could not resend the code');

  const loginWithGoogle = async (credential: string) =>
    startSession(await post<AuthResponse>('/api/auth/google', { credential }, 'Google sign-in failed'));

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('techx-token');
  };

  const updateProfile = async (data: ProfileUpdate): Promise<{ user: User }> => {
    const res = await authFetch('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Update failed');
    setUser(result.user);
    return result;
  };

  const deleteAccount = async (): Promise<{ success: boolean }> => {
    const res = await authFetch('/api/auth/me', { method: 'DELETE' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Delete failed');
    logout();
    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        user, token, loading, login, signup, verifyCode, resendCode, loginWithGoogle,
        logout, updateProfile, deleteAccount, authFetch, isLoggedIn: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
