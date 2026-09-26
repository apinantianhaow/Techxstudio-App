'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthFetch, User } from '@/types';

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
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (email: string, password: string, full_name: string) => Promise<AuthResponse>;
  logout: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<{ user: User }>;
  deleteAccount: () => Promise<{ success: boolean }>;
  authFetch: AuthFetch;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('techx-token', data.token);
    return data;
  };

  const signup = async (email: string, password: string, full_name: string): Promise<AuthResponse> => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('techx-token', data.token);
    return data;
  };

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
      value={{ user, token, loading, login, signup, logout, updateProfile, deleteAccount, authFetch, isLoggedIn: !!user }}
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
