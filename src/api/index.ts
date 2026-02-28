import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.collectovault.local';

console.log('API_BASE URL:', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

export async function setVaultOtpToken(token: string, expiresAt?: string) {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('setVaultOtpToken: token must be a non-empty string');
  }
  await AsyncStorage.setItem('vaultOtpToken', token);
  if (expiresAt) {
    const t = Date.parse(expiresAt);
    if (!Number.isFinite(t)) {
      throw new Error('setVaultOtpToken: expiresAt must be a valid date string');
    }
    await AsyncStorage.setItem('vaultOtpExpiresAt', new Date(t).toISOString());
  } else {
    await AsyncStorage.removeItem('vaultOtpExpiresAt');
  }
}

export async function clearVaultOtpToken() {
  await AsyncStorage.removeItem('vaultOtpToken');
  await AsyncStorage.removeItem('vaultOtpExpiresAt');
}

export async function hasVaultOtpToken(): Promise<boolean> {
  const token = await AsyncStorage.getItem('vaultOtpToken');
  if (!token) return false;
  const expiry = await AsyncStorage.getItem('vaultOtpExpiresAt');
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
  const token = await AsyncStorage.getItem('vaultOtpToken');
  if (!token) throw new Error('Vault OTP token not found');
  const expiry = await AsyncStorage.getItem('vaultOtpExpiresAt');
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
      if ((await hasVaultOtpToken()) && config.headers) {
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
