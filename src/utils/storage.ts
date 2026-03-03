import { Platform } from 'react-native';

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};

let AsyncStorage: any = null;
let SecureStore: any = null;

try {
  // require so bundlers don't fail at build time when native module is missing
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage');
} catch (e) {
  AsyncStorage = null;
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
} catch (e) {
  SecureStore = null;
}

const inMemory = new Map<string, string>();

const isAsyncAvailable = () => AsyncStorage && typeof AsyncStorage.getItem === 'function';
const isSecureAvailable = () => SecureStore && typeof SecureStore.getItemAsync === 'function';

const storage: StorageLike = {
  async getItem(key: string) {
    if (isSecureAvailable()) {
      try {
        const v = await SecureStore.getItemAsync(key);
        if (v !== null && v !== undefined) return v;
      } catch (e) {
        // ignore and fall through
      }
    }

    if (isAsyncAvailable()) {
      try {
        return await AsyncStorage.getItem(key);
      } catch (e) {
        // ignore
      }
    }

    return inMemory.has(key) ? (inMemory.get(key) as string) : null;
  },

  async setItem(key: string, value: string) {
    if (isSecureAvailable()) {
      try {
        await SecureStore.setItemAsync(key, value);
        return;
      } catch (e) {
        // ignore and fall through
      }
    }

    if (isAsyncAvailable()) {
      try {
        await AsyncStorage.setItem(key, value);
        return;
      } catch (e) {
        // ignore
      }
    }

    inMemory.set(key, value);
  },

  async removeItem(key: string) {
    if (isSecureAvailable()) {
      try {
        await SecureStore.deleteItemAsync(key);
        return;
      } catch (e) {
        // ignore and fall through
      }
    }

    if (isAsyncAvailable()) {
      try {
        await AsyncStorage.removeItem(key);
        return;
      } catch (e) {
        // ignore
      }
    }

    inMemory.delete(key);
  },

  async clear() {
    if (isAsyncAvailable()) {
      try {
        await AsyncStorage.clear();
      } catch (e) {
        // ignore
      }
    }
    inMemory.clear();
    // SecureStore has no global clear; keys stored there will remain.
  },
};

export default storage;

// Named helpers to provide guaranteed function exports for TypeScript callers
export const getItem = (key: string) => storage.getItem(key);
export const setItem = (key: string, value: string) => storage.setItem(key, value);
export const removeItem = (key: string) => storage.removeItem(key);
export const clearStorage = () => storage.clear();
