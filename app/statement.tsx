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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface TransactionItem {
  id: string;
  type: 'INVOICE_PURCHASE' | 'POINTS_EARNED' | 'POINTS_REDEEMED';
  amount: number;
  pointsEarned: number;
  pointsRedeemed: number;
  status: string;
  date: string;
  description: string;
}

export default function StatementScreen() {
  const router = useRouter();
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

      const mapped: TransactionItem[] = txs.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: t.amount || 0,
        pointsEarned: t.pointsEarned || 0,
        pointsRedeemed: t.pointsRedeemed || 0,
        status: t.status,
        date: new Date(t.createdAt || Date.now()).toLocaleString(),
        description: t.type === 'INVOICE_PURCHASE' ? 'Invoice Payment' :
                    t.type === 'POINTS_EARNED' ? 'Points Earned' :
                    'Points Redeemed',
      }));

      setTransactions(mapped);
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
    if (activeTab === 'earned') return tx.pointsEarned > 0 || tx.type === 'POINTS_EARNED';
    if (activeTab === 'spent') return tx.pointsRedeemed > 0 || tx.type === 'POINTS_REDEEMED';
    return true;
  });

  const getTransactionColor = (tx: TransactionItem) => {
    if (tx.pointsEarned > 0) return '#4caf50';
    if (tx.pointsRedeemed > 0) return '#ff9800';
    return '#2196f3';
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Filter */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
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
          <Text style={[styles.tabText, activeTab === 'spent' && styles.tabTextActive]}>Spent</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.transactionCard}
            onPress={() =>
              Alert.alert(
                item.description,
                `Status: ${item.status}\nAmount: ${item.amount}\nDate: ${item.date}`,
              )
            }
          >
            <View
              style={[styles.transactionIcon, { backgroundColor: getTransactionColor(item) }]}
            >
              <Text style={styles.iconText}>{item.pointsEarned > 0 ? '📈' : '📉'}</Text>
            </View>
            <View style={styles.transactionContent}>
              <Text style={styles.transactionDesc}>{item.description}</Text>
              <Text style={styles.transactionDate}>{item.date}</Text>
            </View>
            <View style={styles.transactionValue}>
              <Text style={[styles.transactionPoints, { color: getTransactionColor(item) }]}>
                {item.pointsEarned > 0 ? '+' : '-'}
                {Math.max(item.pointsEarned, item.pointsRedeemed)}
              </Text>
              <Text style={styles.transactionStatus}>{item.status}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtnText: {
    color: '#d81b60',
    fontWeight: '600',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 18,
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
