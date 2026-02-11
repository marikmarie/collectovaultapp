import axios from 'axios';
import Constants from 'expo-constants';
import { StorageService, StorageKeys } from './storage';

const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const API_TIMEOUT = 15000;

console.log('🌐 API_BASE URL:', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  timeout: API_TIMEOUT,
});

// Token management functions
export async function setVaultOtpToken(token: string, expiresAt?: string): Promise<void> {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('setVaultOtpToken: token must be a non-empty string');
  }

  await StorageService.setItem(StorageKeys.VAULT_OTP_TOKEN, token);

  if (expiresAt) {
    const t = Date.parse(expiresAt);
    if (!Number.isFinite(t)) {
      throw new Error('setVaultOtpToken: expiresAt must be a valid date string');
    }
    await StorageService.setItem(StorageKeys.VAULT_OTP_EXPIRES_AT, new Date(t).toISOString());
  } else {
    await StorageService.removeItem(StorageKeys.VAULT_OTP_EXPIRES_AT);
  }
}

export async function clearVaultOtpToken(): Promise<void> {
  await StorageService.removeItem(StorageKeys.VAULT_OTP_TOKEN);
  await StorageService.removeItem(StorageKeys.VAULT_OTP_EXPIRES_AT);
}

export async function hasVaultOtpToken(): Promise<boolean> {
  const token = await StorageService.getItem(StorageKeys.VAULT_OTP_TOKEN);
  if (!token) return false;

  const expiry = await StorageService.getItem(StorageKeys.VAULT_OTP_EXPIRES_AT);
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
  const token = await StorageService.getItem(StorageKeys.VAULT_OTP_TOKEN);
  if (!token) throw new Error('Vault OTP token not found');

  const expiry = await StorageService.getItem(StorageKeys.VAULT_OTP_EXPIRES_AT);
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

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      if (await hasVaultOtpToken()) {
        const vaultOtp = await getVaultOtpToken();
        config.headers.Authorization = `Bearer ${vaultOtp}`;
      }
    } catch (err) {
      console.warn('vault token not attached to request:', err);
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const responseData = err.response?.data ?? { message: err.message };

    if (err.response?.status === 401 || err.response?.status === 403) {
      await clearVaultOtpToken();
    }

    console.error('❌ API error:', responseData);
    throw responseData;
  }
);

export default api;
