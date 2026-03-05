import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '@/src/api';
import storage from '@/src/utils/storage';

interface InvoiceItem {
  id: string;
  name: string;
  amount: number;
  quantity?: number;
}

interface InvoicePayment {
  amount: number;
  date: string;
  method: string;
}

interface Invoice {
  details?: {
    id: string;
    invoice_date: string;
    client_name: string;
    invoice_details?: InvoiceItem[];
  };
  payments?: InvoicePayment[];
  amount_less?: number;
  total_amount_paid?: number;
}

interface InvoiceDetailModalProps {
  visible: boolean;
  invoice: Invoice | null;
  onClose: () => void;
}

export default function InvoiceDetailModal({
  visible,
  invoice,
  onClose,
}: InvoiceDetailModalProps) {
  const [tab, setTab] = useState<'details' | 'payment'>('details');
  const [processing, setProcessing] = useState(false);

  if (!invoice) return null;

  const details = invoice.details || {};
  const invoiceItems = details.invoice_details || [];
  const payments = invoice.payments || [];
  const amountLess = invoice.amount_less ?? 0;
  const totalPaid = invoice.total_amount_paid ?? 0;

  const handlePayInvoice = async () => {
    Alert.prompt(
      'Pay Invoice',
      `Enter phone number (10 digits):`,
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Pay',
          onPress: async (phone) => {
            if (!phone || phone.length < 10) {
              Alert.alert('Error', 'Please enter a valid phone number');
              return;
            }

            setProcessing(true);
            try {
              const vaultOTPToken = await storage.getItem('vaultOtpToken');
              const collectoId = await storage.getItem('collectoId');

              const res = await api.post('/requestToPay', {
                phone: phone.replace(/^0/, '256'),
                invoiceId: details.id,
                amount: (amountLess > 0 ? amountLess : details.invoice_details?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0),
                vaultOTPToken,
                collectoId,
                reference: `INV-${details.id}`,
              });

              if (res.data?.status === '200') {
                Alert.alert('Success', 'Payment initiated. Check your phone for the prompt.');
                onClose();
              } else {
                Alert.alert('Error', res.data?.message || 'Payment initiation failed');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to initiate payment');
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
      'plain-text',
      '',
      'phone-pad'
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.invoiceNumber}>{details.id || 'N/A'}</Text>
              <Text style={styles.subtitle}>Invoice Details</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, tab === 'details' && styles.tabActive]}
              onPress={() => setTab('details')}
            >
              <Text
                style={[styles.tabText, tab === 'details' && styles.tabTextActive]}
              >
                Details
              </Text>
              {tab === 'details' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'payment' && styles.tabActive]}
              onPress={() => setTab('payment')}
            >
              <Text
                style={[styles.tabText, tab === 'payment' && styles.tabTextActive]}
              >
                Payments ({payments.length})
              </Text>
              {tab === 'payment' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {tab === 'details' ? (
              <>
                {/* Basic Info */}
                <View style={styles.section}>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Date</Text>
                    <Text style={styles.value}>{details.invoice_date || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Client</Text>
                    <Text style={styles.value}>{details.client_name || 'N/A'}</Text>
                  </View>
                </View>

                {/* Services/Items */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Services</Text>
                  {invoiceItems.length > 0 ? (
                    invoiceItems.map((item: any, index: number) => (
                      <View key={index} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          {item.quantity && (
                            <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                          )}
                        </View>
                        <Text style={styles.itemAmount}>
                          UGX {Number(item.amount).toLocaleString()}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No items</Text>
                  )}
                </View>

                {/* Summary */}
                <View style={styles.summarySection}>
                  {invoiceItems.length > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryValue}>
                        UGX{' '}
                        {invoiceItems
                          .reduce((sum: number, item: any) => sum + item.amount, 0)
                          .toLocaleString()}
                      </Text>
                    </View>
                  )}
                  {amountLess > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Outstanding Amount</Text>
                      <Text style={styles.summaryValueWarning}>
                        UGX {amountLess.toLocaleString()}
                      </Text>
                    </View>
                  )}
                  {totalPaid > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Total Paid</Text>
                      <Text style={styles.summaryValueSuccess}>
                        UGX {totalPaid.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              /* Payments Tab */
              <View style={styles.section}>
                {payments.length > 0 ? (
                  payments.map((payment: any, index: number) => (
                    <View key={index} style={styles.paymentCard}>
                      <View style={styles.paymentHeader}>
                        <Text style={styles.paymentDate}>
                          {new Date(payment.date).toLocaleDateString()}
                        </Text>
                        <Text style={styles.paymentAmount}>
                          UGX {Number(payment.amount).toLocaleString()}
                        </Text>
                      </View>
                      {payment.method && (
                        <Text style={styles.paymentMethod}>{payment.method}</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No payments recorded</Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Button */}
          {amountLess > 0 && (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.payButton}
                onPress={handlePayInvoice}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather
                      name="credit-card"
                      size={16}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.payButtonText}>
                      Pay UGX {amountLess.toLocaleString()}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#d81b60',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#d81b60',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  itemQty: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  itemAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d81b60',
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  summarySection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  summaryValueWarning: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ff9800',
  },
  summaryValueSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4caf50',
  },
  paymentCard: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  paymentAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4caf50',
  },
  paymentMethod: {
    fontSize: 10,
    color: '#999',
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  payButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
