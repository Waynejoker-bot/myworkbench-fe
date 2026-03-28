import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { apiClient, AUTH_UNAUTHORIZED_EVENT } from "../lib/api-client";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  needsLogin: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearNeedsLogin: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("access_token")
  );
  const [needsLogin, setNeedsLogin] = useState(false);

  // 监听 401 未授权事件
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setNeedsLogin(true);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    await apiClient.login(username, password);
    setToken(apiClient.getToken());
    setNeedsLogin(false);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    await apiClient.register(username, password);
  }, []);

  const logout = useCallback(async () => {
    await apiClient.logout();
    setToken(null);
    setNeedsLogin(false);
  }, []);

  const clearNeedsLogin = useCallback(() => {
    setNeedsLogin(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: token !== null,
        needsLogin,
        login,
        register,
        logout,
        clearNeedsLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
