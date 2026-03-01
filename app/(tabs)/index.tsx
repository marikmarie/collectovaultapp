import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { customerService } from '@/src/api/customer';
import { transactionService } from '@/src/api/collecto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link } from 'expo-router';

interface RedeemableOffer {
  id: string;
  title: string;
  desc?: string;
  pointsCost: number;
}

const DUMMY_OFFERS: RedeemableOffer[] = [
  { id: 'offer_1', title: '10% Discount', desc: 'Get 10% off your next purchase', pointsCost: 500 },
  { id: 'offer_2', title: 'Free Concert Ticket', desc: 'Redeem for a free ticket', pointsCost: 250 },
  { id: 'offer_3', title: 'Exclusive Member Offer', desc: 'Special discount available', pointsCost: 1000 },
];

type TabType = 'points' | 'tier';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('tier');
  const [pointsBalance, setPointsBalance] = useState(0);
  const [tier, setTier] = useState('N/A');
  const [tierProgress, setTierProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemableOffers, setRedeemableOffers] = useState<RedeemableOffer[]>(DUMMY_OFFERS);
  const [userName, setUserName] = useState('');

  const fetchDashboardData = useCallback(async () => {
    if (!user?.clientId) return;
    
    setLoading(true);
    try {
      const clientId = user.clientId;
      
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

      // Fetch redeemable offers
      try {
        const offersRes = await customerService.getRedeemableOffers();
        const offers = offersRes.data?.offers ?? offersRes.data ?? [];
        setRedeemableOffers(Array.isArray(offers) && offers.length > 0 ? offers : DUMMY_OFFERS);
      } catch (err) {
        setRedeemableOffers(DUMMY_OFFERS);
      }

      // Get stored user name
      const storedName = await AsyncStorage.getItem('userName');
      setUserName(storedName || 'User');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.clientId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setRefreshing(false));
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (err) {
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeLabel}>Welcome back</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switch */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'points' && styles.tabActive]}
            onPress={() => setActiveTab('points')}
          >
            <Text style={[styles.tabNumber, activeTab === 'points' && styles.tabNumberActive]}>
              {pointsBalance.toLocaleString()}
            </Text>
            <Text style={[styles.tabLabel, activeTab === 'points' && styles.tabLabelActive]}>
              Available Points
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'tier' && styles.tabActive]}
            onPress={() => setActiveTab('tier')}
          >
            <Text style={[styles.tabNumber, activeTab === 'tier' && styles.tabNumberActive]}>
              {tier}
            </Text>
            <Text style={[styles.tabLabel, activeTab === 'tier' && styles.tabLabelActive]}>
              Current Tier
            </Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {activeTab === 'points' && (
            <>
              <Link href="/spend-points" asChild>
                <TouchableOpacity style={styles.actionButtonSecondary}>
                  <Text style={styles.actionButtonText}>Spend</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/buy-points" asChild>
                <TouchableOpacity style={styles.actionButtonPrimary}>
                  <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                    Buy Points
                  </Text>
                </TouchableOpacity>
              </Link>
            </>
          )}
          {activeTab === 'tier' && (
            <Link href="/tier-details" asChild>
              <TouchableOpacity style={styles.actionButtonPrimary}>
                <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                  View Benefits
                </Text>
              </TouchableOpacity>
            </Link>
          )}
        </View>

        {/* Tier Progress */}
        {activeTab === 'tier' && (
          <View style={styles.tierProgressContainer}>
            <Text style={styles.tierProgressLabel}>Progress to Next Tier</Text>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(tierProgress, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.tierProgressValue}>{Math.round(tierProgress)}%</Text>
          </View>
        )}

        {/* Available Offers */}
        <View style={styles.offersSection}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>
          <FlatList
            scrollEnabled={false}
            data={redeemableOffers}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View key={String(item.id)} style={styles.offerCard}>
                <View style={styles.offerContent}>
                  <Text style={styles.offerTitle}>{item.title}</Text>
                  {item.desc && <Text style={styles.offerDesc}>{item.desc}</Text>}
                </View>
                <Text style={styles.offerPoints}>{item.pointsCost}pts</Text>
              </View>
            )}
          />
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinksContainer}>
          <Link href="/services" asChild>
            <TouchableOpacity style={styles.quickLink}>
              <Text style={styles.quickLinkText}>Services</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/statement" asChild>
            <TouchableOpacity style={styles.quickLink}>
              <Text style={styles.quickLinkText}>Statement</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    paddingBottom: 40,
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
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  welcomeLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffebee',
    borderRadius: 6,
  },
  logoutText: {
    color: '#d81b60',
    fontWeight: '600',
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#d81b60',
  },
  tabNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  tabNumberActive: {
    color: '#d81b60',
  },
  tabLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: '#d81b60',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  actionButtonSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  actionButtonPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0edee',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  actionButtonTextPrimary: {
    color: '#d81b60',
  },
  tierProgressContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tierProgressLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#d81b60',
  },
  tierProgressValue: {
    fontSize: 12,
    color: '#d81b60',
    fontWeight: 'bold',
  },
  offersSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  offerContent: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  offerDesc: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  offerPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d81b60',
  },
  quickLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  quickLink: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  quickLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
});
