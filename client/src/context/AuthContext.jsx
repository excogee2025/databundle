import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi, notifications as notifApi } from '../lib/api';
import { isAdmin, isAgent } from '../utils/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setUser(data);
      return data;
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      return null;
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const { data } = await notifApi.unreadCount();
      setUnreadCount(data.count);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
      refreshUnread();
    } else {
      setLoading(false);
    }
  }, [refreshUser, refreshUnread]);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('token', data.token);
    setUser({ ...data.user, permissions: [] });
    const full = await refreshUser();
    refreshUnread();
    return full;
  };

  const register = async (form) => {
    const { data } = await authApi.register(form);
    localStorage.setItem('token', data.token);
    const full = await refreshUser();
    refreshUnread();
    return full;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // proceed with local logout even if API fails
    }
    localStorage.removeItem('token');
    setUser(null);
    setUnreadCount(0);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      refreshUnread,
      unreadCount,
      isAdmin: isAdmin(user),
      isAgent: isAgent(user),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
