import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { authService } from '../api/authService';
import { hasVaultOtpToken } from '@/src/api/index';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: { clientId: string; collectoId: string | null; userName?: string | null } | null;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const tokenCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Boot up: check if user is already logged in
  useEffect(() => {
    bootstrapAsync();
  }, []);

  // Periodically check token validity and force logout when expired
  useEffect(() => {
    if (!user) {
      // Not logged in, no need to check
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
      return;
    }

    // Check token every 30 seconds
    if (!tokenCheckIntervalRef.current) {
      tokenCheckIntervalRef.current = setInterval(async () => {
        const hasValid = await hasVaultOtpToken();
        if (!hasValid && user) {
          // Token expired, force logout
          console.warn('[AuthContext] Token expired, logging out user');
          await logout();
        }
      }, 40000);
    }

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
    };
  }, [user]);

  const bootstrapAsync = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Failed to restore user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string) => {
    setIsLoading(true);
    try {
      const result = await authService.loginByUsername({
        username,
        type: 'client',
      });
      // After login, refresh user data
      await refreshUser();
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };



  const logout = async () => {
    setIsLoading(true);
    try {
      // Clean up token check interval
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
      await authService.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const value: AuthContextType = {
    isLoggedIn: user !== null,
    isLoading,
    user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
