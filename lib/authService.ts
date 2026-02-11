import api from './api';

export const authService = {
  async startCollectoAuth(payload: {
    type: 'business' | 'client';
    collectoId?: string;
    id?: string;
  }) {
    const resp = await api.post('/auth', payload);
    return resp.data;
  },

  async verifyCollectoOtp(payload: {
    id: string;
    type?: 'business' | 'client';
    vaultOTP: string;
    vaultOTPToken?: string;
  }) {
    const resp = await api.post('/authVerify', payload);
    return resp.data;
  },
};

export default authService;
