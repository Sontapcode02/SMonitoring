import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  role: 'admin' | 'operator' | 'viewer';
  is_active: boolean;
  expires_at?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasRole: (allowedRoles: ('admin' | 'operator' | 'viewer')[]) => boolean;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('smonitoring_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('smonitoring_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Validate stored token on mount
    const initAuth = async () => {
      const storedToken = localStorage.getItem('smonitoring_token');
      if (storedToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            localStorage.setItem('smonitoring_user', JSON.stringify(userData));
          } else {
            // Invalid token
            logout();
          }
        } catch (err) {
          console.error("Auth validation failed:", err);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.detail || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.' };
      }

      setToken(data.access_token);
      setUser(data.user);

      localStorage.setItem('smonitoring_token', data.access_token);
      localStorage.setItem('smonitoring_user', JSON.stringify(data.user));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối tới máy chủ.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('smonitoring_token');
    localStorage.removeItem('smonitoring_user');
  };

  const hasRole = (allowedRoles: ('admin' | 'operator' | 'viewer')[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const getAuthHeaders = (): Record<string, string> => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      logout,
      hasRole,
      getAuthHeaders
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
