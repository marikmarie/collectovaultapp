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
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { transactionService, invoiceService } from '@/src/api/collecto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import storage from '@/src/utils/storage';
import InvoiceDetailModal from '@/components/InvoiceDetailModal';

interface TransactionItem {
  id: string;
  type: 'INVOICE_PURCHASE' | 'POINTS_EARNED' | 'POINTS_REDEEMED';
  amount: number;
  points: number;
  status: string;
  date: string;
  description: string;
}

interface Invoice {
  details?: {
    id: string;
    invoice_date: string;
    client_name: string;
    invoice_details?: any[];
  };
  payments?: any[];
  amount_less?: number;
  total_amount_paid?: number;
}

type TabType = 'invoices' | 'transactions';

export default function StatementScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Auto-open invoice if passed via navigation
  useEffect(() => {
    if (invoiceId && invoices.length > 0) {
      const inv = invoices.find(
        (i) => i.details?.id === invoiceId
      );
      if (inv) {
        setSelectedInvoice(inv);
      }
    }
  }, [invoiceId, invoices]);

  const fetchData = useCallback(async () => {
    if (!user?.clientId) return;

    try {
      setLoading(true);

      // Fetch invoices
      const vaultOTPToken = await storage.getItem('vaultOtpToken');
      const collectoId = await storage.getItem('collectoId');

      const invoicesRes = await invoiceService.getInvoices({
        vaultOTPToken,
        clientId: user.clientId,
        collectoId,
      });

      const invData = invoicesRes.data?.data?.invoices || invoicesRes.data?.invoices || [];
      setInvoices(Array.isArray(invData) ? invData : []);

      // Fetch transactions
      const txRes = await transactionService.getTransactions(user.clientId, 50, 0);
      const txs = txRes.data?.data?.data ?? txRes.data?.transactions ?? [];

      const mapped: TransactionItem[] = txs.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: t.amount || 0,
        points: t.points || t.pointsEarned || 0,
        status: t.paymentStatus || t.status || 'pending',
        date: new Date(t.createdAt || Date.now()).toLocaleDateString(),
        description:
          t.type === 'INVOICE_PURCHASE'
            ? 'Service Purchase'
            : t.type === 'POINTS_EARNED'
            ? 'Points Earned'
            : 'Points Spent',
      }));

      setTransactions(mapped);
    } catch (err) {
      console.error('Error fetching data:', err);
      Alert.alert('Error', 'Failed to load statement data');
    } finally {
      setLoading(false);
    }
  }, [user?.clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

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
        <View>
          <Text style={styles.headerTitle}>Statement</Text>
          <Text style={styles.subtitle}>View your invoices and transactions</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={24} color="#d81b60" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoices' && styles.tabActive]}
          onPress={() => setActiveTab('invoices')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'invoices' && styles.tabTextActive,
            ]}
          >
            Invoices ({invoices.length})
          </Text>
          {activeTab === 'invoices' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'transactions' && styles.tabTextActive,
            ]}
          >
            Transactions ({transactions.length})
          </Text>
          {activeTab === 'transactions' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'invoices' ? (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.details?.id || `inv-${Math.random()}`}
          renderItem={({ item }) => {
            const amountDue = item.amount_less ?? 0;
            const isPaid = amountDue === 0;

            return (
              <TouchableOpacity
                style={styles.invoiceCard}
                onPress={() => setSelectedInvoice(item)}
              >
                <View style={styles.invoiceCardLeft}>
                  <View
                    style={[
                      styles.invoiceIcon,
                      { backgroundColor: isPaid ? '#e8f5e9' : '#fff3e0' },
                    ]}
                  >
                    <Feather
                      name="file-text"
                      size={20}
                      color={isPaid ? '#4caf50' : '#ff9800'}
                    />
                  </View>
                  <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceId}>
                      {item.details?.id || 'Unknown'}
                    </Text>
                    <Text style={styles.invoiceDate}>
                      {item.details?.invoice_date || 'N/A'}
                    </Text>
                  </View>
                </View>
                <View style={styles.invoiceCardRight}>
                  <Text
                    style={[
                      styles.invoiceAmount,
                      {
                        color: isPaid ? '#4caf50' : '#ff9800',
                      },
                    ]}
                  >
                    UGX {(amountDue > 0 ? amountDue : item.total_amount_paid || 0).toLocaleString()}
                  </Text>
                  <View
                    style={[
                      styles.invoiceBadge,
                      { backgroundColor: isPaid ? '#e8f5e9' : '#fff3e0' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.invoiceBadgeText,
                        { color: isPaid ? '#4caf50' : '#ff9800' },
                      ]}
                    >
                      {isPaid ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No invoices found</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isEarned = item.points > 0;
            const color = isEarned ? '#4caf50' : '#ff9800';

            return (
              <View style={styles.transactionCard}>
                <View
                  style={[styles.transactionIcon, { backgroundColor: `${color}20` }]}
                >
                  <Feather
                    name={isEarned ? 'arrow-down-left' : 'arrow-up-right'}
                    size={20}
                    color={color}
                  />
                </View>
                <View style={styles.transactionContent}>
                  <Text style={styles.transactionDescription}>
                    {item.description}
                  </Text>
                  <Text style={styles.transactionDate}>{item.date}</Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[styles.transactionPoints, { color }]}>
                    {isEarned ? '+' : '-'}
                    {item.points}
                  </Text>
                  <Text style={styles.transactionStatus}>{item.status}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="activity" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        visible={!!selectedInvoice}
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
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
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  invoiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  invoiceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  invoiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  invoiceDate:  {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  invoiceCardRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  invoiceAmount: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  invoiceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  invoiceBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  transactionCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  transactionDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  transactionPoints: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  transactionStatus: {
    fontSize: 9,
    color: '#999',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
  },
  tabActive: {
    borderBottomColor: '#d81b60',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#d81b60',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  transactionCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  transactionDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  transactionValue: {
    alignItems: 'flex-end',
  },
  transactionPoints: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  transactionStatus: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});
