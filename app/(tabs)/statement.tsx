import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { invoiceService } from '@/src/api/collecto';
import { customerService } from '@/src/api/customer';
import storage from '@/src/utils/storage';
import InvoiceDetailModal from '@/components/InvoiceDetailModal';
import TransactionDetailModal from '@/components/TransactionDetailModal';
import api from '@/src/api';

interface TransactionItem {
  id: string;
  cash_type?: string;
  amount: number;
  status?: string;
  cash_date?: string;
  reference?: string;
  user_type?: string;
  updated_on?: string;
  createdAt?: string;
  paymentStatus?: string;
}

interface InvoiceItem {
  id?: string;
  details?: {
    id: string;
    invoice_date: string;
    invoice_amount: number;
  };
  amount_less: number;
  total_amount_paid?: number;
  payments?: any[];
  pointsEquivalent?: number;
}

export default function StatementScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'transactions'>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);

  // Payment modal state
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [pointsToUse, setPointsToUse] = useState<number>(0);
  const [mobileAmount, setMobileAmount] = useState<number | undefined>(undefined);
  const [payPhone, setPayPhone] = useState('');
  const [staffId, setStaffId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<null | {
    transactionId: string | null;
    message?: string;
    status?: string;
  }>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [lastQueriedStatus, setLastQueriedStatus] = useState<string | null>(null);

  // Customer data for points
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [tier, setTier] = useState<string | null>(null);
  const [tierProgress, setTierProgress] = useState<number>(0);
  const [ugxPerPoint, setUgxPerPoint] = useState<number>(1);
  const [clientAddCash, setClientAddCash] = useState<any>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user?.clientId) return;

    try {
      // Get transactions from loyaltySettings
      const collectoId = await storage.getItem('collectoId');
      
      const customerRes = await customerService.getCustomerData(collectoId || "", user.clientId);
      const loyaltySettings = customerRes.data?.data?.loyaltySettings ?? {};
      const cashDetails = loyaltySettings?.client_cash_details ?? {};
      const clientAddCashSettings = loyaltySettings?.client_add_cash;
      const cashTransactions = Array.isArray(cashDetails?.transactions) ? cashDetails.transactions : [];
      
      setClientAddCash(clientAddCashSettings || null);
      setTransactions(cashTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }, [user?.clientId]);

  const fetchInvoices = useCallback(async () => {
    if (!user?.clientId) return;

    try {
      const vaultOTPToken = await storage.getItem('vaultOtpToken');
      const collectoId = await storage.getItem('collectoId');
      
      const response = await invoiceService.getInvoices({
        vaultOTPToken: vaultOTPToken || undefined,
        clientId: user.clientId,
        collectoId: collectoId || undefined,
        invoiceId: null,
      });

      const innerData = response.data?.data?.data || response.data?.data;
      let invs: InvoiceItem[] = [];
      
      if (Array.isArray(innerData)) {
        invs = innerData;
      } else if (innerData && typeof innerData === 'object' && innerData.details) {
        invs = [innerData];
      } else {
        invs = [];
      }
      
      // Sort by date descending
      const sorted = invs.sort((a: InvoiceItem, b: InvoiceItem) => {
        const dateA = new Date(a.details?.invoice_date || 0).getTime();
        const dateB = new Date(b.details?.invoice_date || 0).getTime();
        return dateB - dateA;
      });

      setInvoices(sorted);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  }, [user?.clientId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchInvoices(), fetchTransactions(), fetchCustomerData()]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchInvoices, fetchTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchInvoices(), fetchTransactions(), fetchCustomerData()]).finally(() => setRefreshing(false));
  }, [fetchInvoices, fetchTransactions]);

  // Fetch customer data for points balance
  const fetchCustomerData = useCallback(async () => {
    if (!user?.clientId) return;

    try {
      const collectoId = await storage.getItem('collectoId');

      const customerRes = await customerService.getCustomerData(collectoId || "", user.clientId);
      const loyaltySettings = customerRes.data?.data?.loyaltySettings;

      const points =
        loyaltySettings?.points ??
        ((loyaltySettings?.loyalty_points?.earned ?? 0) +
          (loyaltySettings?.loyalty_points?.bought ?? 0));

      setPointsBalance(points || 0);
      setTier('N/A');
      setTierProgress(0);

      // Use loyalty settings point value if available. The API returns `point_value` as the total
      // value for all points (e.g. 8 points = 100 UGX), so derive per-point value.
      const pointValue =
        loyaltySettings?.point_value ?? loyaltySettings?.pointValue ?? null;

      if (typeof pointValue === 'number' && pointValue > 0 && points > 0) {
        setUgxPerPoint(pointValue / points);
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
    }
  }, [user?.clientId]);

  // Helper functions
  const pointsToUGX = (points: number) => Math.round(points * ugxPerPoint);
  const ugxToPoints = (ugx: number) => Math.ceil(ugx / ugxPerPoint);

  const computeMaxPointsForInvoice = (invoiceAmount: number, invoicePointsEquivalent: number) => {
    const maxFromAmount = Math.max(0, Math.floor((invoiceAmount - 1) / ugxPerPoint));
    return Math.min(pointsBalance, invoicePointsEquivalent, maxFromAmount);
  };

  const getInvoiceById = useCallback((id: string | null) => {
    if (!id) return null;
    return invoices.find((i) => i.details?.id === id) ?? null;
  }, [invoices]);

  // Verify phone number
  const verifyPhoneNumber = useCallback(async (number: string) => {
    const trimmed = number.trim();
    if (trimmed.length < 10) return;

    try {
      setVerifying(true);
      setVerified(false);
      setAccountName(null);
      setPhoneError(null);

      const vaultOTPToken = await storage.getItem('vaultOtpToken');
      const collectoId = await storage.getItem('collectoId');
      const clientId = user?.clientId;

      const res = await api.post('/verifyPhoneNumber', {
        vaultOTPToken,
        collectoId,
        clientId,
        phoneNumber: trimmed,
      });

      const payload = res?.data ?? {};
      const nested = payload?.data ?? {};
      const deeper = nested?.data ?? {};

      const name = (deeper?.name && String(deeper.name).trim()) ||
        (nested?.name && String(nested.name).trim()) ||
        (payload?.name && String(payload.name).trim()) || null;

      const verifiedFlag = Boolean(
        nested?.verifyPhoneNumber ??
        deeper?.verifyPhoneNumber ??
        String(payload?.status_message ?? '').toLowerCase() === 'success'
      );

      if (verifiedFlag) {
        setVerified(true);
        if (name) setAccountName(name);
      } else {
        setPhoneError(nested?.message || payload?.message || 'Verification failed');
      }
    } catch (err: any) {
      setPhoneError(err?.response?.data?.message || err?.message || 'Error verifying number');
    } finally {
      setVerifying(false);
    }
  }, [user?.clientId]);

  // Handle invoice payment
  const handlePayInvoice = async (invoiceId: string) => {
    try {
      setProcessing(true);

      const targetInvoice = invoices.find((inv) => inv.details?.id === invoiceId);
      const balanceDue = Number(targetInvoice?.amount_less ?? targetInvoice?.details?.invoice_amount ?? 0);

      const pointsUse = Math.max(0, Math.floor(pointsToUse || 0));
      const pointsValueUGX = pointsUse * ugxPerPoint;

      const mobilePayment = typeof mobileAmount === 'number'
        ? mobileAmount
        : Math.max(0, balanceDue - pointsValueUGX);

      if (!payPhone || !verified) {
        Alert.alert('Error', 'Please verify a phone number for the mobile money portion.');
        setProcessing(false);
        return;
      }

      if (mobilePayment <= 0) {
        Alert.alert('Error', 'Please leave a mobile money portion > 0 UGX.');
        setProcessing(false);
        return;
      }

      const vaultOTPToken = await storage.getItem('vaultOtpToken');
      const collectoId = await storage.getItem('collectoId');
      const clientId = user?.clientId;

      const formattedPhone = payPhone.startsWith('0') ? payPhone.replace(/^0/, '256') : payPhone;

      const payload: any = {
        vaultOTPToken,
        collectoId,
        clientId,
        reference: invoiceId,
        paymentOption: 'mobilemoney',
        phone: formattedPhone,
        staffId: staffId || '',
        amount: mobilePayment,
      };

      if (pointsUse > 0) {
        payload.points = {
          points_used: pointsUse,
          discount_amount: pointsValueUGX,
        };
      }

      const response = await invoiceService.payInvoice(payload);
      const apiPayload = response.data ?? {};

      const transactionId = apiPayload?.data?.transactionId ??
        apiPayload?.data?.transaction_id ??
        apiPayload?.transactionId ??
        apiPayload?.transaction_id ??
        apiPayload?.txId ??
        apiPayload?.tx_id ??
        null;

      const resultData = {
        transactionId,
        message: apiPayload?.data?.message || apiPayload?.message || 'Payment initiated — check your phone.',
        status: apiPayload?.status_message || apiPayload?.status || undefined,
      };

      if (pointsUse > 0) {
        setPointsBalance((p) => Math.max(0, p - pointsUse));
      }

      setPaymentResult(resultData);
      Alert.alert('Success', 'Payment initiated — checking status...');

      if (transactionId) {
        setTimeout(() => {
          queryTxStatus(transactionId);
        }, 400);
      }

      await Promise.allSettled([fetchInvoices(), fetchTransactions(), fetchCustomerData()]);
    } catch (err: any) {
      console.error('Payment failed:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Payment failed';
      Alert.alert('Payment Failed', errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  // Query transaction status
  const queryTxStatus = async (txIdParam?: string | null) => {
    const finalTxId = txIdParam ?? paymentResult?.transactionId;

    if (!finalTxId) {
      setQueryError('No transaction ID found to track.');
      return;
    }

    setQueryLoading(true);
    setQueryError(null);

    try {
      const vaultOTPToken = await storage.getItem('vaultOtpToken');
      const collectoId = await storage.getItem('collectoId');
      const clientId = user?.clientId;

      const requestBody: any = {
        vaultOTPToken,
        collectoId,
        clientId,
        transactionId: String(finalTxId),
      };

      // If transaction cash_type is ADDED, include clientAddCash
      if (selectedTransaction?.cash_type === 'ADDED' && clientAddCash) {
        requestBody.clientAddCash = clientAddCash;
      }

      const res = await api.post('/requestToPayStatus', requestBody);

      const payload = res?.data ?? {};
      const data = res?.data ?? {};

      const statusRaw = data?.status ??
        data?.payment?.status ??
        data?.paymentStatus ??
        data?.data?.status ??
        data?.data?.paymentStatus ??
        data?.status_message ??
        data?.payment?.status_message ??
        'pending';

      const status = String(statusRaw).toLowerCase().trim();

      const message = data?.message ??
        data?.status_message ??
        data?.payment?.message ??
        null;

      if (['confirmed', 'success', 'paid', 'completed', 'true', 'successful', 'successfull'].includes(status)) {
        setLastQueriedStatus('success');
        await fetchTransactions();
        setPaymentResult((prev) => prev ? { ...prev, status: 'success', message } : prev);
      } else if (['pending', 'processing', 'in_progress'].includes(status)) {
        setLastQueriedStatus('pending');
        setPaymentResult((prev) => prev ? { ...prev, status: 'pending', message } : prev);
      } else if (['failed', 'false'].includes(status)) {
        setLastQueriedStatus('failed');
        setPaymentResult((prev) => prev ? { ...prev, status: 'failed', message } : prev);
      } else {
        setQueryError(message || 'Transaction status unknown.');
      }
    } catch (err: any) {
      console.error('Status Query Error:', err);
      setQueryError(err?.response?.data?.message || 'Unable to reach payment server.');
    } finally {
      setQueryLoading(false);
    }
  };

  // Auto polling for payment status
  useEffect(() => {
    const txId = paymentResult?.transactionId ?? null;

    if (!txId) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    if (lastQueriedStatus === 'success' || lastQueriedStatus === 'failed') {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(async () => {
        await queryTxStatus(txId);
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [paymentResult?.transactionId, lastQueriedStatus]);

  // Reset payment modal state when opening
  useEffect(() => {
    if (!payingInvoice) {
      setPointsToUse(0);
      setMobileAmount(undefined);
      setStaffId('');
      setPayPhone('');
      setAccountName(null);
      setVerified(false);
      setPhoneError(null);
      setPaymentResult(null);
      setQueryError(null);
      setLastQueriedStatus(null);
      return;
    }

    const invoice = getInvoiceById(payingInvoice);
    if (!invoice) return;

    const amount = Number(invoice?.amount_less ?? invoice?.details?.invoice_amount ?? 0);
    setMobileAmount(amount);
    setPaymentResult(null);
    setQueryError(null);
    setLastQueriedStatus(null);
  }, [payingInvoice, getInvoiceById]);

  const getInvoiceStatusColor = (invoice: InvoiceItem) => {
    const isPaid = Number(invoice.amount_less) === 0;
    return isPaid ? '#e8f5e9' : '#ffebee';
  };

  const getInvoiceStatusText = (invoice: InvoiceItem) => {
    const isPaid = Number(invoice.amount_less) === 0;
    return isPaid ? 'PAID' : 'PENDING';
  };

  const getInvoiceStatusTextColor = (invoice: InvoiceItem) => {
    const isPaid = Number(invoice.amount_less) === 0;
    return isPaid ? '#2e7d32' : '#c62828';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d81b60" />
        <Text style={styles.loadingText}>Fetching invoices...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statement</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoices' && styles.tabActive]}
          onPress={() => setActiveTab('invoices')}
        >
          <Text style={[styles.tabText, activeTab === 'invoices' && styles.tabTextActive]}>
            Invoices
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
            Transactions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'invoices' ? (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.details?.id || item.id || Math.random().toString()}
          renderItem={({ item: invoice }) => {
            const invId = invoice.details?.id || 'N/A';
            const dateRaw = invoice.details?.invoice_date || 'N/A';
            const amount = Number(invoice.details?.invoice_amount || 0);
            const isPaid = Number(invoice.amount_less) === 0;

            return (
              <TouchableOpacity
                style={[
                  styles.itemCard,
                  { backgroundColor: getInvoiceStatusColor(invoice) },
                ]}
                onPress={() => {
                  setSelectedInvoice(invoice);
                  setInvoiceModalVisible(true);
                }}
              >
                <View style={styles.itemIcon}>
                  <Feather name="file-text" size={20} color="#d81b60" />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{invId}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemDate}>{dateRaw}</Text>
                    <Text style={styles.itemMetaSeparator}>•</Text>
                    <Text style={[styles.itemStatus, { color: getInvoiceStatusTextColor(invoice) }]}>
                      {getInvoiceStatusText(invoice)}
                    </Text>
                  </View>
                  <Text style={styles.itemSubtext}>
                    UGX {Number(amount).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemAmount}>
                    UGX {Number(amount).toLocaleString()}
                  </Text>
                  {!isPaid && (
                    <TouchableOpacity
                      style={styles.payNowButton}
                      onPress={() => {
                        setPayingInvoice(invId);
                        setPaymentModalVisible(true);
                      }}
                    >
                      <Text style={styles.payNowText}>Pay Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={40} color="#ddd" />
              <Text style={styles.emptyText}>No invoices found</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d81b60" />
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item: tx }) => {
            const isConfirmed = ['success', 'confirmed'].includes(
              (tx.status || tx.paymentStatus || '').toLowerCase()
            );

            return (
              <TouchableOpacity 
                style={styles.itemCard}
                onPress={() => {
                  setSelectedTransaction(tx);
                  setTransactionModalVisible(true);
                }}
              >
                <View
                  style={[
                    styles.itemIcon,
                    { 
                      backgroundColor: '#f0f0f0',
                    },
                  ]}
                >
                  <Feather
                    name="arrow-down-left"
                    size={20}
                    color="#4caf50"
                  />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>
                    {tx.cash_type || 'Transaction'}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemDate}>
                      {tx.cash_date || new Date(tx.updated_on || tx.createdAt || new Date()).toLocaleDateString()}
                    </Text>
                    <Text style={styles.itemMetaSeparator}>•</Text>
                    <Text style={styles.itemStatus}>
                      {tx.user_type || 'CLIENT'}
                    </Text>
                    <Text style={styles.itemMetaSeparator}>•</Text>
                    <Text
                      style={[
                        styles.itemStatus,
                        {
                          color: isConfirmed ? '#2e7d32' : '#e65100',
                        },
                      ]}
                    >
                      {tx.status || tx.paymentStatus || 'PENDING'}
                    </Text>
                  </View>
                  {tx.reference && (
                    <Text style={styles.itemSubtext}>
                      Ref: {tx.reference}
                    </Text>
                  )}
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemAmount}>
                    UGX {Number(String(tx.amount || 0).replace(/,/g, '')).toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={40} color="#ddd" />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d81b60" />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          visible={invoiceModalVisible}
          invoice={selectedInvoice}
          onClose={() => {
            setInvoiceModalVisible(false);
            setSelectedInvoice(null);
          }}
          onRequestPay={(invoiceId) => {
            setPayingInvoice(invoiceId);
            setPaymentModalVisible(true);
          }}
        />
      )}

      {/* Payment Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 90}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pay Invoice</Text>
                <TouchableOpacity
                  onPress={() => {
                    setPaymentModalVisible(false);
                    setPayingInvoice(null);
                  }}
                >
                  <Feather name="x" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} keyboardShouldPersistTaps="handled">
              {paymentResult ? (
                // Payment result view
                <View style={styles.resultContainer}>
                  <View style={[
                    styles.resultIcon,
                    lastQueriedStatus === 'success' && styles.resultSuccess,
                    lastQueriedStatus === 'failed' && styles.resultFailed,
                    (!lastQueriedStatus || lastQueriedStatus === 'pending') && styles.resultPending,
                  ]}>
                    {lastQueriedStatus === 'success' && <Feather name="check-circle" size={24} color="#fff" />}
                    {lastQueriedStatus === 'failed' && <Feather name="x-circle" size={24} color="#fff" />}
                    {(!lastQueriedStatus || lastQueriedStatus === 'pending') && <ActivityIndicator color="#fff" />}
                  </View>
                  <Text style={styles.resultTitle}>
                    {lastQueriedStatus === 'success' && 'Payment Confirmed!'}
                    {lastQueriedStatus === 'failed' && 'Payment Failed'}
                    {(!lastQueriedStatus || lastQueriedStatus === 'pending') && 'Processing Payment...'}
                  </Text>
                  <Text style={styles.resultMessage}>{paymentResult.message}</Text>
                  
                  {lastQueriedStatus === 'pending' && (
                    <TouchableOpacity
                      style={styles.checkStatusButton}
                      onPress={() => queryTxStatus(paymentResult.transactionId)}
                      disabled={queryLoading}
                    >
                      <Text style={styles.checkStatusText}>
                        {queryLoading ? 'Checking...' : 'Check Status Now'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {queryError && (
                    <Text style={styles.errorText}>{queryError}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setPaymentModalVisible(false);
                      setPayingInvoice(null);
                    }}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // Payment form
                <>
                  {/* Invoice info */}
                  <View style={styles.invoiceCard}>
                    <View style={styles.invoiceRow}>
                      <Text style={styles.invoiceLabel}>Invoice</Text>
                      <Text style={styles.invoiceValue}>{payingInvoice}</Text>
                    </View>
                    <View style={styles.invoiceRow}>
                      <Text style={styles.invoiceLabel}>Balance Due</Text>
                      <Text style={styles.invoiceAmount}>
                        UGX {Number(getInvoiceById(payingInvoice)?.amount_less ?? getInvoiceById(payingInvoice)?.details?.invoice_amount ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Points and amount inputs side-by-side */}
                  <View style={styles.row}>
                    <View style={styles.halfColumn}>
                      <Text style={styles.sectionTitle}>Points to Use</Text>
                      <TextInput
                        style={[styles.input, styles.halfInput]}
                        value={pointsToUse.toString()}
                        onChangeText={(text) => {
                          const pts = Math.max(0, Math.min(computeMaxPointsForInvoice(
                            Number(getInvoiceById(payingInvoice)?.amount_less ?? getInvoiceById(payingInvoice)?.details?.invoice_amount ?? 0),
                            ugxToPoints(Number(getInvoiceById(payingInvoice)?.amount_less ?? getInvoiceById(payingInvoice)?.details?.invoice_amount ?? 0))
                          ), parseInt(text) || 0));
                          setPointsToUse(pts);
                          const remaining = Math.max(0, Number(getInvoiceById(payingInvoice)?.amount_less ?? getInvoiceById(payingInvoice)?.details?.invoice_amount ?? 0) - pointsToUGX(pts));
                          setMobileAmount(remaining);
                        }}
                        keyboardType="numeric"
                        placeholder="Points"
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.pointHelpText}>Balance: {pointsBalance.toLocaleString()} pts</Text>
                    </View>
                    <View style={styles.halfColumn}>
                      <Text style={styles.sectionTitle}>Mobile Money</Text>
                      <TextInput
                        style={[styles.input, styles.halfInput]}
                        value={typeof mobileAmount === 'number' ? mobileAmount.toString() : ''}
                        onChangeText={(text) => {
                          const newMobile = Math.max(0, parseInt(text) || 0);
                          setMobileAmount(newMobile);
                          const impliedPointsUGX = Math.max(0, Number(getInvoiceById(payingInvoice)?.amount_less ?? getInvoiceById(payingInvoice)?.details?.invoice_amount ?? 0) - newMobile);
                          const impliedPoints = ugxToPoints(impliedPointsUGX);
                          const maxPoints = computeMaxPointsForInvoice(
                            Number(getInvoiceById(payingInvoice)?.amount_less ?? getInvoiceById(payingInvoice)?.details?.invoice_amount ?? 0),
                            ugxToPoints(Number(getInvoiceById(payingInvoice)?.amount_less ?? getInvoiceById(payingInvoice)?.details?.invoice_amount ?? 0))
                          );
                          const newPts = Math.max(0, Math.min(maxPoints, impliedPoints));
                          setPointsToUse(newPts);
                        }}
                        keyboardType="numeric"
                        placeholder="Amount"
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.amountNote}>
                        Total: UGX {Number(getInvoiceById(payingInvoice)?.amount_less ?? getInvoiceById(payingInvoice)?.details?.invoice_amount ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Phone number and staff ID row */}
                  <View style={styles.row}> 
                    <View style={styles.phoneColumn}>
                      <Text style={styles.sectionTitle}>Phone Number</Text>
                      <TextInput
                        style={[styles.input, verified && styles.inputVerified, phoneError && styles.inputError]}
                        value={payPhone}
                        onChangeText={(text) => {
                          const digits = text.replace(/\D/g, '').slice(0, 10);
                          setPayPhone(digits);
                          setAccountName(null);
                          setVerified(false);
                          setPhoneError(null);
                          if (digits.length === 10) verifyPhoneNumber(digits);
                        }}
                        placeholder="07XXXXXXXX"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    </View>
                    <View style={styles.staffColumn}>
                      <Text style={styles.sectionTitle}>Staff ID</Text>
                      <TextInput
                        style={styles.input}
                        value={staffId}
                        onChangeText={setStaffId}
                        placeholder="Staff ID"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>

                  {verifying && (
                    <ActivityIndicator size="small" color="#d81b60" style={styles.verifyingIndicator} />
                  )}
                  {accountName && (
                    <View style={styles.verifiedContainer}>
                      <Feather name="check-circle" size={16} color="#4caf50" />
                      <Text style={styles.verifiedText}>{accountName}</Text>
                    </View>
                  )}
                  {phoneError && (
                    <View style={styles.errorContainer}>
                      <Feather name="alert-circle" size={16} color="#f44336" />
                      <Text style={styles.errorTextInline}>{phoneError}</Text>
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setPaymentModalVisible(false);
                        setPayingInvoice(null);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.payButton, (!verified || processing) && styles.payButtonDisabled]}
                      onPress={() => handlePayInvoice(payingInvoice!)}
                      disabled={!verified || processing}
                    >
                      <Text style={styles.payButtonText}>
                        {processing ? 'Processing...' : 'Continue'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
      </Modal>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={transactionModalVisible}
        transaction={selectedTransaction}
        clientAddCashProp={clientAddCash}
        onClose={() => {
          setTransactionModalVisible(false);
          setSelectedTransaction(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#d81b60',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#d81b60',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 80,
  },
  itemCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    alignItems: 'flex-start',
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  iconText: {
    fontSize: 20,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  itemDate: {
    fontSize: 11,
    color: '#999',
  },
  itemMetaSeparator: {
    fontSize: 11,
    color: '#ddd',
  },
  itemStatus: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemSubtext: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  itemPoints: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d81b60',
    marginBottom: 2,
  },
  dueAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#c62828',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    minHeight: 300,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  payNowButton: {
    backgroundColor: '#d81b60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  payNowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalBodyContent: {
    paddingBottom: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  phoneColumn: {
    flex: 0.6,
  },
  staffColumn: {
    flex: 0.4,
  },
  halfColumn: {
    flex: 1,
  },
  halfInput: {
    width: '100%',
  },
  pointHelpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  resultIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultSuccess: {
    backgroundColor: '#4caf50',
  },
  resultFailed: {
    backgroundColor: '#f44336',
  },
  resultPending: {
    backgroundColor: '#2196f3',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  checkStatusButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  checkStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  invoiceCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  invoiceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d81b60',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  pointsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#666',
  },
  pointsValue: {
    fontSize: 14,
    color: '#d81b60',
    fontWeight: '600',
  },
  sliderInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  pointsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pointsApplied: {
    fontSize: 14,
    color: '#666',
  },
  valueApplied: {
    fontSize: 14,
    color: '#d81b60',
    fontWeight: '600',
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 4,
  },
  amountNote: {
    fontSize: 12,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputVerified: {
    borderColor: '#4caf50',
  },
  inputError: {
    borderColor: '#f44336',
  },
  verifyingIndicator: {
    marginTop: 8,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 14,
    color: '#4caf50',
    marginLeft: 8,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: '#d81b60',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 12,
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 8,
  },
  errorTextInline: {
    fontSize: 14,
    color: '#f44336',
    marginLeft: 8,
    flex: 1,
  },
});
