import { StyleSheet, View, Text, ScrollView, RefreshControl, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Award, TrendingUp, RefreshCw } from 'lucide-react-native';
import { customerService } from '@/lib/customerService';
import { transactionService } from '@/lib/transactionService';
import { StorageService, StorageKeys } from '@/lib/storage';
import { useRouter } from 'expo-router';

const DUMMY_OFFERS = [
  { id: '1', title: '10% Discount', pointsCost: 500, desc: 'Next purchase' },
  { id: '2', title: 'Free Concert Ticket', pointsCost: 250, desc: 'Local event' },
  { id: '3', title: 'Member Offer', pointsCost: 1000, desc: 'Exclusive' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>('');

  // Data states
  const [pointsBalance, setPointsBalance] = useState(0);
  const [tier, setTier] = useState('N/A');
  const [tierProgress, setTierProgress] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [offers, setOffers] = useState(DUMMY_OFFERS);

  useEffect(() => {
    initClient();
  }, []);

  const initClient = async () => {
    try {
      const id = await StorageService.getItem(StorageKeys.CLIENT_ID);
      if (!id) {
        router.replace('/(customer)' as any);
        return;
      }
      setClientId(id);
      await fetchData(id);
    } catch (err) {
      console.error('Init error:', err);
      setError('Failed to initialize');
      setLoading(false);
    }
  };

  const fetchData = async (id: string) => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch customer data
      const customerRes = await customerService.getCustomerData(id);
      const cData = customerRes.data;

      if (cData?.customer) {
        setPointsBalance(cData.customer.currentPoints || 0);
        setTier(cData.currentTier?.name || 'N/A');

        // Calculate progress
        if (cData.currentTier && cData.tiers) {
          const idx = cData.tiers.findIndex((t: any) => t.id === cData.currentTier.id);
          if (idx !== -1 && idx < cData.tiers.length - 1) {
            const nextTier = cData.tiers[idx + 1];
            const diff = nextTier.pointsRequired - cData.currentTier.pointsRequired;
            const earned = cData.customer.currentPoints - cData.currentTier.pointsRequired;
            setTierProgress(Math.min(100, Math.max(0, (earned / diff) * 100)));
          } else {
            setTierProgress(100);
          }
        }
      }

      // Fetch transactions
      const txRes = await transactionService.getTransactions(id);
      setTransactions(txRes.data?.transactions || []);

      // Fetch offers
      try {
        const offersRes = await customerService.getRedeemableOffers();
        setOffers(offersRes.data?.offers || DUMMY_OFFERS);
      } catch {
        setOffers(DUMMY_OFFERS);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(clientId);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.userName}>Customer</Text>
          </View>
          <Pressable onPress={() => onRefresh()}>
            <RefreshCw size={24} color="#d81b60" />
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorAlert}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Points & Tier Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <TrendingUp size={20} color="#d81b60" />
            </View>
            <Text style={styles.statLabel}>Points Balance</Text>
            <Text style={styles.statValue}>{pointsBalance}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Award size={20} color="#ff9800" />
            </View>
            <Text style={styles.statLabel}>Current Tier</Text>
            <Text style={styles.statValue}>{tier}</Text>
          </View>
        </View>

        {/* Tier Progress */}
        <View style={styles.tierCard}>
          <Text style={styles.tierTitle}>Tier Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${tierProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{tierProgress.toFixed(0)}% to next tier</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          <Pressable style={styles.actionCard} onPress={() => router.push('/buy-points' as any)}>
            <Text style={styles.actionCardText}>💰 Buy Points</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/spend-points' as any)}>
            <Text style={styles.actionCardText}>🎁 Spend Points</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/services' as any)}>
            <Text style={styles.actionCardText}>🛍️ Services</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/statement' as any)}>
            <Text style={styles.actionCardText}>📊 Statement</Text>
          </Pressable>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length > 0 ? (
            transactions.slice(0, 5).map((item) => (
              <View key={item.id || Math.random()} style={styles.transactionItem}>
                <View>
                  <Text style={styles.transactionType}>{item.type || 'Transaction'}</Text>
                  <Text style={styles.transactionDate}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.transactionAmount, item.points > 0 && styles.pointsPositive]}>
                  {item.points > 0 ? '+' : ''}{item.points} pts
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No transactions yet</Text>
          )}
        </View>
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
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 4,
  },
  errorAlert: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 4,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
  },
  statIcon: {
    marginBottom: 8,
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
    color: '#333',
  },
  tierCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d81b60',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 24,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d32f2f',
  },
  pointsPositive: {
    color: '#4caf50',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
