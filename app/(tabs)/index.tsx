import SetUsernameModal from '../../components/SetUsernameModal';
import storage from '@/src/utils/storage';
import BuyPointsModal from '@/components/BuyPointsModal';
import DashboardHeader from '@/components/DashboardHeader';
import { transactionService } from '@/src/api/collecto';
import { customerService } from '@/src/api/customer';
import { useAuth } from '@/src/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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


import { StatusBar } from 'expo-status-bar';
import AddCashModal from '../../components/AddCashModal';
import TransferCashModal from '../../components/TransferCashModal';
import { authService } from '@/src/api/authService';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [pointsBalance, setPointsBalance] = useState(0);
  const [tier, setTier] = useState('N/A');
  const [tierProgress, setTierProgress] = useState(0);
  const [loyaltyName, setLoyaltyName] = useState<string | undefined>();

  const [walletAmount, setWalletAmount] = useState<number | null>(null);
  const [ugxPerPoint, setUgxPerPoint] = useState<number>(0);
  const [showWalletAmount, setShowWalletAmount] = useState(true);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [boughtPoints, setBoughtPoints] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [buyPointsModalVisible, setBuyPointsModalVisible] = useState(false);
  const [addCashModalVisible, setAddCashModalVisible] = useState(false);
  const [transferCashModalVisible, setTransferCashModalVisible] = useState(false);

  const [clientId, setClientId] = useState(user?.clientId || '');
  const [collectoId, setCollectoId] = useState(user?.collectoId || '');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [username, setUsername] = useState(user?.userName || '');

  const fetchData = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      // Fetch customer profile
      const customerRes = await customerService.getCustomerData(collectoId, clientId);
      console.log('Customer Data:', customerRes.data);
      const loyaltySettings = customerRes.data?.data?.loyaltySettings ?? {};

      const loyaltyNameFromSettings =
        typeof loyaltySettings?.name === 'string' && loyaltySettings.name.trim()
          ? loyaltySettings.name.trim()
          : undefined;
      setLoyaltyName(loyaltyNameFromSettings);

      const earned = loyaltySettings?.loyalty_points?.earned ?? 0;
      const bought = loyaltySettings?.loyalty_points?.bought ?? 0;
      const points = loyaltySettings?.points ?? earned + bought;

      setPointsBalance(points || 0);
      setEarnedPoints(earned);
      setBoughtPoints(bought);

      const tierName =
        loyaltySettings?.tier ||
        loyaltySettings?.tierName ||
        loyaltySettings?.membershipTier ||
        'N/A';
      setTier(tierName);

      const tierProgressValue =
        typeof loyaltySettings?.tier_progress === 'number'
          ? loyaltySettings.tier_progress
          : typeof loyaltySettings?.tierProgress === 'number'
          ? loyaltySettings.tierProgress
          : 0;
      setTierProgress(tierProgressValue);

      const pointValue =
        loyaltySettings?.point_value ?? loyaltySettings?.pointValue ?? null;
      const perPoint =
        typeof pointValue === 'number' && points > 0 ? pointValue / points : 0;
      setUgxPerPoint(perPoint);
      setWalletAmount(perPoint > 0 ? Math.round(points * perPoint) : null);

      const txRes = await transactionService.getTransactions(clientId, 10, 0);
      const txs = txRes.data?.data?.data ?? txRes.data?.transactions ?? [];
      setTransactions(Array.isArray(txs) ? txs : []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    // Fetch IDs from storage if not in context
    const fetchIds = async () => {
      if (!clientId) {
        const storedClientId = await storage.getItem('clientId');
        if (storedClientId) setClientId(storedClientId);
      }
      if (!collectoId) {
        const storedCollectoId = await storage.getItem('collectoId');
        if (storedCollectoId) setCollectoId(storedCollectoId);
      }
      if (!username) {
        const storedUsername = await storage.getItem('userName');
        if (storedUsername) setUsername(storedUsername);
      }
    };
    fetchIds();
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#fff" />
      <SetUsernameModal
        visible={showProfileModal}
        username={username}
        onClose={() => setShowProfileModal(false)}
        onSave={async (newUsername: string) => {
          if (!clientId || !collectoId) return;
          try {
            await authService.setUsername(clientId, collectoId, newUsername, { clientId, username: newUsername, collectoId });
            setUsername(newUsername);
            await storage.setItem('userName', newUsername);
            setShowProfileModal(false);
          } catch (err) {
            Alert.alert('Error', 'Failed to update username');
          }
        }}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d81b60" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d81b60" />
          }
        >
          {/* Header */}
          <DashboardHeader
            name={loyaltyName ?? username ?? undefined}
            onProfilePress={() => setShowProfileModal(true)}
          />

          {/* Wallet Summary */}
          <LinearGradient
            colors={["#d81b60", "#8f0a43", "#f06292"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            <View style={styles.walletCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.walletCardTitle}>Cash Balance</Text>
                <TouchableOpacity
                  onPress={() => setShowWalletAmount((v) => !v)}
                  style={{ marginLeft: 8 }}
                >
                  <Feather
                    name={showWalletAmount ? 'eye' : 'eye-off'}
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.walletAmountText}>
              {showWalletAmount
                ? walletAmount !== null
                  ? `UGX ${walletAmount.toLocaleString()}`
                  : '—'
                : '••••••'}
            </Text>
      
            <View style={styles.walletStatsRow}>
              <View style={styles.walletStat}>
                <Text style={styles.walletStatLabel}>Earned Points</Text>
                <Text style={styles.walletStatValue}>
                  {earnedPoints.toLocaleString()} pts
                </Text>
              </View>
              <View style={styles.walletStat}>
                <Text style={styles.walletStatLabel}>Bought Points</Text>
                <Text style={styles.walletStatValue}>
                  {boughtPoints.toLocaleString()} pts
                </Text>
              </View>
              <View style={styles.walletStat}>
                <Text style={styles.walletStatLabel}>Total Points</Text>
                <Text style={styles.walletStatValue}>
                  {(earnedPoints + boughtPoints).toLocaleString()} pts
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* ACTIONS */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setAddCashModalVisible(true)}
            >
              <View style={styles.actionButtonContent}>
                <Feather name="plus-circle" size={16} color="#d81b60" />
                <Text style={styles.actionButtonText}>Add Cash</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setTransferCashModalVisible(true)}
            >
              <View style={styles.actionButtonContent}>
                <Feather name="send" size={16} color="#d81b60" />
                <Text style={styles.actionButtonText}>Transfer Cash</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setBuyPointsModalVisible(true)}
            >
              <View style={styles.actionButtonContent}>
                <Feather name="shopping-cart" size={16} color="#d81b60" />
                <Text style={styles.actionButtonText}>Buy Points</Text>
              </View>
            </TouchableOpacity>
          </View>

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
              <>
                {transactions.slice(0, 3).map((tx) => {
                  const isInvoice = tx.reference === 'INVOICE_PURCHASE';
                  const isConfirmed = ['success', 'confirmed'].includes(
                    tx.paymentStatus?.toLowerCase()
                  );
                  return (
                    <View key={tx.id} style={styles.transactionCard}>
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
                })}

                {transactions.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => router.push('/statement')}
                  >
                    <Text style={styles.viewAllText}>View All Transactions</Text>
                    <Feather name="chevron-right" size={14} color="#d81b60" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Buy Points Modal */}
      <BuyPointsModal
        visible={buyPointsModalVisible}
        onClose={() => {
          setBuyPointsModalVisible(false);
        }}
        onSuccess={() => {
          fetchData();
        }}
      />

      <AddCashModal
        visible={addCashModalVisible}
        onClose={() => {
          setAddCashModalVisible(false);
        }}
        onSuccess={() => {
          fetchData();
        }}
      />

      <TransferCashModal
        visible={transferCashModalVisible}
        onClose={() => {
          setTransferCashModalVisible(false);
        }}
        onSuccess={() => {
          fetchData();
        }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  walletCard: {
    margin: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#d81b60',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  walletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  walletCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  walletCardSubtitle: {
    fontSize: 12,
    color: '#ffe6f1',
    marginTop: 2,
  },
  walletAmountText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  walletSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 12,
  },
  walletStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  walletStat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  walletStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  walletStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  viewAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d81b60',
    marginRight: 6,
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
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: '#d81b60',
    borderColor: '#d81b60',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
