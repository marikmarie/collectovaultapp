import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '@/src/api';
import storage from '@/src/utils/storage';
import { useAuth } from '@/src/context/AuthContext';

interface InvoiceDetailModalProps {
  visible: boolean;
  invoice: any;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export default function InvoiceDetailModal({
  visible,
  invoice,
  onClose,
  onPaymentSuccess,
}: InvoiceDetailModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'payments'>('details');
  const [processing, setProcessing] = useState(false);

  const details = invoice?.details || {};
  const invoiceItems = details?.invoice_details || [];
  const payments = invoice?.payments || [];
  const totalPaid = invoice?.total_amount_paid ?? 0;
  const amountDue = invoice?.amount_less ?? 0;
  const totalAmount = details?.invoice_amount ?? 0;

  const isPaid = Number(amountDue) === 0;

  const handlePaymentFlow = async () => {
    Alert.alert(
      'Payment',
      'Implement payment flow here. This would open a payment modal similar to buy-points.',
      [{ text: 'OK' }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{details?.id || 'Invoice'}</Text>
              <Text style={styles.headerSubtitle}>{details?.invoice_date}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Status Bar */}
          <View
            style={[
              styles.statusBar,
              isPaid ? styles.statusBarPaid : styles.statusBarPending,
            ]}
          >
            <Feather
              name={isPaid ? 'check-circle' : 'alert-circle'}
              size={20}
              color={isPaid ? '#4caf50' : '#ff9800'}
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[styles.statusValue, isPaid ? styles.statusValuePaid : {}]}>
                {isPaid ? 'Paid' : 'Pending Payment'}
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'details' && styles.tabActive]}
              onPress={() => setActiveTab('details')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'details' && styles.tabTextActive,
                ]}
              >
                Details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
              onPress={() => setActiveTab('payments')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'payments' && styles.tabTextActive,
                ]}
              >
                Payments
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={styles.tabContent}>
            {activeTab === 'details' ? (
              <>
                {/* Invoice Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Invoice Information</Text>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Client</Text>
                    <Text style={styles.infoValue}>{details?.client_name || 'N/A'}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Issued By</Text>
                    <Text style={styles.infoValue}>{details?.invoice_by_name || 'N/A'}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Date</Text>
                    <Text style={styles.infoValue}>{details?.invoice_date || 'N/A'}</Text>
                  </View>
                </View>

                {/* Items */}
                {invoiceItems.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Services</Text>
                    {invoiceItems.map((item: any, i: number) => (
                      <View key={i} style={styles.itemRow}>
                        <View>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemQty}>Qty: {item.quantity || 1}</Text>
                        </View>
                        <Text style={styles.itemPrice}>
                          UGX {Number(item.amount).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Summary */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Summary</Text>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total</Text>
                    <Text style={styles.summaryValue}>
                      UGX {Number(totalAmount).toLocaleString()}
                    </Text>
                  </View>

                  <View style={[styles.summaryRow, styles.paidRow]}>
                    <Text style={styles.summaryLabel}>Paid</Text>
                    <Text style={styles.paidValue}>
                      UGX {Number(totalPaid).toLocaleString()}
                    </Text>
                  </View>

                  {amountDue > 0 && (
                    <View style={[styles.summaryRow, styles.dueRow]}>
                      <Text style={styles.summaryLabel}>Balance Due</Text>
                      <Text style={styles.dueValue}>
                        UGX {Number(amountDue).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <>
                {/* Payments List */}
                {payments.length > 0 ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment History</Text>
                    {payments.map((pay: any, i: number) => (
                      <View key={i} style={styles.paymentRow}>
                        <View style={styles.paymentInfo}>
                          <Text style={styles.paymentTxId}>{pay.transaction_id}</Text>
                          <Text style={styles.paymentDate}>{pay.paid_date}</Text>
                          <Text style={styles.paymentPhone}>{pay.phone}</Text>
                          <Text style={styles.paymentUser}>By: {pay.user_name}</Text>
                        </View>
                        <Text style={styles.paymentAmount}>
                          UGX {Number(pay.amount).toLocaleString()}
                        </Text>
                      </View>
                    ))}

                    <View style={styles.totalPaidBox}>
                      <Text style={styles.totalPaidLabel}>Total Paid</Text>
                      <Text style={styles.totalPaidValue}>
                        UGX {Number(totalPaid).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Feather name="inbox" size={40} color="#ddd" />
                    <Text style={styles.emptyStateText}>No payments recorded yet</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              disabled={processing}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>

            {!isPaid && amountDue > 0 && (
              <TouchableOpacity
                style={[styles.payBtn, processing && styles.payBtnDisabled]}
                onPress={handlePaymentFlow}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.payBtnText}>
                    Pay UGX {Number(amountDue).toLocaleString()}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
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
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    gap: 12,
  },
  statusBarPaid: {
    backgroundColor: '#e8f5e9',
  },
  statusBarPending: {
    backgroundColor: '#fff3e0',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff9800',
  },
  statusValuePaid: {
    color: '#4caf50',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#d81b60',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#d81b60',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  itemQty: {
    fontSize: 11,
    color: '#999',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d81b60',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  paidRow: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderColor: 'transparent',
  },
  paidValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4caf50',
  },
  dueRow: {
    backgroundColor: '#fff5f5',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
    borderColor: 'transparent',
  },
  dueValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f44336',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTxId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  paymentPhone: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  paymentUser: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  paymentAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4caf50',
  },
  totalPaidBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  totalPaidLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  totalPaidValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  payBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnDisabled: {
    opacity: 0.5,
  },
  payBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
