import api from './index';
import storage from '@/src/utils/storage';

export const transactionService = {
  // Get customer transactions/history - matches web app pattern
  getTransactions: (customerId: string, limit: number = 50, offset: number = 0) =>
    api.post('/transactions', { customerId, limit, offset }),

  // Redeem points for an offer
  redeemPoints: (customerId: string, payload: { offerId: string }) =>
    api.post(`/customers/${customerId}/redeem`, payload),

  // Get redeemable offers
  getRedeemableOffers: (clientId?: string) =>
    api.get(`/customers/${clientId || 'me'}/offers`),
};

export const invoiceService = {
  // Get customer invoices - matches web app pattern using /invoiceDetails POST endpoint
  getInvoices: (payload: {
    vaultOTPToken?: string;
    clientId?: string;
    collectoId?: string;
    invoiceId?: string | null;
  }) => api.post('/invoiceDetails', payload),

  // Get invoice details
  getInvoiceDetails: (invoiceId: string) =>
    api.get(`/invoices/${invoiceId}`),

  // Pay an invoice
  payInvoice: (payload: any) =>
    api.post('/requestToPay', payload),
};
