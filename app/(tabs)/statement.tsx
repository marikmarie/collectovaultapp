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
import { transactionService } from '@/src/api/collecto';

interface TransactionItem {
  id: string;
  amount: number;
  points: number;
  paymentStatus: string;
  createdAt: string;
  reference?: string;
  transactionId?: string;
}

export default function StatementScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'earned' | 'spent'>('all');

  const fetchTransactions = useCallback(async () => {
    if (!user?.clientId) return;

    try {
      setLoading(true);
      const response = await transactionService.getTransactions(user.clientId);
      const txs = response.data?.transactions || [];
      setTransactions(txs);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      Alert.alert('Error', 'Failed to fetch transaction history');
    } finally {
      setLoading(false);
    }
  }, [user?.clientId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions().finally(() => setRefreshing(false));
  }, [fetchTransactions]);

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === 'earned') return tx.points > 0;
    if (activeTab === 'spent') return tx.points < 0;
    return true;
  });

  const getTransactionIcon = (tx: TransactionItem) => {
    const isInvoice = tx.reference === 'INVOICE_PURCHASE';
    return isInvoice ? '📤' : '📥';
  };

  const getTransactionColor = (tx: TransactionItem) => {
    const isInvoice = tx.reference === 'INVOICE_PURCHASE';
    return isInvoice ? '#e3f2fd' : '#e8f5e9';
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

      {/* Tab Filter */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'earned' && styles.tabActive]}
          onPress={() => setActiveTab('earned')}
        >
          <Text style={[styles.tabText, activeTab === 'earned' && styles.tabTextActive]}>
            Earned
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'spent' && styles.tabActive]}
          onPress={() => setActiveTab('spent')}
        >
          <Text style={[styles.tabText, activeTab === 'spent' && styles.tabTextActive]}>
            Spent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item: tx }) => {
          const isInvoice = tx.reference === 'INVOICE_PURCHASE';
          const isConfirmed = ['success', 'confirmed'].includes(
            (tx.paymentStatus || '').toLowerCase()
          );

          return (
            <View style={styles.transactionCard}>
              <View
                style={[
                  styles.transactionIcon,
                  { backgroundColor: getTransactionColor(tx) },
                ]}
              >
                <Text style={styles.iconText}>{getTransactionIcon(tx)}</Text>
              </View>
              <View style={styles.transactionContent}>
                <Text style={styles.transactionDesc}>
                  {isInvoice ? 'Earned from Service' : 'Points Purchase'}
                </Text>
                <Text style={styles.transactionId}>{tx.transactionId}</Text>
                <View style={styles.transactionFooter}>
                  <Text style={styles.transactionDate}>
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isConfirmed ? '#e8f5e9' : '#fff3e0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: isConfirmed ? '#2e7d32' : '#e65100',
                        },
                      ]}
                    >
                      {tx.paymentStatus}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.transactionValue}>
                <Text style={styles.transactionPoints}>
                  {tx.points > 0 ? '+' : ''}{tx.points.toLocaleString()} pts
                </Text>
                <Text style={styles.transactionAmount}>
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
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
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
    paddingTop: 12,
    paddingBottom: 100,
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
    alignItems: 'flex-start',
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  iconText: {
    fontSize: 24,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  transactionId: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  transactionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionDate: {
    fontSize: 10,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  transactionValue: {
    alignItems: 'flex-end',
  },
  transactionPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d81b60',
    marginBottom: 2,
  },
  transactionAmount: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
