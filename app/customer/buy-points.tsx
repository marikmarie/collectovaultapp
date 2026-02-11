import { StyleSheet, View, Text, ScrollView, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { ShoppingCart, Check } from 'lucide-react-native';

interface Package {
  id: number | string;
  points: number;
  price: number;
  name?: string;
  isPopular?: boolean;
}

const DUMMY_PACKAGES: Package[] = [
  { id: 1, points: 100, price: 5, name: 'Starter', isPopular: false },
  { id: 2, points: 500, price: 20, name: 'Standard', isPopular: true },
  { id: 3, points: 1000, price: 35, name: 'Premium', isPopular: false },
  { id: 4, points: 5000, price: 150, name: 'Mega', isPopular: false },
];

export default function BuyPointsScreen() {
  const [packages, setPackages] = useState(DUMMY_PACKAGES);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setPurchasing(true);
    try {
      console.log('Purchasing:', selectedPackage);
      // TODO: Implement purchase logic
    } catch (err) {
      console.error('Purchase failed:', err);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <ShoppingCart size={32} color="#d81b60" />
          <Text style={styles.title}>Buy Points</Text>
          <Text style={styles.subtitle}>Choose a package to get more points</Text>
        </View>

        {/* Packages */}
        <FlatList
          data={packages}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedPackage(item)}
              style={[
                styles.packageCard,
                selectedPackage?.id === item.id && styles.packageCardSelected,
              ]}
            >
              <View style={styles.packageContent}>
                <Text style={styles.packageName}>{item.name || `${item.points} Points`}</Text>
                <Text style={styles.packagePoints}>{item.points} pts</Text>
              </View>
              <View style={styles.packageRight}>
                {item.isPopular && <Text style={styles.popularBadge}>Popular</Text>}
                <Text style={styles.packagePrice}>${item.price}</Text>
              </View>
              {selectedPackage?.id === item.id && <Check size={24} color="#d81b60" />}
            </Pressable>
          )}
        />

        {/* Selected Package Details */}
        {selectedPackage && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Points:</Text>
              <Text style={styles.summaryValue}>{selectedPackage.points}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Price:</Text>
              <Text style={styles.summaryValue}>${selectedPackage.price}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Price per point:</Text>
              <Text style={styles.summaryValue}>
                ${(selectedPackage.price / selectedPackage.points).toFixed(3)}
              </Text>
            </View>
          </View>
        )}

        {/* Purchase Button */}
        {selectedPackage && (
          <Pressable style={styles.purchaseButton} onPress={handlePurchase} disabled={purchasing}>
            <Text style={styles.purchaseButtonText}>
              {purchasing ? 'Processing...' : 'Proceed to Payment'}
            </Text>
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
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
  },
  packageCardSelected: {
    borderColor: '#d81b60',
    backgroundColor: '#fff5f8',
  },
  packageContent: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  packagePoints: {
    fontSize: 12,
    color: '#999',
  },
  packageRight: {
    alignItems: 'flex-end',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d81b60',
  },
  popularBadge: {
    fontSize: 11,
    color: '#ff9800',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  purchaseButton: {
    backgroundColor: '#d81b60',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
