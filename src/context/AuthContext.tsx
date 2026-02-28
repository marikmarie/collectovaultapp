import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../api/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: { clientId: string; collectoId: string | null; userName?: string | null } | null;
  login: (username: string) => Promise<void>;
  loginWithOtp: (id: string, otp: string, collectoId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthContextType['user']>(null);

  // Boot up: check if user is already logged in
  useEffect(() => {
    bootstrapAsync();
  }, []);

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

  const loginWithOtp = async (id: string, otp: string, collectoId?: string) => {
    setIsLoading(true);
    try {
      const result = await authService.verifyCollectoOtp({
        id,
        type: 'client',
        vaultOTP: otp,
        vaultOTPToken: undefined,
      });
      await refreshUser();
    } catch (err) {
      console.error('OTP verification failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
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
    loginWithOtp,
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
