import api from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const transactionService = {
  // Get customer transactions/history
  getTransactions: (clientId: string) =>
    api.get(`/customers/${clientId}/transactions`),

  // Redeem points for an offer
  redeemPoints: (customerId: string, payload: { offerId: string }) =>
    api.post(`/customers/${customerId}/redeem`, payload),

  // Get redeemable offers
  getRedeemableOffers: (clientId?: string) =>
    api.get(`/customers/${clientId || 'me'}/offers`),
};

export const invoiceService = {
  // Get customer invoices
  getInvoices: (clientId: string, page?: number) =>
    api.get(`/customers/${clientId}/invoices`, { params: { page } }),

  // Get invoice details
  getInvoiceDetails: (invoiceId: string) =>
    api.get(`/invoices/${invoiceId}`),

  // Pay an invoice
  payInvoice: (invoiceId: string, payload: any) =>
    api.post(`/invoices/${invoiceId}/pay`, payload),
};
