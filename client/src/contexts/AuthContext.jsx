import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken } from '../lib/api';
import { useAuthStore } from '../store/authStore';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Sync with Zustand store
  const zustandUser = useAuthStore((state) => state.user);
  const zustandToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    // Check both localStorage 'user' and Zustand store
    const storedUser = localStorage.getItem('user');
    const authStore = localStorage.getItem('glasschat-auth');
    
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (parsed?.token) {
          setAuthToken(parsed.token);
        }
      } catch (e) {
        localStorage.removeItem('user');
      }
    } else if (authStore) {
      // Sync with Zustand store if it exists
      try {
        const parsed = JSON.parse(authStore);
        if (parsed?.state?.user) {
          const zustandUser = parsed.state.user;
          const userData = {
            ...zustandUser,
            token: parsed.state.accessToken || zustandUser.token
          };
          setUser(userData);
          if (userData.token) {
            setAuthToken(userData.token);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    setLoading(false);
  }, []);

  // Sync with Zustand store changes
  useEffect(() => {
    if (zustandUser && zustandToken) {
      const userData = {
        ...zustandUser,
        token: zustandToken
      };
      setUser(userData);
      setAuthToken(zustandToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } else if (!zustandUser) {
      setUser(null);
      setAuthToken(null);
      localStorage.removeItem('user');
    }
  }, [zustandUser, zustandToken]);

  const login = (userData) => {
    if (userData?.token) {
      setAuthToken(userData.token);
    } else if (userData?.accessToken) {
      setAuthToken(userData.accessToken);
    } else {
      setAuthToken(null);
    }
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('user');
    // Also clear Zustand store
    useAuthStore.getState().clearAuth();
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};


