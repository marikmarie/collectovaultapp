import { Platform } from "react-native";

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
  SecureStore = require("expo-secure-store");
} catch (e) {
  SecureStore = null;
}

// Check if we're on web and can use localStorage
const isWebBrowser = () => {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined"
    );
  } catch {
    return false;
  }
};

const getIsWeb = () => {
  const web = isWebBrowser();
  console.log("[Storage] Platform.OS:", Platform.OS, "| isWebBrowser:", web);
  return web;
};

console.log("[Storage] Initializing - Platform.OS:", Platform.OS);
console.log("[Storage] isWebBrowser:", isWebBrowser());
console.log("[Storage] SecureStore available:", !!SecureStore);

const inMemory = new Map<string, string>();

const isSecureAvailable = () =>
  SecureStore && typeof SecureStore.getItemAsync === "function";

const storage: StorageLike = {
  async getItem(key: string) {
    // On web, use localStorage
    if (getIsWeb()) {
      try {
        const value = window.localStorage.getItem(key);
        console.log(
          `[Storage] Web localStorage.getItem(${key}):`,
          value ? "found" : "null",
        );
        return value;
      } catch (e) {
        console.warn("[Storage] Failed to read from localStorage:", e);
      }
    }

    // On native, try SecureStore first
    if (isSecureAvailable()) {
      try {
        const v = await SecureStore.getItemAsync(key);
        if (v !== null && v !== undefined) return v;
      } catch (e) {
        // ignore and fall through
      }
    }

    // Fallback to in-memory
    return inMemory.has(key) ? (inMemory.get(key) as string) : null;
  },

  async setItem(key: string, value: string) {
    // On web, use localStorage
    if (getIsWeb()) {
      try {
        window.localStorage.setItem(key, value);
        console.log(`[Storage] Web localStorage.setItem(${key})`);
        return;
      } catch (e) {
        console.warn("[Storage] Failed to write to localStorage:", e);
      }
    }

    // On native, use SecureStore
    if (isSecureAvailable()) {
      try {
        await SecureStore.setItemAsync(key, value);
        return;
      } catch (e) {
        // ignore and fall through
      }
    }

    // Fallback to in-memory
    inMemory.set(key, value);
  },

  async removeItem(key: string) {
    // On web, use localStorage
    if (getIsWeb()) {
      try {
        window.localStorage.removeItem(key);
        console.log(`[Storage] Web localStorage.removeItem(${key})`);
      } catch (e) {
        console.warn("[Storage] Failed to remove from localStorage:", e);
      }
    }

    // On native
    inMemory.delete(key);
    if (isSecureAvailable()) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (e) {
        console.warn("[Storage] Failed to delete from SecureStore:", key, e);
      }
    }
  },

  async clear() {
    console.log("[Storage] clear() called");

    // On web, clear localStorage
    if (getIsWeb()) {
      try {
        console.log(
          "[Storage] Clearing web localStorage - current keys:",
          Object.keys(window.localStorage),
        );
        window.localStorage.clear();
        console.log(
          "[Storage] Web localStorage cleared - keys after clear:",
          Object.keys(window.localStorage),
        );
      } catch (e) {
        console.warn("[Storage] Failed to clear localStorage:", e);
      }
    }

    // Clear in-memory
    inMemory.clear();

    // Clear all known auth keys from SecureStore (for native)
    const keysToDelete = [
      "vaultOtpToken",
      "vaultOtpExpiresAt",
      "clientId",
      "collectoId",
      "userName",
    ];

    if (isSecureAvailable()) {
      for (const key of keysToDelete) {
        try {
          await SecureStore.deleteItemAsync(key);
          console.log("[Storage] Deleted from SecureStore:", key);
        } catch (e) {
          console.warn("[Storage] Failed to delete from SecureStore:", key, e);
        }
      }
    }
  },
};

export default storage;

// Named helpers to provide guaranteed function exports for TypeScript callers
export const getItem = (key: string) => storage.getItem(key);
export const setItem = (key: string, value: string) =>
  storage.setItem(key, value);
export const removeItem = (key: string) => storage.removeItem(key);
export const clearStorage = () => storage.clear();
