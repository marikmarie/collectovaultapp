import { StyleSheet, View, Text, ScrollView, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Gift } from 'lucide-react-native';
import { customerService } from '@/lib/customerService';

interface Offer {
  id: string;
  title: string;
  desc?: string;
  pointsCost: number;
}

const DUMMY_OFFERS: Offer[] = [
  { id: '1', title: '10% Discount', desc: 'Next purchase', pointsCost: 500 },
  { id: '2', title: 'Free Concert Ticket', desc: 'Local event', pointsCost: 250 },
  { id: '3', title: 'Member Offer', desc: 'Exclusive', pointsCost: 1000 },
];

export default function SpendPointsScreen() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState(DUMMY_OFFERS);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await customerService.getRedeemableOffers();
      setOffers(res.data?.offers || DUMMY_OFFERS);
    } catch {
      setOffers(DUMMY_OFFERS);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!selectedOffer) return;

    setRedeeming(true);
    try {
      console.log('Redeeming:', selectedOffer);
      setMessage({
        type: 'success',
        text: `Successfully redeemed ${selectedOffer.title}!`,
      });
      setSelectedOffer(null);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Redemption failed',
      });
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#d81b60" />
          <Text style={styles.loadingText}>Loading offers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Gift size={32} color="#d81b60" />
          <Text style={styles.title}>Spend Points</Text>
          <Text style={styles.subtitle}>Redeem your points for amazing rewards</Text>
        </View>

        {/* Message Alert */}
        {message && (
          <View
            style={[
              styles.messageAlert,
              message.type === 'success' ? styles.successAlert : styles.errorAlert,
            ]}
          >
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        )}

        {/* Offers List */}
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedOffer(item)}
              style={[
                styles.offerCard,
                selectedOffer?.id === item.id && styles.offerCardSelected,
              ]}
            >
              <View style={styles.offerContent}>
                <Text style={styles.offerTitle}>{item.title}</Text>
                {item.desc && <Text style={styles.offerDesc}>{item.desc}</Text>}
              </View>
              <Text style={styles.offerPoints}>{item.pointsCost} pts</Text>
            </Pressable>
          )}
        />

        {/* Redeem Button */}
        {selectedOffer && (
          <Pressable
            style={[styles.redeemButton, redeeming && styles.redeemButtonDisabled]}
            onPress={handleRedeem}
            disabled={redeeming}
          >
            {redeeming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.redeemButtonText}>
                Redeem for {selectedOffer.pointsCost} Points
              </Text>
            )}
          </Pressable>
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
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  messageAlert: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successAlert: {
    backgroundColor: '#e8f5e9',
  },
  errorAlert: {
    backgroundColor: '#ffebee',
  },
  messageText: {
    color: '#333',
    fontSize: 14,
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
  },
  offerCardSelected: {
    borderColor: '#d81b60',
    backgroundColor: '#fff5f8',
  },
  offerContent: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  offerDesc: {
    fontSize: 12,
    color: '#999',
  },
  offerPoints: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff9800',
    marginLeft: 12,
  },
  redeemButton: {
    backgroundColor: '#d81b60',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  redeemButtonDisabled: {
    opacity: 0.6,
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
