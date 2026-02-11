import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  VAULT_OTP_TOKEN: 'vaultOtpToken',
  VAULT_OTP_EXPIRES_AT: 'vaultOtpExpiresAt',
  CLIENT_ID: 'clientId',
  COLLECTO_ID: 'collectoId',
  USER_NAME: 'userName',
};

export const StorageService = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },

  async getAllKeys(): Promise<string[]> {
    try {
      return [...(await AsyncStorage.getAllKeys())];
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },
};

export default StorageService;
