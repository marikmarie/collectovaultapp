import api, { setVaultOtpToken } from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  startCollectoAuth: async (payload: {
    type: 'client';
    collectoId?: string;
    id?: string;
  }) => {
    const resp = await api.post('/auth', payload);
    return resp.data;
  },

  verifyCollectoOtp: async (payload: {
    id: string;
    type?: 'client';
    vaultOTP: string;
    vaultOTPToken?: string;
  }) => {
    const resp = await api.post('/authVerify', payload);
    const data = resp.data;
    const userData = data.data.data;

    if (data?.token) {
      // Set session expiry to 30 minutes from now
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await setVaultOtpToken(data.data.vaultOTPToken, expiresAt);
    }

    if (userData) {
      const { id, collectoId, userName } = userData;
      await AsyncStorage.setItem('clientId', id);
      await AsyncStorage.setItem('collectoId', collectoId.toString());
      await AsyncStorage.setItem('userName', userName);
    }

    return data;
  },

  /**
   * Set username for a customer after first login
   */
  setUsername: async (payload: {
    clientId: string;
    username: string;
    collectoId?: string;
  }) => {
    try {
      const resp = await api.post('/setUsername', payload);
      if (resp.data.success) {
        await AsyncStorage.setItem('userName', payload.username);
      }
      return resp.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to set username');
    }
  },

  /**
   * Get client ID by username
   */
  getClientIdByUsername: async (username: string) => {
    try {
      const resp = await api.post('/getByUsername', { username });
      if (resp.data.success) {
        return resp.data.data;
      }
      throw new Error('Username not found');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Username not found');
    }
  },

  /**
   * Login by username (recommended for customers)
   */
  loginByUsername: async (payload: {
    username: string;
    type: 'client';
  }) => {
    try {
      // Step 1: Get client ID by username
      const userInfo = await authService.getClientIdByUsername(payload.username);

      // Step 2: Start auth with the retrieved client ID
      const authPayload = {
        type: payload.type,
        id: userInfo.clientId,
        collectoId: userInfo.collectoId,
      };

      const resp = await authService.startCollectoAuth(authPayload);
      return resp;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Logout and clear all stored auth data
   */
  logout: async () => {
    await Promise.all([
      AsyncStorage.removeItem('clientId'),
      AsyncStorage.removeItem('collectoId'),
      AsyncStorage.removeItem('userName'),
      AsyncStorage.removeItem('vaultOtpToken'),
      AsyncStorage.removeItem('vaultOtpExpiresAt'),
    ]);
  },

  /**
   * Check if a username is available. resolves to { available, message }
   */
  checkUsernameAvailability: async (username: string) => {
    try {
      await authService.getClientIdByUsername(username);
      // if the call succeeds the username is already taken
      return { available: false, message: 'Username already taken' };
    } catch {
      return { available: true, message: 'Username is available' };
    }
  },

  /**
   * Get currently stored client data
   */
  getCurrentUser: async () => {
    // AsyncStorage may not be available in all environments (e.g. web),
    // in which case the native module will be null and calling methods
    // throws.  Early return to avoid noise.
    if (!AsyncStorage || typeof AsyncStorage.getItem !== 'function') {
      return null;
    }

    try {
      const clientId = await AsyncStorage.getItem('clientId');
      const collectoId = await AsyncStorage.getItem('collectoId');
      const userName = await AsyncStorage.getItem('userName');

      if (!clientId) return null;
      return { clientId, collectoId, userName };
    } catch (err: any) {
      // Only log if something unexpected happens, avoid repeated null-module noise
      console.debug('[AuthService] AsyncStorage unavailable:', err.message);
      return null;
    }
  },
};
