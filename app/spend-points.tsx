import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { customerService } from '@/src/api/customer';
import { transactionService } from '@/src/api/collecto';
import { useRouter } from 'expo-router';

interface Offer {
  id: string | number;
  title?: string;
  name?: string;
  desc?: string;
  detail?: string;
  pointsCost?: number;
}

export default function SpendPointsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | number | null>(null);
  const [currentPoints, setCurrentPoints] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch current points
      if (user?.clientId) {
        const customerRes = await customerService.getCustomerData(user.clientId);
        setCurrentPoints(customerRes.data?.customer?.currentPoints || 0);
      }

      // Fetch offers
      const offersRes = await customerService.getRedeemableOffers();
      const data = offersRes.data?.offers ?? offersRes.data ?? [];
      setOffers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading data:', err);
      Alert.alert('Error', 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (offer: Offer) => {
    const offerId = offer.id;
    const pointsCost = offer.pointsCost ?? (offer as any).points ?? (offer as any).cost ?? 0;

    if (currentPoints < pointsCost) {
      Alert.alert('Insufficient Points', `You need ${pointsCost} points, but only have ${currentPoints}`);
      return;
    }

    Alert.alert(
      'Confirm Redeem',
      `Spend ${pointsCost} points for ${offer.title || offer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setRedeemingId(offerId);
            try {
              await transactionService.redeemPoints(user?.clientId || 'me', {
                offerId: String(offerId),
              });
              Alert.alert(
                'Success',
                `Redeemed ${pointsCost} points for ${offer.title || offer.name}!`,
              );
              loadData(); // Refresh to update points
            } catch (err: any) {
              const msg = err?.message || err?.response?.data?.message || 'Failed to redeem';
              Alert.alert('Error', msg);
            } finally {
              setRedeemingId(null);
            }
          },
        },
      ],
    );
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
        <Text style={styles.headerTitle}>Redeem Points</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Points Balance */}
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceValue}>{currentPoints.toLocaleString()}</Text>
        <Text style={styles.balanceUnit}>Points</Text>
      </View>

      {/* Offers List */}
      <FlatList
        data={offers}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const pointsCost = item.pointsCost ?? (item as any).points ?? (item as any).cost ?? 0;
          const title = item.title ?? item.name ?? 'Offer';
          const desc = item.desc ?? item.detail ?? '';
          const canRedeem = currentPoints >= pointsCost;
          const isRedeeming = redeemingId === item.id;

          return (
            <View style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <Text style={styles.offerTitle}>{title}</Text>
                <Text style={[styles.offerPointsBadge, { opacity: canRedeem ? 1 : 0.5 }]}>
                  {pointsCost} pts
                </Text>
              </View>

              {desc && (
                <Text style={styles.offerDesc}>{desc}</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.redeemButton,
                  !canRedeem && styles.redeemButtonDisabled,
                ]}
                onPress={() => handleRedeem(item)}
                disabled={!canRedeem || isRedeeming}
              >
                <Text style={styles.redeemButtonText}>
                  {isRedeeming ? 'Processing...' : 'Redeem Now'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No redeemable offers available</Text>
          </View>
        }
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
  balanceContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d81b60',
    marginTop: 4,
  },
  balanceUnit: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  offerCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  offerPointsBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d81b60',
    backgroundColor: '#ffe0ec',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  offerDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    lineHeight: 16,
  },
  redeemButton: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    alignItems: 'center',
  },
  redeemButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  redeemButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
