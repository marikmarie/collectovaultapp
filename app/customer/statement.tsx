import { StyleSheet, View, Text, ScrollView, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react-native';
import { transactionService } from '@/lib/transactionService';
import { customerService } from '@/lib/customerService';
import { StorageService, StorageKeys } from '@/lib/storage';
import { dateUtils } from '@/lib/dateUtils';

interface Transaction {
  id: string | number;
  type: string;
  date: string;
  points: number;
  amount?: number;
  description?: string;
}

type FilterType = 'all' | 'earned' | 'spent';

export default function StatementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    initClient();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, transactions]);

  const initClient = async () => {
    try {
      const id = await StorageService.getItem(StorageKeys.CLIENT_ID);
      if (id) {
        setClientId(id);
        await fetchTransactions(id);
      }
    } catch (err) {
      console.error('Init error:', err);
      setLoading(false);
    }
  };

  const fetchTransactions = async (id: string) => {
    try {
      setLoading(true);
      const res = await transactionService.getTransactions(id);
      setTransactions(res.data?.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (clientId) {
      await fetchTransactions(clientId);
    }
    setRefreshing(false);
  };

  const applyFilter = () => {
    let filtered = transactions;
    if (filter === 'earned') {
      filtered = transactions.filter((t) => t.points > 0);
    } else if (filter === 'spent') {
      filtered = transactions.filter((t) => t.points < 0);
    }
    setFilteredTransactions(filtered);
  };

  const calculateStats = () => {
    const earned = transactions
      .filter((t) => t.points > 0)
      .reduce((sum, t) => sum + t.points, 0);
    const spent = Math.abs(
      transactions
        .filter((t) => t.points < 0)
        .reduce((sum, t) => sum + t.points, 0)
    );
    return { earned, spent };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#d81b60" />
          <Text style={styles.loadingText}>Loading statement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Statement</Text>
          <Text style={styles.subtitle}>Your transaction history</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Points Earned</Text>
            <Text style={styles.statValue}>{stats.earned}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Points Spent</Text>
            <Text style={[styles.statValue, styles.spentValue]}>{stats.spent}</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {(['all', 'earned', 'spent'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Transactions List */}
        {filteredTransactions.length > 0 ? (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.transactionCard}>
                <View style={styles.transactionRow}>
                  <View
                    style={[
                      styles.transactionIcon,
                      item.points > 0
                        ? styles.transactionIconPositive
                        : styles.transactionIconNegative,
                    ]}
                  >
                    <Text style={styles.transactionIconText}>
                      {item.points > 0 ? "↑" : "↓"}
                    </Text>
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionType}>{item.type}</Text>
                    <Text style={styles.transactionDate}>
                      {dateUtils.format(item.date, 'MMM DD, YYYY HH:mm')}
                    </Text>
                    {item.description && (
                      <Text style={styles.transactionDesc}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.transactionPoints,
                        item.points > 0
                          ? styles.pointsPositive
                          : styles.pointsNegative,
                      ]}
                    >
                      {item.points > 0 ? '+' : ''}{item.points} pts
                    </Text>
                    {item.amount && (
                      <Text style={styles.transactionAmount}>
                        ${item.amount}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <FileText size={40} color="#ccc" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4caf50',
  },
  spentValue: {
    color: '#d32f2f',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterTabActive: {
    backgroundColor: '#d81b60',
    borderColor: '#d81b60',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionIconPositive: {
    backgroundColor: '#4caf50',
  },
  transactionIconNegative: {
    backgroundColor: '#d32f2f',
  },
  transactionIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  transactionDesc: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 4,
    fontStyle: 'italic',
  },
  transactionPoints: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  pointsPositive: {
    color: '#4caf50',
  },
  pointsNegative: {
    color: '#d32f2f',
  },
  transactionAmount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});
