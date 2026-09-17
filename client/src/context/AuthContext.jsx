import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/authApi';
import { getToken, setToken, clearToken } from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [loading, setLoading] = useState(true);

  // On mount: if a token exists, validate it and restore the session
  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authApi.fetchMe();
        if (active) setUser(data);
      } catch {
        clearToken();
        if (active) {
          setUser(null);
          setTokenState(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    restore();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async ({ username, password, remember = true }) => {
    const { data } = await authApi.login({ username, password });
    setToken(data.token, remember);
    setTokenState(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — logging out is best-effort on the server (stateless JWT)
    }
    clearToken();
    setUser(null);
    setTokenState(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
