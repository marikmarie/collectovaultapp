import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { customerService } from '@/src/api/customer';
import storage from '@/src/utils/storage';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  photo: string;
  is_product: number;
  is_price_fixed: number;
}

interface ServicesListProps {
  limit?: number;
}

export default function ServicesList({ limit = 5 }: ServicesListProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [photosBaseUrl, setPhotosBaseUrl] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const vaultOTPToken = await storage.getItem('vaultOtpToken') || undefined;
      const collectoId = await storage.getItem('collectoId') || undefined;

      const res = await customerService.getServices(
        vaultOTPToken,
        collectoId,
        1,
        limit,
      );

      const apiData = res.data?.data;
      const records = (apiData?.records || []).slice(0, limit);
      const baseUrl = apiData?.metadata?.photosUrl || '';

      setPhotosBaseUrl(baseUrl);
      setServices(Array.isArray(records) ? records : []);
    } catch (err) {
      console.warn('Failed to fetch services:', err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Earn Points</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#d81b60" />
        </View>
      </View>
    );
  }

  if (services.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Earn Points</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No services available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>How to Earn Points</Text>
        <TouchableOpacity onPress={fetchServices}>
          <Feather name="refresh-cw" size={16} color="#d81b60" />
        </TouchableOpacity>
      </View>

      <FlatList
        scrollEnabled={false}
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.serviceCard}>
            <View style={styles.photoContainer}>
              {item.photo ? (
                <Image
                  source={{ uri: `${photosBaseUrl}${item.photo}` }}
                  style={styles.photo}
                  defaultSource={require('@/assets/images/icon.png')}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Feather name="image" size={24} color="#999" />
                </View>
              )}
            </View>

            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.serviceCategory}>{item.category}</Text>
              {item.description && (
                <Text style={styles.serviceDesc} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                {item.price.toLocaleString()}
              </Text>
              <Text style={styles.currency}>UGX</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  emptyText: {
    color: '#999',
    fontSize: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 12,
    alignItems: 'center',
  },
  photoContainer: {
    marginRight: 12,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  serviceCategory: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 11,
    color: '#ccc',
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  currency: {
    fontSize: 9,
    color: '#999',
    fontWeight: '500',
  },
});
