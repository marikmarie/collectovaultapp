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
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  isProduct?: boolean;
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

  // Service detail
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filter dropdown
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0),
    [cart]
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

      const mappedServices = records.map((item: any) => ({
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
          s.description.toLowerCase().includes(searchQuery.toLowerCase())
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
          isProduct: s.isProduct,
        },
      ];
    });
    showToast('Added to cart', 'success');
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart((prev) =>
        prev.map((c) => (c.id === id ? { ...c, quantity } : c))
      );
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
        showToast(`Order placed: ${invoiceId}`, 'success');
        setCart([]);
        setCartOpen(false);

        // Navigate to statement after a short delay
        setTimeout(() => {
          router.push('/statement');
        }, 500);
      } else {
        showToast('Failed to create invoice', 'error');
      }
    } catch (err: any) {
      console.error('Place order failed:', err);
      const errorMsg = err?.response?.data?.data?.message || err.message || 'Failed to place order';
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
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Title and Cart */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#d81b60" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Services & Products</Text>
        </View>
        <TouchableOpacity
          style={styles.cartButtonHeader}
          onPress={() => setCartOpen(true)}
        >
          <Feather name="shopping-cart" size={20} color="#d81b60" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search + Filter + Dropdown wrapper — relative so dropdown is anchored here */}
      <View style={styles.filterWrapper}>
        {/* Search and Filter — single row like photo 2 */}
        <View style={styles.filterBar}>
          <View style={styles.searchWrapper}>
            <Feather name="search" size={16} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterDropdownOpen(!filterDropdownOpen)}
          >
            <Feather name="filter" size={15} color="#d81b60" />
            <Text style={styles.filterButtonText}>{selectedCategory}</Text>
            <Feather name={filterDropdownOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#d81b60" />
          </TouchableOpacity>
        </View>

        {/* Dropdown overlays the list — anchored to this wrapper */}
        {filterDropdownOpen && (
          <View style={styles.dropdownContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.dropdownItem,
                  selectedCategory === cat && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setFilterDropdownOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    selectedCategory === cat && styles.dropdownItemTextActive,
                  ]}
                >
                  {cat}
                </Text>
                {selectedCategory === cat && (
                  <Feather name="check" size={14} color="#d81b60" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Toast */}
      {toast && (
        <View
          style={[
            styles.toast,
            toast.type === 'success' ? styles.toastSuccess : styles.toastError,
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Services List */}
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const cartItem = cart.find((c) => c.id === item.id);
          const qty = cartItem?.quantity || 0;

          return (
            /* Outer is a plain View — no touch swallowing */
            <View style={styles.serviceCard}>
              <TouchableOpacity
                style={styles.serviceCardLeft}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedService(item);
                  setDetailOpen(true);
                }}
              >
                <View style={styles.serviceImage}>
                  {item.photo ? (
                    <Text style={styles.serviceImageText}>📦</Text>
                  ) : (
                    <Feather name="image" size={24} color="#ddd" />
                  )}
                </View>
                <View style={styles.serviceContent}>
                  <Text style={styles.serviceName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.serviceMeta}>
                    <Text style={styles.serviceCategory}>{item.category}</Text>
                    {item.isProduct && (
                      <Text style={styles.serviceProduct}>Product</Text>
                    )}
                  </View>
                  <Text style={styles.servicePrice}>
                    UGX {item.amount.toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.qtyColumn}>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: '#d81b60' }]}
                  onPress={() => {
                    if (qty > 0) updateQuantity(item.id, qty + 1);
                    else addToCart(item);
                  }}
                >
                  <Text style={[styles.qtyBtnText, { color: '#fff' }]}>+</Text>
                </TouchableOpacity>

                {qty > 0 && (
                  <View style={styles.qtyDisplay}>
                    <Text style={styles.qtyDisplayText}>{qty}</Text>
                  </View>
                )}

                {qty > 0 && (
                  <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: '#f5f5f5' }]}
                    onPress={() => updateQuantity(item.id, qty - 1)}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color="#ddd" />
            <Text style={styles.emptyStateText}>No services found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* Service Detail Modal */}
      <Modal visible={detailOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedService?.name}</Text>
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
                <Text style={styles.modalAddText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cart Modal */}
      <Modal visible={cartOpen} transparent animationType="slide">
        <View style={styles.cartModalOverlay}>
          <View style={styles.cartModalContent}>
            <View style={styles.cartModalHeader}>
              <View>
                <Text style={styles.cartModalTitle}>Your Cart</Text>
                <Text style={styles.cartModalCount}>
                  {cartCount} items • UGX {cartTotal.toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCartOpen(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.cartItemsContainer}>
              {cart.length === 0 ? (
                <View style={styles.cartEmptyState}>
                  <Feather name="inbox" size={40} color="#ddd" />
                  <Text style={styles.cartEmptyText}>Your cart is empty</Text>
                </View>
              ) : (
                cart.map((item) => (
                  <View key={item.id} style={styles.cartItemRow}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemCategory}>{item.category}</Text>
                    </View>
                    <View style={styles.cartItemRight}>
                      <Text style={styles.cartItemPrice}>
                        UGX {(item.unitAmount * item.quantity).toLocaleString()}
                      </Text>
                      <View style={styles.cartItemQty}>
                        <TouchableOpacity
                          onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Text style={styles.cartQtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.cartQtyValue}>{item.quantity}</Text>
                        <TouchableOpacity
                          onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Text style={styles.cartQtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                        <Feather name="trash-2" size={16} color="#d81b60" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {cart.length > 0 && (
              <View style={styles.cartFooter}>
                <View style={styles.cartSummary}>
                  <Text style={styles.cartSummaryLabel}>Total</Text>
                  <Text style={styles.cartSummaryAmount}>
                    UGX {cartTotal.toLocaleString()}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.placeOrderBtn}
                  disabled={orderLoading}
                  onPress={handlePlaceOrder}
                >
                  <Text style={styles.placeOrderText}>
                    {orderLoading ? 'Placing Order...' : 'Place Order'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cartButtonHeader: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#d81b60',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  filterWrapper: {
    position: 'relative',
    zIndex: 100,
    backgroundColor: '#fff',
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 110,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d81b60',
    flex: 1,
    marginHorizontal: 2,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 62,
    right: 16,
    minWidth: 180,
    maxHeight: 280,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemActive: {
    backgroundColor: '#f5f0f5',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: '#d81b60',
  },
  categoryTabs: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: '#d81b60',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  toast: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 8,
    zIndex: 100,
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
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  serviceCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceImageText: {
    fontSize: 28,
  },
  serviceContent: {
    flex: 1,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  serviceMeta: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 10,
    fontWeight: '600',
    color: '#d81b60',
    backgroundColor: '#fff0f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  serviceProduct: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  servicePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d81b60',
  },
  qtyColumn: {
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d81b60',
  },
  qtyBtnDisabled: {
    color: '#ccc',
  },
  qtyDisplay: {
    width: 32,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyDisplayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d81b60',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalPriceBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalPriceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#d81b60',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d81b60',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalCloseBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
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
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    alignItems: 'center',
  },
  modalAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  // Cart Modal
  cartModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  cartModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
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
    marginBottom: 4,
  },
  cartModalCount: {
    fontSize: 12,
    color: '#666',
  },
  cartItemsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cartEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  cartEmptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cartItemCategory: {
    fontSize: 10,
    color: '#999',
  },
  cartItemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cartItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d81b60',
  },
  cartItemQty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartQtyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d81b60',
    width: 20,
    textAlign: 'center',
  },
  cartQtyValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a1a',
    minWidth: 20,
    textAlign: 'center',
  },
  cartFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cartSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  cartSummaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d81b60',
  },
  placeOrderBtn: {
    backgroundColor: '#d81b60',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
