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
import { useRouter } from 'expo-router';

interface Benefit {
  id: string | number;
  title?: string;
  detail?: string;
  description?: string;
}

export default function TierDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState('N/A');
  const [tierProgress, setTierProgress] = useState(0);
  const [pointsToNextTier, setPointsToNextTier] = useState(0);
  const [expiryDate, setExpiryDate] = useState('N/A');

  useEffect(() => {
    loadTierDetails();
  }, []);

  const loadTierDetails = async () => {
    try {
      setLoading(true);

      if (user?.clientId) {
        // Fetch customer tier info
        const customerRes = await customerService.getCustomerData(user.clientId);
        const cData = customerRes.data;

        if (cData?.currentTier) {
          setTier(cData.currentTier.name || 'N/A');
          setExpiryDate(
            cData.currentTier.expiryDate
              ? new Date(cData.currentTier.expiryDate).toLocaleDateString()
              : 'N/A',
          );

          // Calculate points to next tier
          if (cData.tiers && cData.tiers.length > 0) {
            const currentIdx = cData.tiers.findIndex((t: any) => t.id === cData.currentTier.id);
            if (currentIdx !== -1 && currentIdx < cData.tiers.length - 1) {
              const nextTier = cData.tiers[currentIdx + 1];
              const pointsNeeded = nextTier.pointsRequired - cData.customer.currentPoints;
              setPointsToNextTier(Math.max(0, pointsNeeded));

              // Calculate progress percentage
              const current = cData.currentTier.pointsRequired || 0;
              const next = nextTier.pointsRequired || 0;
              const userPoints = cData.customer.currentPoints || 0;
              const diff = next - current;
              const earned = userPoints - current;
              setTierProgress(Math.min(100, Math.max(0, (earned / diff) * 100)));
            } else {
              setTierProgress(100);
            }
          }
        }

        // Fetch tier benefits
        try {
          const benefitsRes = await customerService.getTierBenefits(undefined, tier);
          const data = benefitsRes.data?.benefits ?? benefitsRes.data ?? [];
          setBenefits(Array.isArray(data) ? data : []);
        } catch (err) {
          // Use mock benefits if API fails
          setBenefits([
            {
              id: '1',
              title: 'Dedicated Relationship Manager',
              detail: 'Direct line access for priority support.',
            },
            {
              id: '2',
              title: '10% Earning Accelerator',
              detail: 'Bonus points on all purchases.',
            },
            {
              id: '3',
              title: 'Exclusive Upgrade Vouchers',
              detail: 'Complimentary benefits annually.',
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Error loading tier details:', err);
      Alert.alert('Error', 'Failed to load tier details');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>Tier Benefits</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tier Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.tierBadge}>
          <Text style={styles.tierIcon}>👑</Text>
          <View>
            <Text style={styles.tierName}>{tier}</Text>
            <Text style={styles.tierExpiry}>Expires: {expiryDate}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        {tierProgress < 100 && (
          <>
            <Text style={styles.progressLabel}>Progress to Next Tier</Text>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(tierProgress, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.pointsNeeded}>
              {pointsToNextTier.toLocaleString()} points needed
            </Text>
          </>
        )}
        {tierProgress >= 100 && (
          <Text style={styles.maxTierText}>🎉 You have reached the highest tier!</Text>
        )}
      </View>

      {/* Benefits List */}
      <Text style={styles.benefitsTitle}>Your Exclusive Benefits</Text>
      <FlatList
        scrollEnabled={false}
        data={benefits}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Text style={styles.icon}>✨</Text>
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>{item.title || item.description}</Text>
              <Text style={styles.benefitDetail}>{item.detail || ''}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.benefitsList}
      />

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          💡 Keep earning points to unlock the next tier and access even more exclusive benefits!
        </Text>
      </View>
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
  statusCard: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff5f8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffccdd',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  tierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d81b60',
  },
  tierExpiry: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#ddd',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#d81b60',
  },
  pointsNeeded: {
    fontSize: 12,
    color: '#d81b60',
    fontWeight: '600',
  },
  maxTierText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
    textAlign: 'center',
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  benefitsList: {
    paddingHorizontal: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  benefitIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  benefitDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  infoSection: {
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff9e6',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
});
