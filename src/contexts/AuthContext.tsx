import { createContext, useContext, type ReactNode } from 'react';

interface UserInfo {
  email: string;
  name: string;
}

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  token: string | null;
  login: (token: string, userInfo?: UserInfo) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user: UserInfo = { email: 'itsamliu2025@gmail.com', name: '測試用戶' };

  return (
    <AuthContext.Provider value={{ user, loading: false, token: 'bypass-mode', login: () => {}, logout: () => {}, isAuthenticated: true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
