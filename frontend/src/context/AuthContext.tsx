import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<AuthResponse>;
  registerCitizen: (name: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'sgf_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { user: User; token: string };
        setState({ user: parsed.user, token: parsed.token, loading: false });
      } catch {
        setState({ user: null, token: null, loading: false });
      }
    } else {
      setState({ user: null, token: null, loading: false });
    }
  }, []);

  useEffect(() => {
    if (state.user && state.token) localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: state.user, token: state.token }));
    else localStorage.removeItem(STORAGE_KEY);
  }, [state.user, state.token]);

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    setState({ user: res.user, token: res.token, loading: false });
    return res;
  }

  async function registerCitizen(name: string, email: string, password: string) {
    const res = await api.registerCitizen(name, email, password);
    setState({ user: res.user, token: res.token, loading: false });
    return res;
  }

  function logout() { setState({ user: null, token: null, loading: false }); }

  function hasRole(roles: UserRole | UserRole[]) {
    const roleList = Array.isArray(roles) ? roles : [roles];
    return !!state.user && roleList.includes(state.user.role);
  }

  const value = useMemo<AuthContextValue>(() => ({ ...state, login, registerCitizen, logout, hasRole }), [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


