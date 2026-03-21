import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { apiClient, AUTH_UNAUTHORIZED_EVENT } from "../lib/api-client";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  needsLogin: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
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

  const login = useCallback(async (password: string) => {
    await apiClient.login(password);
    setToken(apiClient.getToken());
    setNeedsLogin(false);
  }, []);

  const logout = useCallback(() => {
    apiClient.logout();
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
