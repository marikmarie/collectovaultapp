import api, { setVaultOtpToken } from './index';
import storage, { setItem, removeItem, getItem } from '@/src/utils/storage';

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
      await setItem('clientId', id);
      await setItem('collectoId', collectoId.toString());
      await setItem('userName', userName);
    }

    return data;
  },

  /**
   * Set username for a customer after first login
   */
  setUsername: async (clientId: string, collectoId: string, username: string, payload: {
  clientId: string;
  collectoId?: string;
  username: string;
  
}) => {
    try {
      const resp = await api.post('/setUsername', payload);

      console.debug('[AuthService] setUsername response:', resp.data);
      if (resp.data.success) {
        await setItem('userName', payload.username);
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
    console.log('[AuthService] Logout: removing all auth data');
    const results = await Promise.all([
      removeItem('clientId'),
      removeItem('collectoId'),
      removeItem('userName'),
      removeItem('vaultOtpToken'),
      removeItem('vaultOtpExpiresAt'),
    ]);
    console.log('[AuthService] Logout complete - all auth data removed');
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

 
  getCurrentUser: async () => {
  
    if (!storage || typeof (storage as any).getItem !== 'function') {
      return null;
    }

    try {
      const clientId = await getItem('clientId');
      
      // If no clientId, user is not logged in
      if (!clientId) return null;

      // CRITICAL: Validate that the vaultOtpToken is still valid locally
      const hasValidToken = await import('./index').then(m => m.hasVaultOtpToken());
      
      if (!hasValidToken) {
        // Token is missing or expired, clear all user data
        await authService.logout();
        return null;
      }

      // Additionally, validate with API by making a test call
      const collectoId = await getItem('collectoId');
      if (collectoId) {
        try {
          // Try to fetch customer data to validate token
          await api.post('/loyaltySettings', {
            collectoId,
            clientId,
          });
        } catch (apiErr: any) {
          console.warn('API validation failed, logging out:', apiErr?.message || apiErr);
          await authService.logout();
          return null;
        }
      }

      const userName = await getItem('userName');

      return { clientId, collectoId, userName };
    } catch (err: any) {
      // Only log if something unexpected happens, avoid repeated null-module noise
      console.debug('[AuthService] Error in getCurrentUser:', err.message);
      return null;
    }
  },
};
