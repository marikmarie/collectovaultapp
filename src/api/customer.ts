import api from './index';
import storage from '@/src/utils/storage';

export const customerService = {
  // Get all customers for a collecto
  getAllCustomers: (collectoId: string) =>
    api.get('/users/all', {
      params: {
        collectoId,
      },
    }),

  // Get customer data including points balance and tier
  // Updated to use /loyaltySettings endpoint with collectoId + clientId body
  getCustomerData: (collectoId: string, clientId: string) =>
    api.post(`/loyaltySettings`, {
      collectoId,
      clientId,
    }),
  getServices: (vaultOTPToken?: string, collectoId?: string, page?: number, limit?: number) =>
    api.post('/services', { vaultOTPToken, collectoId, page, limit }),

  
};
