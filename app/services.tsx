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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { customerService } from '@/src/api/customer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

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
      const vaultOTPToken = await AsyncStorage.getItem('vaultOtpToken') || undefined;
      const collectoId = await AsyncStorage.getItem('collectoId') || undefined;

      const response = await customerService.getServices(
        vaultOTPToken,
        collectoId,
        page,
        10,
      );

      const payload = response.data?.data;
      const innerData = payload?.data;
      const records = innerData?.records || [];

      const mappedServices = records.map((item: any) => ({
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
    setPage(1);
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filters */}
      <FlatList
        horizontal
        scrollEnabled
        data={categories}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === item && styles.categoryChipTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.categoryContainer}
      />

      {/* Services List */}
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() => Alert.alert(item.name, item.description)}
          >
            <View style={styles.serviceImagePlaceholder}>
              <Text style={styles.imageText}>📦</Text>
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{item.name}</Text>
              <Text style={styles.serviceDesc} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={styles.serviceCategory}>{item.category}</Text>
            </View>
            <Text style={styles.servicePrice}>{item.amount.toLocaleString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No services found</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryChip: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  serviceCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  serviceImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 12,
  },
  imageText: {
    fontSize: 24,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  serviceDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  serviceCategory: {
    fontSize: 10,
    color: '#d81b60',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d81b60',
    paddingRight: 12,
    textAlign: 'right',
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
