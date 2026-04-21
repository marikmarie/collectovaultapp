import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '@/src/api';
import { customerService } from '@/src/api/customer';
import storage from '@/src/utils/storage';

interface TransactionDetailModalProps {
  visible: boolean;
  transaction: any | null;
  onClose: () => void;
  clientAddCashProp?: any;
}

export default function TransactionDetailModal({
  visible,
  transaction,
  onClose,
  clientAddCashProp,
}: TransactionDetailModalProps) {
  const [querying, setQuerying] = useState(false);
  const [clientAddCash, setClientAddCash] = useState<any>(clientAddCashProp || null);

  useEffect(() => {
    if (clientAddCashProp) {
      setClientAddCash(clientAddCashProp);
    } else if (visible) {
      fetchClientAddCash();
    }
  }, [visible, clientAddCashProp]);

  const fetchClientAddCash = async () => {
    try {
      const collectoId = await storage.getItem('collectoId') || '';
      const clientId = await storage.getItem('clientId') || '';
      
      if (!collectoId || !clientId) {
        setClientAddCash(null);
        return;
      }

      const customerRes = await customerService.getCustomerData(collectoId, clientId);
      const loyaltySettings = customerRes.data?.data?.loyaltySettings ?? {};
      setClientAddCash(loyaltySettings?.client_add_cash || null);
    } catch (err) {
      console.error('Failed to fetch clientAddCash:', err);
      setClientAddCash(null);
    }
  };

  if (!transaction) return null;

  const isConfirmed = ['success', 'SUCCESSFUL'].includes(
    (transaction.status || '').toUpperCase()
  );

  const isPending = ['pending', 'PENDING'].includes(
    (transaction.status || '').toUpperCase()
  );

  const amount = Number(String(transaction.amount || 0).replace(/,/g, ''));

  const getStatusColor = () => {
    if (isConfirmed) return '#4caf50';
    if (isPending) return '#ff9800';
    return '#f44336';
  };

  const getStatusBgColor = () => {
    if (isConfirmed) return '#e8f5e9';
    if (isPending) return '#fff3e0';
    return '#ffebee';
  };

  const displayDate = transaction.cash_date
    ? transaction.cash_date
    : new Date(transaction.updated_on || transaction.createdAt || new Date()).toLocaleDateString(
        'en-US',
        { year: 'numeric', month: 'short', day: 'numeric' }
      );

  const handleQueryStatus = async () => {
    if (!transaction.reference) {
      Alert.alert('Error', 'No transaction reference available');
      return;
    }

    setQuerying(true);
    try {
      const requestBody: any = {
        transactionId: transaction.reference,
      };

      // If transaction cash_type is ADDED, include clientAddCash from loyalty settings
      if (transaction.cash_type === 'ADDED' && clientAddCash) {
        requestBody.clientAddCash = clientAddCash;
      }

      const res = await api.post('/queryTransactionStatus', requestBody);

      if (res.data?.status === '200') {
        Alert.alert('Status', res.data?.message || 'Status queried successfully');
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to query transaction status');
      }
    } catch (err: any) {
      console.error('Query error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to query transaction status');
    } finally {
      setQuerying(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{transaction.reference || 'Transaction'}</Text>
            <TouchableOpacity onPress={onClose} disabled={querying}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            {/* Amount */}
            <View style={styles.row}>
              <Text style={styles.label}>Amount</Text>
              <Text style={styles.amountValue}>UGX {amount.toLocaleString()}</Text>
            </View>

            {/* Status */}
            <View style={[styles.row, styles.borderBottom]}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor() },
                  ]}
                />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {transaction.status || 'PENDING'}
                </Text>
              </View>
            </View>

            {/* Type */}
            <View style={[styles.row, styles.borderBottom]}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.value}>{transaction.cash_type || 'N/A'}</Text>
            </View>

            {/* Date */}
            <View style={[styles.row, styles.borderBottom]}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{displayDate}</Text>
            </View>

            {/* User Type */}
            <View style={[styles.row, styles.borderBottom]}>
              <Text style={styles.label}>User Type</Text>
              <Text style={styles.value}>{transaction.user_type || 'CLIENT'}</Text>
            </View>

            {/* Shared By */}
            {transaction.shared_by_name && (
              <View style={styles.row}>
                <Text style={styles.label}>Shared By</Text>
                <Text style={styles.value}>{transaction.shared_by_name}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.queryButton]}
              onPress={handleQueryStatus}
              disabled={querying}
            >
              {querying ? (
                <ActivityIndicator size="small" color="#d81b60" />
              ) : (
                <>
                  <Feather name="check-circle" size={16} color="#d81b60" />
                  <Text style={styles.queryButtonText}>Query</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
              disabled={querying}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  value: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d81b60',
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  queryButton: {
    backgroundColor: '#f3f3f3',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  queryButtonText: {
    color: '#d81b60',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#d81b60',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
