import api from './api';

export const customerService = {
  async getCustomerData(clientId: string) {
    return api.get(`/customers/info/${clientId}`);
  },

  async getPointsAndTier(vendorId?: string) {
    return api.get(`/pointRules/collecto/${vendorId || ''}`);
  },

  async getTierInfo(vendorId?: string) {
    return api.get(`/tier/collecto/${vendorId || ''}`);
  },

  async getRedeemableOffers(customerId?: string) {
    return api.post(`/customers/${customerId ?? 'me'}/offers/redeemable`);
  },

  async getTierBenefits(customerId?: string, tier?: string) {
    return api.post(
      `/customers/${customerId}/tier-benefits${tier ? `?tier=${encodeURIComponent(tier)}` : ''}`
    );
  },

  async getServices(vaultOTPToken?: string, collectoId?: string, page?: number, limit?: number) {
    return api.post('/services', { vaultOTPToken, collectoId, page, limit });
  },

  async createCustomer(payload: { collecto_id: string; client_id: string; name?: string }) {
    return api.post('/customers', payload);
  },
};

export default customerService;
