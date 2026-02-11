import { StyleSheet, View, Text, ScrollView, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Award, TrendingUp } from 'lucide-react-native';
import { customerService } from '@/lib/customerService';

interface Tier {
  id: number;
  name: string;
  pointsRequired: number;
  benefits: string[];
}

interface TierData {
  currentTier: Tier;
  allTiers: Tier[];
  pointsBalance: number;
}

const DUMMY_TIERS: Tier[] = [
  {
    id: 1,
    name: 'Bronze',
    pointsRequired: 0,
    benefits: ['10% discount', 'Birthday bonus', 'Member exclusive'],
  },
  {
    id: 2,
    name: 'Silver',
    pointsRequired: 1000,
    benefits: ['15% discount', 'Free shipping', 'Priority support'],
  },
  {
    id: 3,
    name: 'Gold',
    pointsRequired: 5000,
    benefits: ['20% discount', 'VIP access', 'Dedicated support'],
  },
];

export default function TierDetailsScreen() {
  const [loading, setLoading] = useState(true);
  const [tierData, setTierData] = useState<TierData>({
    currentTier: DUMMY_TIERS[0],
    allTiers: DUMMY_TIERS,
    pointsBalance: 0,
  });

  useEffect(() => {
    fetchTierInfo();
  }, []);

  const fetchTierInfo = async () => {
    try {
      setLoading(true);
      const res = await customerService.getCustomerData('test-id');
      const cData = res.data;

      if (cData) {
        setTierData({
          currentTier: cData.currentTier || DUMMY_TIERS[0],
          allTiers: cData.tiers || DUMMY_TIERS,
          pointsBalance: cData.customer?.currentPoints || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load tier info:', err);
      setTierData({
        currentTier: DUMMY_TIERS[0],
        allTiers: DUMMY_TIERS,
        pointsBalance: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const getNextTier = () => {
    const currentIdx = tierData.allTiers.findIndex((t) => t.id === tierData.currentTier.id);
    return currentIdx !== -1 && currentIdx < tierData.allTiers.length - 1
      ? tierData.allTiers[currentIdx + 1]
      : null;
  };

  const getProgressToNextTier = () => {
    const nextTier = getNextTier();
    if (!nextTier) return 100;

    const diff = nextTier.pointsRequired - tierData.currentTier.pointsRequired;
    const earned = tierData.pointsBalance - tierData.currentTier.pointsRequired;
    return Math.min(100, Math.max(0, (earned / diff) * 100));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#d81b60" />
          <Text style={styles.loadingText}>Loading tier info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const nextTier = getNextTier();
  const progress = getProgressToNextTier();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        {/* Current Tier Section */}
        <View style={styles.currentTierCard}>
          <View style={styles.currentTierContent}>
            <Award size={40} color="#ffa727" />
            <View style={styles.currentTierText}>
              <Text style={styles.currentTierLabel}>Current Tier</Text>
              <Text style={styles.tierName}>{tierData.currentTier.name}</Text>
            </View>
          </View>
        </View>

        {/* Points Info */}
        <View style={styles.pointsContainer}>
          <View style={styles.pointsCard}>
            <Text style={styles.pointsLabel}>Points Balance</Text>
            <Text style={styles.pointsValue}>{tierData.pointsBalance}</Text>
          </View>
          <View style={styles.pointsCard}>
            <Text style={styles.pointsLabel}>Required for tier</Text>
            <Text style={styles.pointsValue}>{tierData.currentTier.pointsRequired}</Text>
          </View>
        </View>

        {/* Progress to Next Tier */}
        {nextTier && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress to {nextTier.name}</Text>
              <Text style={styles.progressPercent}>{progress.toFixed(0)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressPoints}>
                {nextTier.pointsRequired - tierData.pointsBalance} points to go
              </Text>
            </View>
          </View>
        )}

        {/* Current Tier Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>{tierData.currentTier.name} Benefits</Text>
          {tierData.currentTier.benefits.map((benefit, idx) => (
            <View key={idx} style={styles.benefitItem}>
              <TrendingUp size={16} color="#4caf50" style={{ marginRight: 12 }} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* All Tiers */}
        <Text style={styles.allTiersTitle}>All Tiers</Text>
        <FlatList
          data={tierData.allTiers}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View
              style={[
                styles.tierCard,
                item.id === tierData.currentTier.id && styles.tierCardActive,
              ]}
            >
              <View style={styles.tierHeader}>
                <View>
                  <Text style={styles.tierCardName}>{item.name}</Text>
                  <Text style={styles.tierPoints}>{item.pointsRequired} points required</Text>
                </View>
                {item.id === tierData.currentTier.id && (
                  <Text style={styles.currentBadge}>Current</Text>
                )}
              </View>
            </View>
          )}
        />
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
    padding: 16,
  },
  currentTierCard: {
    backgroundColor: '#fff5f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  currentTierContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  currentTierText: {
    flex: 1,
  },
  currentTierLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  pointsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  pointsCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  pointsLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d81b60',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d81b60',
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
  progressFooter: {
    alignItems: 'center',
  },
  progressPoints: {
    fontSize: 12,
    color: '#666',
  },
  benefitsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  allTiersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tierCardActive: {
    backgroundColor: '#fff5f8',
    borderWidth: 2,
    borderColor: '#d81b60',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tierPoints: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  currentBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d81b60',
    backgroundColor: '#ffe0eb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
