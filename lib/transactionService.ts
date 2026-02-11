import api from './api';

export const transactionService = {
  async buyPoints(customerId: string, data: any) {
    return api.post(`/transactions/${customerId}/buy-points`, data);
  },

  async redeemPoints(customerId: string, data: any) {
    return api.post(`/transactions/${customerId}/redeem`, data);
  },

  async getTransactions(customerId: string, limit: number = 50, offset: number = 0) {
    return api.post(`/transactions`, { customerId, limit, offset });
  },
};

export const invoiceService = {
  async createInvoice(payload: any) {
    return api.post('/invoice', payload);
  },

  async getInvoices(payload: {
    vaultOTPToken?: string;
    clientId?: string;
    collectoId?: string;
    invoiceId?: string | null;
  }) {
    return api.post('/invoiceDetails', payload);
  },

  async payInvoice(payload: {
    invoiceId?: string;
    reference?: string;
    paymentOption: string;
    phone?: string;
    vaultOTPToken?: string;
    collectoId?: string;
    clientId?: string;
    staffId?: string;
    points?: {
      points_used?: number;
      discount_amount?: number;
    };
  }) {
    return api.post('/requestToPay', payload);
  },
};

export default transactionService;
