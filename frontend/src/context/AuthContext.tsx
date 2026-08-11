import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as loginRequest, registerUser } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { decodeUsername } from '../api/jwt';
import { getToken, setToken as persistToken } from '../api/tokenStore';

interface AuthContextValue {
  isAuthenticated: boolean;
  username: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, fullName: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());

  useEffect(() => {
    setUnauthorizedHandler(() => {
      persistToken(null);
      setTokenState(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await loginRequest(identifier, password);
    persistToken(response.access_token);
    setTokenState(response.access_token);
  };

  const register = async (username: string, email: string, fullName: string, password: string) => {
    await registerUser({ username, email, full_name: fullName, password });
    await login(username, password);
  };

  const logout = () => {
    persistToken(null);
    setTokenState(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: token !== null,
      username: token ? decodeUsername(token) : null,
      login,
      register,
      logout,
    }),
    [token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
