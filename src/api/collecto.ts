import api from './index';
import storage from '@/src/utils/storage';



export const invoiceService = {
  // Get customer invoices - matches web app pattern using /invoiceDetails POST endpoint
  createInvoice: (payload: any) => api.post("/invoice", payload),
  

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
