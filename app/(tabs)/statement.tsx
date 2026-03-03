import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { transactionService, invoiceService } from '@/src/api/collecto';

interface TransactionItem {
  id: string;
  amount: number;
  points: number;
  paymentStatus: string;
  createdAt: string;
  reference?: string;
  transactionId?: string;
}

interface InvoiceItem {
  id?: string;
  details?: {
    id: string;
    invoice_date: string;
    invoice_amount: number;
  };
  amount_less: number;
  pointsEquivalent?: number;
}

export default function StatementScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'transactions'>('invoices');

  const fetchTransactions = useCallback(async () => {
    if (!user?.clientId) return;

    try {
      const response = await transactionService.getTransactions(user.clientId);
      const txs = response.data?.transactions || [];
      setTransactions(txs);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      Alert.alert('Error', 'Failed to fetch transaction history');
    }
  }, [user?.clientId]);

  const fetchInvoices = useCallback(async () => {
    if (!user?.clientId) return;

    try {
      const response = await invoiceService.getInvoices(user.clientId);
      const invs = response.data?.data?.data || response.data?.data || [];
      
      // Sort by date descending
      const sorted = Array.isArray(invs) ? invs.sort((a: InvoiceItem, b: InvoiceItem) => {
        const dateA = new Date(a.details?.invoice_date || 0).getTime();
        const dateB = new Date(b.details?.invoice_date || 0).getTime();
        return dateB - dateA;
      }) : [];

      setInvoices(sorted);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      Alert.alert('Error', 'Failed to fetch invoices');
    }
  }, [user?.clientId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchInvoices(), fetchTransactions()]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchInvoices, fetchTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchInvoices(), fetchTransactions()]).finally(() => setRefreshing(false));
  }, [fetchInvoices, fetchTransactions]);

  const getTransactionIcon = (tx: TransactionItem) => {
    const isInvoice = tx.reference === 'INVOICE_PURCHASE';
    return isInvoice ? '📤' : '📥';
  };

  const getTransactionColor = (tx: TransactionItem) => {
    const isInvoice = tx.reference === 'INVOICE_PURCHASE';
    return isInvoice ? '#e3f2fd' : '#e8f5e9';
  };

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
              <View
                style={[
                  styles.itemCard,
                  { backgroundColor: getInvoiceStatusColor(invoice) },
                ]}
              >
                <View style={styles.itemIcon}>
                  <Text style={styles.iconText}>📥</Text>
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
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
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
              (tx.paymentStatus || '').toLowerCase()
            );

            return (
              <View style={styles.itemCard}>
                <View
                  style={[
                    styles.itemIcon,
                    { backgroundColor: getTransactionColor(tx) },
                  ]}
                >
                  <Text style={styles.iconText}>{getTransactionIcon(tx)}</Text>
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>
                    {tx.transactionId}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemDate}>
                      {new Date(tx.createdAt).toLocaleDateString()}
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
                      {tx.paymentStatus}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemPoints}>
                    {tx.points > 0 ? '+' : ''}{tx.points.toLocaleString()} pts
                  </Text>
                  <Text style={styles.itemAmount}>
                    {(tx.amount || 0).toLocaleString()} UGX
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d81b60" />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
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
});
