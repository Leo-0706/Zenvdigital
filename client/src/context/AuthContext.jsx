import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('zenv_jwt') || null);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Check initial authentication and maintenance mode status
  useEffect(() => {
    const initAuth = async () => {
      // 1. Check system maintenance status
      try {
        const mRes = await fetch('/api/system/maintenance/status');
        if (mRes.ok) {
          const mData = await mRes.json();
          setMaintenanceMode(mData.maintenanceMode);
        }
      } catch (e) {
        console.warn('Could not query maintenance mode:', e.message);
      }

      // 2. If token exists, load session profile
      const storedToken = localStorage.getItem('zenv_jwt');
      if (storedToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setToken(storedToken);
          } else {
            // Token expired or invalid
            localStorage.removeItem('zenv_jwt');
            setUser(null);
            setToken(null);
          }
        } catch (err) {
          console.error('Session verification error:', err.message);
          localStorage.removeItem('zenv_jwt');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data);
        return { success: false, data };
      }

      localStorage.setItem('zenv_jwt', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const errPayload = { message: 'Connection failed. Ensure API server is active.' };
      setAuthError(errPayload);
      return { success: false, data: errPayload };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('zenv_jwt');
    setUser(null);
    setToken(null);
  };

  const toggleMaintenance = async (enabled) => {
    if (!token) return false;
    try {
      const res = await fetch('/api/system/maintenance/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceMode(data.maintenanceMode);
        return data.maintenanceMode;
      }
    } catch (e) {
      console.error('Failed to toggle maintenance mode:', e);
    }
    return maintenanceMode;
  };

  const setSession = (newToken, newUser) => {
    localStorage.setItem('zenv_jwt', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const value = {
    user,
    token,
    loading,
    authError,
    maintenanceMode,
    isAdmin: user?.role === 'ADMIN',
    isClient: user?.role === 'CLIENT',
    login,
    logout,
    setSession,
    toggleMaintenance,
    setMaintenanceMode
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
