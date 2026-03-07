import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { customerService } from '@/src/api/customer';
import { useRouter } from 'expo-router';
import storage from '@/src/utils/storage';

interface Service {
  id: string;
  name: string;
  amount: number;
  photo: string;
  description: string;
  category: string;
  isProduct?: boolean;
}

export default function ServicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [page, setPage] = useState(1);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const vaultOTPToken = (await storage.getItem('vaultOtpToken')) || undefined;
      const collectoId = (await storage.getItem('collectoId')) || undefined;

      const response = await customerService.getServices(
        vaultOTPToken,
        collectoId,
        page,
        20,
      );

      const payload = response.data?.data;
      const innerData = payload?.data;
      const records = innerData?.records || [];

      const mappedServices: Service[] = records.map((item: any) => ({
        id: item.id,
        name: item.name,
        amount: item.price,
        photo: item.photo,
        description: item.description,
        category: item.category || 'General',
        isProduct: Boolean(item.is_product),
      }));

      setServices(mappedServices);

      // Extract unique categories
      const categorySet = new Set(['All']);
      mappedServices.forEach((s: Service) => {
        if (s.category) categorySet.add(s.category);
      });
      setCategories(Array.from(categorySet));
    } catch (err) {
      console.error('Error fetching services:', err);
      Alert.alert('Error', 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    let result = services;
    if (selectedCategory !== 'All') {
      result = result.filter((s) => s.category === selectedCategory);
    }
    if (searchQuery) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    setFilteredServices(result);
  }, [searchQuery, selectedCategory, services]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServices().finally(() => setRefreshing(false));
  }, [fetchServices]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d81b60" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left','right','bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Services List */}
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        renderItem={({ item: service }) => (
          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() => {
              Alert.alert(
                service.name,
                `${service.description}\n\nPrice: ${service.amount.toLocaleString()} UGX`,
              );
            }}
          >
            {service.photo ? (
              <Image
                source={{ uri: service.photo }}
                style={styles.serviceImage}
                defaultSource={require('@/assets/images/logo.png')}
              />
            ) : (
              <View style={[styles.serviceImage, styles.servicePlaceholder]}>
                <Text style={styles.placeholderIcon}>🛍️</Text>
              </View>
            )}

            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={2}>
                {service.name}
              </Text>
              <Text style={styles.serviceDescription} numberOfLines={2}>
                {service.description}
              </Text>
              <View style={styles.serviceFooter}>
                <Text style={styles.servicePrice}>
                  {service.amount.toLocaleString()} UGX
                </Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{service.category}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No services found</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d81b60" />
        }
        contentContainerStyle={styles.listContent}
        numColumns={2}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#eee',
  },
  categoryScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryChipActive: {
    backgroundColor: '#d81b60',
    borderColor: '#d81b60',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 100,
  },
  serviceCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 2,
  },
  serviceImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#f5f5f5',
  },
  servicePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  serviceInfo: {
    padding: 12,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d81b60',
  },
  categoryBadge: {
    backgroundColor: '#f0edee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#d81b60',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});
