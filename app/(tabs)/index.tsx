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
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { customerService } from '@/src/api/customer';
import { transactionService } from '@/src/api/collecto';
import storage from '@/src/utils/storage';
import DashboardHeader from '@/components/DashboardHeader';
import OffersSlider from '@/components/OffersSlider';
import EnhancedTierProgress from '@/components/EnhancedTierProgress';
import HowToEarnPoints from '@/components/HowToEarnPoints';

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

interface RedeemableOffer {
  id: string;
  title: string;
  desc?: string;
  pointsCost: number;
}

const DUMMY_OFFERS: RedeemableOffer[] = [
  {
    id: 'offer_1',
    title: '10% Discount on Next Purchase',
    desc: 'Get 10% off your next purchase over 15%',
    pointsCost: 500,
  },
  {
    id: 'offer_2',
    title: 'Free concert ticket',
    desc: 'Redeem for a free ticket to a local concert event',
    pointsCost: 250,
  },
  {
    id: 'offer_3',
    title: 'Exclusive Member Offer',
    desc: 'Special discount available only to tier members',
    pointsCost: 1000,
  },
];

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
  const [offers, setOffers] = useState<RedeemableOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [selectedRedeemOffer, setSelectedRedeemOffer] = useState<RedeemableOffer | null>(null);

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

  const fetchOffers = async () => {
    try {
      setOffersLoading(true);
      const res = await customerService.getRedeemableOffers?.();
      const offers = res?.data?.offers ?? res?.data ?? [];
      setOffers(Array.isArray(offers) && offers.length > 0 ? offers : DUMMY_OFFERS);
    } catch (err) {
      setOffers(DUMMY_OFFERS);
    } finally {
      setOffersLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchOffers();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d81b60" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d81b60" />
          }
        >
          {/* Header */}
          <DashboardHeader name={user?.userName || 'User'} />

          {/* TABS */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'points' && styles.tabActive]}
              onPress={() => setActiveTab('points')}
            >
              <Text
                style={[styles.tabValue, activeTab === 'points' && styles.tabValueActive]}
              >
                {pointsBalance.toLocaleString()}
              </Text>
              <Text style={styles.tabLabel}>Available Points</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'tier' && styles.tabActive]}
              onPress={() => setActiveTab('tier')}
            >
              <Text
                style={[styles.tabValue, activeTab === 'tier' && styles.tabValueActive]}
              >
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
              {/* Exclusive Offers Slider */}
              <OffersSlider
                offers={offers}
                loading={offersLoading}
                onSelectOffer={(offer) => {
                  if (pointsBalance >= offer.pointsCost) {
                    setSelectedRedeemOffer(offer);
                    router.push('/spend-points');
                  } else {
                    Alert.alert('Insufficient Points', 'You do not have enough points to redeem this offer.');
                  }
                }}
              />

              {/* Recent Activity */}
              <View style={styles.section}>
                <View style={styles.activityHeader}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                  <TouchableOpacity onPress={fetchData}>
                    <Feather
                      name="refresh-cw"
                      size={16}
                      color={loading ? '#ccc' : '#d81b60'}
                    />
                  </TouchableOpacity>
                </View>

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
                      const isConfirmed = ['success', 'confirmed'].includes(
                        tx.paymentStatus?.toLowerCase()
                      );

                      return (
                        <View style={styles.transactionCard}>
                          <View
                            style={[
                              styles.txIcon,
                              {
                                backgroundColor: isInvoice ? '#e3f2fd' : '#e8f5e9',
                              },
                            ]}
                          >
                            <Feather
                              name={isInvoice ? 'arrow-up-right' : 'arrow-down-left'}
                              size={20}
                              color={isInvoice ? '#2196f3' : '#4caf50'}
                            />
                          </View>

                          <View style={styles.txContent}>
                            <View style={styles.txHeader}>
                              <Text style={styles.txTitle}>
                                {isInvoice ? 'Earned from Service' : 'Points Purchase'}
                              </Text>
                              <Text style={styles.txPoints}>
                                +{tx.points.toLocaleString()} pts
                              </Text>
                            </View>
                            <Text style={styles.txTxId}>{tx.transactionId}</Text>
                            <View style={styles.txFooter}>
                              <Text style={styles.txDate}>
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
                                      color: isConfirmed ? '#4caf50' : '#ff9800',
                                    },
                                  ]}
                                >
                                  {tx.paymentStatus}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.txRight}>
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
              {/* Tier Progress */}
              <EnhancedTierProgress currentTier={tier} progress={tierProgress} />

              {/* Tier Benefits Card */}
              <View style={styles.section}>
                <View style={styles.benefitsCard}>
                  <View style={styles.benefitsContent}>
                    <Text style={styles.benefitsTitle}>Tier Benefits</Text>
                    <Text style={styles.benefitsDesc}>
                      Enjoy exclusive rewards and priority services as a {tier} member.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.benefitsButton}
                    onPress={() => router.push('/tier-details')}
                  >
                    <Text style={styles.benefitsButtonText}>View All Benefits</Text>
                    <Feather name="chevron-right" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* How to Earn Points */}
              <HowToEarnPoints limit={5} />
            </View>
          )}
        </ScrollView>
      )}

      {/* Redeem Modal Overlay */}
      {selectedRedeemOffer && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedRedeemOffer(null)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRedeemOffer.title}</Text>
              <TouchableOpacity onPress={() => setSelectedRedeemOffer(null)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedRedeemOffer.desc && (
              <Text style={styles.modalDesc}>{selectedRedeemOffer.desc}</Text>
            )}

            <View style={styles.modalCostBox}>
              <Text style={styles.modalCostLabel}>Redemption Cost</Text>
              <Text style={styles.modalCostValue}>
                {selectedRedeemOffer.pointsCost.toLocaleString()} Points
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedRedeemOffer(null)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalClaimButton,
                  pointsBalance < selectedRedeemOffer.pointsCost && styles.modalClaimButtonDisabled,
                ]}
                disabled={pointsBalance < selectedRedeemOffer.pointsCost}
                onPress={() => {
                  setSelectedRedeemOffer(null);
                  router.push('/spend-points');
                }}
              >
                <Text style={styles.modalClaimText}>Claim Offer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    backgroundColor: '#fff',
    marginBottom: 4,
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
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    borderRadius: 12,
    alignItems: 'flex-start',
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
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  txPoints: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d81b60',
  },
  txTxId: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  txFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txDate: {
    fontSize: 11,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  benefitsCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  benefitsContent: {
    marginBottom: 12,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  benefitsDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  benefitsButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  benefitsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d81b60',
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    zIndex: 1001,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  modalDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalCostBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffe0e6',
  },
  modalCostLabel: {
    fontSize: 10,
    color: '#d81b60',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalCostValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d81b60',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCloseButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  modalClaimButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    alignItems: 'center',
  },
  modalClaimButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalClaimText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
