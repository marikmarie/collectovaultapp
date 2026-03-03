import axios from 'axios';
import { Platform } from 'react-native';
import storage from '@/src/utils/storage';

// determine base url - on android emulator localhost must be 10.0.2.2
let API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || '';

// Handle localhost mapping for Android emulators
if (Platform.OS === 'android') {
  if (!API_BASE || API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1')) {
    API_BASE = API_BASE.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2') || 'http://10.0.2.2:8080';
  }
} else if (!API_BASE) {
  API_BASE = 'http://localhost:8080';
}

console.log('API_BASE URL:', API_BASE);
console.log('storage available:', !!(storage && typeof (storage as any).getItem === 'function'));

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

export async function setVaultOtpToken(token: string, expiresAt?: string) {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('setVaultOtpToken: token must be a non-empty string');
  }
  await storage.setItem('vaultOtpToken', token);
  if (expiresAt) {
    const t = Date.parse(expiresAt);
    if (!Number.isFinite(t)) {
      throw new Error('setVaultOtpToken: expiresAt must be a valid date string');
    }
    await storage.setItem('vaultOtpExpiresAt', new Date(t).toISOString());
  } else {
    await storage.removeItem('vaultOtpExpiresAt');
  }
}

export async function clearVaultOtpToken() {
  await storage.removeItem('vaultOtpToken');
  await storage.removeItem('vaultOtpExpiresAt');
}

export async function hasVaultOtpToken(): Promise<boolean> {
  if (!storage || typeof (storage as any).getItem !== 'function') {
    // storage unavailable
    return false;
  }
  const token = await storage.getItem('vaultOtpToken');
  if (!token) return false;
  const expiry = await storage.getItem('vaultOtpExpiresAt');
  if (!expiry) return true;
  const exp = Date.parse(expiry);
  if (!Number.isFinite(exp)) {
    await clearVaultOtpToken();
    return false;
  }
  if (Date.now() > exp) {
    await clearVaultOtpToken();
    return false;
  }
  return true;
}

export async function getVaultOtpToken(): Promise<string> {
  const token = await storage.getItem('vaultOtpToken');
  if (!token) throw new Error('Vault OTP token not found');
  const expiry = await storage.getItem('vaultOtpExpiresAt');
  if (expiry) {
    const exp = Date.parse(expiry);
    if (!Number.isFinite(exp)) {
      await clearVaultOtpToken();
      throw new Error('Vault OTP token expired (invalid expiry)');
    }
    if (Date.now() > exp) {
      await clearVaultOtpToken();
      throw new Error('Vault OTP token expired');
    }
  }
  return token;
}

api.interceptors.request.use(
  async (config) => {
    try {
      // guard in case AsyncStorage native module is missing
      if (storage && typeof (storage as any).getItem === 'function') {
        if ((await hasVaultOtpToken()) && config.headers) {
          const vaultOtp = await getVaultOtpToken();
          config.headers.Authorization = `Bearer ${vaultOtp}`;
        }
      }
    } catch (err) {
      console.warn('vault token not attached to request:', err);
    }
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const responseData = err.response?.data ?? { message: err.message };

    if (err.response?.status === 401 || err.response?.status === 403) {
      await clearVaultOtpToken();
    }

    console.error('API error:', responseData);
    throw responseData;
  }
);

export default api;
