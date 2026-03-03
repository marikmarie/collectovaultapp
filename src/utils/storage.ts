import { Platform } from 'react-native';

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};

let SecureStore: any = null;

// Lazy-load SecureStore (it's safe to require here because expo packages are JS-only)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
} catch (e) {
  SecureStore = null;
}
console.log('Platform:', Platform.OS);
console.log('SecureStore:', SecureStore);
const inMemory = new Map<string, string>();

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

    inMemory.delete(key);
  },

  async clear() {
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
