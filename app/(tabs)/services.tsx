import { invoiceService } from '@/src/api/collecto';
import { customerService } from '@/src/api/customer';
import { useAuth } from '@/src/context/AuthContext';
import storage from '@/src/utils/storage';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface Service {
  id: string;
  name: string;
  amount: number;
  photo: string;
  description: string;
  category: string;
  isProduct?: boolean;
}

interface CartItem {
  id: string;
  name: string;
  unitAmount: number;
  quantity: number;
  photo?: string;
  category?: string;
}

export default function ServicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [photosBaseUrl, setPhotosBaseUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(['All']);

  // Cart states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);

  // Service detail modal
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filter dropdown state
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0),
    [cart],
  );

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const vaultOTPToken = (await storage.getItem('vaultOtpToken')) || undefined;
      const collectoId = (await storage.getItem('collectoId')) || undefined;

      const response = await customerService.getServices(vaultOTPToken, collectoId, 1, 100);

      const payload = response.data?.data;
      const innerData = payload?.data;
      const records = innerData?.records || [];
      const baseUrl = innerData?.metadata?.photosUrl || '';

      const mappedServices: Service[] = records.map((item: any) => ({
        id: item.id,
        name: item.name,
        amount: item.price,
        photo: item.photo,
        description: item.description,
        category: item.category || 'General',
        isProduct: Boolean(item.is_product),
      }));

      setPhotosBaseUrl(baseUrl);
      setServices(mappedServices);

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
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Filter services
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

  // Cart helpers
  const addToCart = (s: Service) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === s.id);
      if (existing) {
        return prev.map((c) => (c.id === s.id ? { ...c, quantity: c.quantity + 1 } : c));
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
        },
      ];
    });
    showToast(`${s.name} added to cart`, 'success');
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart((prev) => prev.map((c) => (c.id === id ? { ...c, quantity } : c)));
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }
    setOrderLoading(true);
    try {
      const collectoId = (await storage.getItem('collectoId')) || '';
      const clientId = user?.clientId || '';
      const vaultOTPToken = (await storage.getItem('vaultOtpToken')) || undefined;

      if (!clientId) {
        showToast('Customer ID missing', 'error');
        setOrderLoading(false);
        return;
      }

      const payload = {
        vaultOTPToken,
        collectoId,
        clientId,
        staffId,
        totalAmount: Number(cartTotal),
        items: cart.map((c) => ({
          serviceId: c.id,
          serviceName: c.name,
          quantity: c.quantity,
          totalAmount: Number(c.unitAmount * c.quantity),
        })),
      };

      const response = await invoiceService.createInvoice(payload);
      const invoiceId = response.data?.data?.invoiceId;

      if (invoiceId) {
        showToast(`Order placed! Invoice: ${invoiceId}`, 'success');
        setCart([]);
        setCartOpen(false);
        setTimeout(() => {
          router.push('/statement');
        }, 800);
      } else {
        showToast('Failed to create invoice', 'error');
      }
    } catch (err: any) {
      console.error('Place order failed:', err);
      const errorMsg =
        err?.response?.data?.data?.message || err.message || 'Failed to place order';
      showToast(errorMsg, 'error');
    } finally {
      setOrderLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServices().finally(() => setRefreshing(false));
  }, [fetchServices]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d81b60" />
        <Text style={styles.loadingText}>Fetching services and products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Status Bar ── */}
      <StatusBar style="dark" backgroundColor="#f5f5f5" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services and Products</Text>
        <TouchableOpacity style={styles.pillCartBtn} onPress={() => setCartOpen(true)}>
          <Feather name="shopping-cart" size={16} color="#455A64" />
          <Text style={styles.pillCartTotal}>UGX {cartTotal.toLocaleString()}</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadgeAbsolute}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Search and Filter Row ── */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchWrapperFlexible}>
          <Feather name="search" size={16} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterDropdownBtn}
          onPress={() => setFilterDropdownOpen(true)}
        >
          <Feather name="filter" size={14} color="#666" style={{ marginRight: 6 }} />
          <Text style={styles.filterDropdownText} numberOfLines={1}>
            {selectedCategory}
          </Text>
          <Feather name="chevron-down" size={14} color="#999" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </View>

      {/* ── Filter Dropdown Modal ── */}
      <Modal visible={filterDropdownOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setFilterDropdownOpen(false)}>
          <View style={styles.filterModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.filterModalContent}>
                <View style={styles.filterModalHeader}>
                  <Text style={styles.filterModalTitle}>Select Category</Text>
                  <TouchableOpacity onPress={() => setFilterDropdownOpen(false)}>
                    <Feather name="x" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.filterList}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.filterListItem,
                        selectedCategory === cat && styles.filterListItemActive,
                      ]}
                      onPress={() => {
                        setSelectedCategory(cat);
                        setFilterDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.filterListText,
                          selectedCategory === cat && styles.filterListTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                      {selectedCategory === cat && (
                        <Feather name="check" size={16} color="#d81b60" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Toast (shown when cart is closed) ── */}
      {!cartOpen && toast && (
        <View
          style={[
            styles.toast,
            toast.type === 'success' ? styles.toastSuccess : styles.toastError,
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* ── Services Grid ── */}
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item: service }) => {
          const cartItem = cart.find((c) => c.id === service.id);
          const qty = cartItem?.quantity || 0;

          return (
            <View style={styles.serviceCard}>
              {/* Tap card to see detail */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedService(service);
                  setDetailOpen(true);
                }}
              >
                {service.photo ? (
                  <Image
                    source={{ uri: `${photosBaseUrl}${service.photo}` }}
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
                      <Text style={styles.categoryBadgeText} numberOfLines={1}>
                        {service.category}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Add / Qty controls */}
              <View style={styles.cartControls}>
                {qty === 0 ? (
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => addToCart(service)}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={14} color="#fff" />
                    <Text style={styles.addBtnText}>Add to Cart</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(service.id, qty - 1)}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{qty}</Text>
                    <TouchableOpacity
                      style={[styles.qtyBtn, styles.qtyBtnPlus]}
                      onPress={() => updateQuantity(service.id, qty + 1)}
                    >
                      <Text style={[styles.qtyBtnText, { color: '#fff' }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
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
      />

      {/* ── Service Detail Modal ── */}
      <Modal visible={detailOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {selectedService?.name}
              </Text>
              <TouchableOpacity onPress={() => setDetailOpen(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.modalCategory}>{selectedService?.category}</Text>
              <Text style={styles.modalDescription}>{selectedService?.description}</Text>
              <View style={styles.modalPriceBox}>
                <Text style={styles.modalPriceLabel}>Price</Text>
                <Text style={styles.modalPrice}>
                  UGX {selectedService?.amount.toLocaleString()}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setDetailOpen(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAddBtn}
                onPress={() => {
                  if (selectedService) {
                    addToCart(selectedService);
                    setDetailOpen(false);
                  }
                }}
              >
                <Feather name="shopping-cart" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.modalAddText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Cart Modal ── */}
      <Modal visible={cartOpen} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setCartOpen(false)}>
          <View style={styles.cartModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.cartModalContent}>
                <View style={styles.cartModalHeader}>
                  <View>
                    <Text style={styles.cartModalTitle}>Your Cart</Text>
                    <Text style={styles.cartModalCount}>
                      {cartCount} {cartCount === 1 ? 'item' : 'items'} • UGX{' '}
                      {cartTotal.toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setCartOpen(false)}>
                    <Feather name="x" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Toast inside cart modal */}
                {toast && (
                  <View
                    style={[
                      styles.toast,
                      toast.type === 'success' ? styles.toastSuccess : styles.toastError,
                      styles.cartToast,
                    ]}
                  >
                    <Text style={styles.toastText}>{toast.message}</Text>
                  </View>
                )}

                <ScrollView contentContainerStyle={styles.cartItemsContainer}>
                  {cart.length === 0 ? (
                    <View style={styles.cartEmptyState}>
                      <Feather name="shopping-cart" size={40} color="#ddd" />
                      <Text style={styles.cartEmptyText}>Your cart is empty</Text>
                    </View>
                  ) : (
                    cart.map((item) => (
                      <View key={item.id} style={styles.cartItemRow}>
                        <View style={styles.cartItemInfo}>
                          <Text style={styles.cartItemName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.cartItemCategory}>{item.category}</Text>
                          <Text style={styles.cartItemPrice}>
                            UGX {item.unitAmount.toLocaleString()} each
                          </Text>
                        </View>
                        <View style={styles.cartItemRight}>
                          <Text style={styles.cartItemTotal}>
                            UGX {(item.unitAmount * item.quantity).toLocaleString()}
                          </Text>
                          <View style={styles.cartItemQtyRow}>
                            <TouchableOpacity
                              style={styles.cartQtyBtn}
                              onPress={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Text style={styles.cartQtyBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.cartQtyValue}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={[styles.cartQtyBtn, styles.cartQtyBtnPlus]}
                              onPress={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Text style={[styles.cartQtyBtnText, { color: '#fff' }]}>+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.cartDeleteBtn}
                              onPress={() => removeFromCart(item.id)}
                            >
                              <Feather name="trash-2" size={14} color="#d81b60" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                {cart.length > 0 && (
                  <>
                    <View style={styles.staffIdContainer}>
                      <Text style={styles.staffIdLabel}>Enter StaffId</Text>
                      <TextInput
                        value={staffId}
                        onChangeText={setStaffId}
                        placeholder="674"
                        placeholderTextColor="#999"
                        style={styles.staffIdInput}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.cartFooter}>
                      <View style={styles.cartSummaryRow}>
                        <Text style={styles.cartSummaryLabel}>Total</Text>
                        <Text style={styles.cartSummaryAmount}>
                          UGX {cartTotal.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.cartFooterActions}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => setCartOpen(false)}
                        >
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.placeOrderBtn, orderLoading && styles.placeOrderBtnDisabled]}
                          disabled={orderLoading}
                          onPress={handlePlaceOrder}
                        >
                          {orderLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Feather name="check-circle" size={16} color="#fff" style={{ marginRight: 8 }} />
                              <Text style={styles.placeOrderText}>Place Order</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },

  // Header
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cartBtn: {
    padding: 6,
  },
  pillCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pillCartTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34495e',
  },
  cartBadgeAbsolute: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#d81b60',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Search and Filter Row
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchWrapperFlexible: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1a1a1a',
  },
  filterDropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterDropdownText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  
  // Filter Modal
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxHeight: '70%',
    paddingVertical: 10,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  filterList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  filterListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  filterListItemActive: {
    backgroundColor: '#fff0f6',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  filterListText: {
    fontSize: 14,
    color: '#333',
  },
  filterListTextActive: {
    color: '#d81b60',
    fontWeight: '700',
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 130,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 8,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastSuccess: {
    backgroundColor: '#4caf50',
  },
  toastError: {
    backgroundColor: '#f44336',
  },
  toastText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  // Service cards (grid)
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 100,
  },
  serviceCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  serviceImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#f5f5f5',
  },
  servicePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 40,
  },
  serviceInfo: {
    padding: 10,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 3,
  },
  serviceDescription: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
    lineHeight: 15,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  servicePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d81b60',
    flexShrink: 0,
  },
  categoryBadge: {
    backgroundColor: '#fff0f6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    maxWidth: 90,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#d81b60',
    fontWeight: '600',
  },

  // Cart controls on card
  cartControls: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d81b60',
    borderRadius: 8,
    paddingVertical: 7,
    gap: 4,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnPlus: {
    backgroundColor: '#d81b60',
    borderColor: '#d81b60',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d81b60',
    lineHeight: 20,
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    minWidth: 24,
    textAlign: 'center',
  },

  // Service Detail Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d81b60',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  modalDescription: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalPriceBox: {
    backgroundColor: '#fff5f9',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#d81b60',
  },
  modalPriceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d81b60',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  modalCloseBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  modalAddBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#d81b60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Cart Modal Bottom Sheet
  cartModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  cartModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 16,
  },
  cartModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cartModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  cartModalCount: {
    fontSize: 12,
    color: '#888',
  },
  cartToast: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  staffIdContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  staffIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  staffIdInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111',
  },
  cartFooterActions: {
    flexDirection: 'row',
  },
  cancelBtn: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '700',
  },
  cartItemsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cartEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  cartEmptyText: {
    fontSize: 14,
    color: '#999',
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  cartItemInfo: {
    flex: 1,
    gap: 2,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cartItemCategory: {
    fontSize: 10,
    color: '#aaa',
  },
  cartItemPrice: {
    fontSize: 11,
    color: '#666',
  },
  cartItemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cartItemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d81b60',
  },
  cartItemQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartQtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartQtyBtnPlus: {
    backgroundColor: '#d81b60',
  },
  cartQtyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#d81b60',
    lineHeight: 18,
  },
  cartQtyValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    minWidth: 20,
    textAlign: 'center',
  },
  cartDeleteBtn: {
    padding: 4,
    marginLeft: 2,
  },
  cartFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cartSummaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  cartSummaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  placeOrderBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#d81b60',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderBtnDisabled: {
    opacity: 0.7,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});
