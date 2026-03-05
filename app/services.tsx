import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Modal,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { customerService } from '@/src/api/customer';
import storage from '@/src/utils/storage';
import { useRouter } from 'expo-router';
import { invoiceService } from '@/src/api/collecto';

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

  // cart states
  interface CartItem {
    id: string;
    name: string;
    unitAmount: number;
    quantity: number;
    photo?: string;
    category?: string;
    isProduct?: boolean;
  }
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);

  // service detail modal
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // category dropdown modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [qty, setQty] = useState(1);

  const cartCount = cart.length;
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0),
    [cart]
  );

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const vaultOTPToken = await storage.getItem('vaultOtpToken') || undefined;
      const collectoId = await storage.getItem('collectoId') || undefined;

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

  // cart helpers
  const addToCart = (s: Service) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === s.id);
      if (existing) {
        return prev.map(c =>
          c.id === s.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          id: s.id,
          name: s.name,
          unitAmount: s.amount,
          quantity: 1,
          photo: s.photo,
          category: s.category,
          isProduct: s.isProduct,
        },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart(prev =>
      prev.map(c =>
        c.id === id ? { ...c, quantity: Math.max(1, quantity) } : c,
      ),
    );
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart is empty');
      return;
    }
    setOrderLoading(true);
    try {
      const collectoId = await storage.getItem('collectoId') || '';
      const clientId = user?.clientId || '';
      if (!clientId) {
        Alert.alert('Customer ID missing');
        setOrderLoading(false);
        return;
      }
      const payload: any = {
        vaultOTPToken: await storage.getItem('vaultOtpToken') || undefined,
        collectoId,
        clientId,
        staffId,
        totalAmount: Number(cartTotal),
        items: cart.map(c => ({
          serviceId: c.id,
          serviceName: c.name,
          quantity: c.quantity,
          totalAmount: Number(c.unitAmount * c.quantity),
        })),
      };
      const response = await invoiceService.createInvoice(payload);
      const invoiceId = response.data?.data?.invoiceId;
      if (invoiceId) {
        Alert.alert('Order placed', `Invoice ${invoiceId}`);
        setCart([]);
        setCartOpen(false);
        setTimeout(() => {
          router.push('/statement');
        }, 500);
      } else {
        Alert.alert('Order failed', 'No invoice ID returned');
      }
    } catch (err: any) {
      console.error('Place order failed', err);
      Alert.alert('Order error', err.message || 'Failed to place order');
    } finally {
      setOrderLoading(false);
    }
  };

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
        <TouchableOpacity style={styles.cartButtonContainer} onPress={() => setCartOpen(true)}>
          <Feather name="shopping-cart" size={24} color="#333" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search & Category */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowCategoryModal(true)}>
          <Text style={styles.filterButtonText}>Filter: {selectedCategory}</Text>
          <Feather name="chevron-down" size={14} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Category dropdown modal */}
      <Modal transparent visible={showCategoryModal} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCategoryModal(false)} />
        <View style={styles.modalContent}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={styles.modalItem}
              onPress={() => {
                setSelectedCategory(cat);
                setShowCategoryModal(false);
              }}
            >
              <Text style={styles.modalItemText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Services List */}
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const cartItem = cart.find(c => c.id === item.id);
          const qty = cartItem?.quantity || 0;
          return (
            <TouchableOpacity
              style={styles.serviceCard}
              onPress={() => {
                setSelectedService(item);
                setDetailOpen(true);
              }}
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
              <View style={styles.qtyContainer}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => {
                    if (qty > 1) updateQuantity(item.id, qty - 1);
                    else if (qty === 1) removeFromCart(item.id);
                  }}
                >
                  <Text style={styles.qtyButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{qty}</Text>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => addToCart(item)}
                >
                  <Text style={styles.qtyButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No services found</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      />

      {/* Detail Modal */}
      <Modal transparent visible={detailOpen} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setDetailOpen(false)} />
        <View style={styles.detailModalContent}>
          {selectedService && (
            <>
              <Text style={styles.detailTitle}>{selectedService.name}</Text>
              <Text style={styles.detailCategory}>{selectedService.category}</Text>
              <Text style={styles.detailDesc}>{selectedService.description}</Text>
              <Text style={styles.detailPrice}>UGX {selectedService.amount.toLocaleString()}</Text>
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.detailAddBtn}
                  onPress={() => {
                    addToCart(selectedService);
                    Alert.alert('Added to cart');
                    setDetailOpen(false);
                  }}
                >
                  <Text style={styles.detailAddText}>Add to Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.detailCloseBtn}
                  onPress={() => setDetailOpen(false)}
                >
                  <Text style={styles.detailCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Cart Modal */}
      <Modal transparent visible={cartOpen} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setCartOpen(false)} />
        <View style={styles.cartModalContent}>
          <Text style={styles.cartModalTitle}>Your Cart</Text>
          <Text style={styles.cartModalSubtitle}>{cart.length} items - UGX {cartTotal.toLocaleString()}</Text>
          <FlatList
            data={cart}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <Text style={styles.cartItemName}>{item.name} ({item.quantity})</Text>
                <Text style={styles.cartItemPrice}>UGX {(item.unitAmount * item.quantity).toLocaleString()}</Text>
                <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                  <Text style={styles.cartItemRemove}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
            style={{ maxHeight: 200 }}
          />
          <TextInput
            style={styles.staffInput}
            placeholder="Staff ID"
            value={staffId}
            onChangeText={setStaffId}
          />
          <View style={styles.cartActions}>
            <TouchableOpacity
              style={styles.placeOrderBtn}
              onPress={handlePlaceOrder}
              disabled={orderLoading}
            >
              <Text style={styles.placeOrderText}>{orderLoading ? 'Placing...' : 'Place Order'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCartOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  cartButtonContainer: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#d81b60',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 12,
    gap: 8,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 16,
    maxHeight: '50%',
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  modalItemTextActive: {
    color: '#d81b60',
    fontWeight: '700',
  },
  detailModalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  detailCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d81b60',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  detailPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#d81b60',
    marginBottom: 16,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailAddBtn: {
    flex: 1,
    backgroundColor: '#d81b60',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailAddText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  detailCloseBtn: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailCloseText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  qtyButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d81b60',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 40,
    textAlign: 'center',
  },
  cartModalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  cartModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cartModalSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  cartItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d81b60',
    marginRight: 8,
  },
  cartItemRemove: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d81b60',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  staffInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 12,
    fontSize: 13,
    color: '#1a1a1a',
  },
  cartActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  placeOrderBtn: {
    flex: 1,
    backgroundColor: '#d81b60',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeOrderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
});
