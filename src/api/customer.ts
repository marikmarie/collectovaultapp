import api from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const customerService = {
  // Get all customers for a collecto
  getAllCustomers: (collectoId: string) =>
    api.get('/users/all', {
      params: {
        collectoId,
      },
    }),

  // Get customer data including points balance and tier
  getCustomerData: (clientId: string) => api.get(`/customers/info/${clientId}`),

  // Get customer's current points balance and tier info
  getPointsAndTier: async (vendorId?: string) => {
    const id = vendorId || (await AsyncStorage.getItem('collectoId'));
    return api.get(`/pointRules/collecto/${id || null}`);
  },

  // Get tier rules/benefits
  getTierInfo: async (vendorId?: string) => {
    const id = vendorId || (await AsyncStorage.getItem('collectoId'));
    return api.get(`/tier/collecto/${id || null}`);
  },

  getRedeemableOffers: (customerId?: string) =>
    api.post(`/customers/${customerId ?? 'me'}/offers/redeemable`),

  getTierBenefits: (customerId?: string, tier?: string) =>
    api.post(
      `/customers/${customerId}/tier-benefits${tier ? `?tier=${encodeURIComponent(tier)}` : ''}`
    ),

  getServices: (vaultOTPToken?: string, collectoId?: string, page?: number, limit?: number) =>
    api.post('/services', { vaultOTPToken, collectoId, page, limit }),

  createCustomer: (payload: { collecto_id: string; client_id: string; name?: string }) =>
    api.post('/customers', payload),
};
