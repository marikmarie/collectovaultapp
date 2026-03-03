import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { customerService } from '@/src/api/customer';
import { transactionService } from '@/src/api/collecto';
import storage from '@/src/utils/storage';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  points: number;
  paymentStatus: string;
  createdAt: string;
  reference?: string;
  transactionId?: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'points' | 'tier'>('tier');
  const [pointsBalance, setPointsBalance] = useState(0);
  const [tier, setTier] = useState('N/A');
  const [tierProgress, setTierProgress] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const clientId = user?.clientId || '';

  const fetchData = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      // Fetch customer profile
      const customerRes = await customerService.getCustomerData(clientId);
      const cData = customerRes.data;

      if (cData?.customer) {
        setPointsBalance(cData.customer.currentPoints || 0);
        setTier(cData.currentTier?.name || 'N/A');

        // Calculate tier progress
        if (cData.currentTier && cData.tiers) {
          const idx = cData.tiers.findIndex((t: any) => t.id === cData.currentTier.id);
          if (idx !== -1 && idx < cData.tiers.length - 1) {
            const next = cData.tiers[idx + 1];
            const diff = next.pointsRequired - cData.currentTier.pointsRequired;
            const earned = cData.customer.currentPoints - cData.currentTier.pointsRequired;
            setTierProgress(Math.min(100, Math.max(0, (earned / diff) * 100)));
          } else {
            setTierProgress(100);
          }
        }
      }

      // Fetch transactions with correct parameters (limit: 5 for dashboard preview)
      const txRes = await transactionService.getTransactions(clientId, 5, 0);
      const txs = (txRes.data?.data?.data ?? txRes.data?.transactions ?? []).slice(0, 5);
      setTransactions(txs);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  const getTransactionIcon = (tx: Transaction) => {
    const isInvoice = tx.reference === 'INVOICE_PURCHASE';
    return isInvoice ? '📤' : '📥';
  };

  const getTransactionColor = (tx: Transaction) => {
    const isInvoice = tx.reference === 'INVOICE_PURCHASE';
    return isInvoice ? '#2196f3' : '#4caf50';
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d81b60" />}
      >
        {/* TABS */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'points' && styles.tabActive]}
            onPress={() => setActiveTab('points')}
          >
            <Text style={[styles.tabValue, activeTab === 'points' && styles.tabValueActive]}>
              {pointsBalance.toLocaleString()}
            </Text>
            <Text style={styles.tabLabel}>Available Points</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'tier' && styles.tabActive]}
            onPress={() => setActiveTab('tier')}
          >
            <Text style={[styles.tabValue, activeTab === 'tier' && styles.tabValueActive]}>
              {tier}
            </Text>
            <Text style={styles.tabLabel}>Current Tier</Text>
          </TouchableOpacity>
        </View>

        {/* ACTIONS */}
        {activeTab === 'points' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/spend-points')}
            >
              <Text style={styles.actionButtonText}>Spend</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => router.push('/buy-points')}
            >
              <Text style={styles.actionButtonTextPrimary}>Buy Points</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* POINTS TAB CONTENT */}
        {activeTab === 'points' && (
          <View>
            {/* Offers Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {transactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No transactions yet</Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={transactions}
                  keyExtractor={(tx) => tx.id}
                  renderItem={({ item: tx }) => {
                    const isInvoice = tx.reference === 'INVOICE_PURCHASE';
                    return (
                      <View style={styles.transactionCard}>
                        <View
                          style={[
                            styles.txIcon,
                            { backgroundColor: isInvoice ? '#e3f2fd' : '#e8f5e9' },
                          ]}
                        >
                          <Text style={styles.txIconEmoji}>
                            {getTransactionIcon(tx)}
                          </Text>
                        </View>

                        <View style={styles.txContent}>
                          <Text style={styles.txTitle}>
                            {isInvoice ? 'Earned from Service' : 'Points Purchase'}
                          </Text>
                          <Text style={styles.txDate}>
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </Text>
                        </View>

                        <View style={styles.txRight}>
                          <Text style={styles.txPoints}>{isInvoice ? '+' : '-'}{tx.points} pts</Text>
                          <Text style={styles.txAmount}>
                            {(tx.amount || 0).toLocaleString()} UGX
                          </Text>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          </View>
        )}

        {/* TIER TAB CONTENT */}
        {activeTab === 'tier' && (
          <View>
            {/* Progress */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tier Progress</Text>
              <View style={styles.progressCard}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${tierProgress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(tierProgress)}% to next tier
                </Text>
              </View>

              <TouchableOpacity
                style={styles.benefitsButton}
                onPress={() => router.push('/tier-details')}
              >
                <Text style={styles.benefitsButtonText}>View Tier Benefits</Text>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#d81b60',
  },
  tabValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tabValueActive: {
    color: '#d81b60',
  },
  tabLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#f0edee',
    borderColor: '#f0edee',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#fff',
    paddingVertical: 40,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    color: '#999',
    fontSize: 14,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  txIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txIconEmoji: {
    fontSize: 24,
  },
  txContent: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  txDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d81b60',
  },
  txAmount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
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
    color: '#999',
  },
  benefitsButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  benefitsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d81b60',
  },
});
