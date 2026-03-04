import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Offer {
  id: string;
  title: string;
  desc?: string;
  pointsCost: number;
}

interface OffersSliderProps {
  offers: Offer[];
  loading?: boolean;
  onSelectOffer?: (offer: Offer) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64; // Account for padding

export default function OffersSlider({ offers, loading = false, onSelectOffer }: OffersSliderProps) {
  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exclusive Offers</Text>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Loading offers...</Text>
        </View>
      </View>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exclusive Offers</Text>
        <View style={[styles.card, styles.emptyCard]}>
          <Text style={styles.emptyText}>No offers available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Exclusive Offers</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 16}
      >
        {offers.map((offer, idx) => (
          <View key={offer.id} style={{ marginRight: idx === offers.length - 1 ? 0 : 16 }}>
            <View style={[styles.card, { width: CARD_WIDTH }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {offer.title}
                </Text>
              </View>

              {offer.desc && (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {offer.desc}
                </Text>
              )}

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.costLabel}>Points Cost</Text>
                  <Text style={styles.costValue}>
                    {offer.pointsCost.toLocaleString()} pts
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.redeemButton}
                  onPress={() => onSelectOffer?.(offer)}
                >
                  <Feather name="gift" size={14} color="#fff" />
                  <Text style={styles.redeemText}>Redeem</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderStyle: 'dashed',
    borderColor: '#ddd',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    color: '#999',
    fontSize: 12,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cardDesc: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  costLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  costValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#d81b60',
  },
  redeemButton: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  redeemText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
