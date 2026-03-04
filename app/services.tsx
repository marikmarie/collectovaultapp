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
  Modal,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { customerService } from '@/src/api/customer';
import { invoiceService } from '@/src/api/collecto';
import storage from '@/src/utils/storage';
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

interface CartItem {
  id: string;
  name: string;
  unitAmount: number;
  quantity: number;
  photo?: string;
  category?: string;
  isProduct?: boolean;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function ServicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [photosBaseUrl, setPhotosBaseUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [page, setPage] = useState(1);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartPlacing, setCartPlacing] = useState(false);
  const [staffId, setStaffId] = useState('');

  // Modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<Toast | null>(null);

  const clientId = user?.clientId || '';

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const vaultOTPToken = await storage.getItem('vaultOtpToken') || undefined;
      const collectoId = await storage.getItem('collectoId') || undefined;

      const response = await customerService.getServices(
        vaultOTPToken,
        collectoId,
        page,
        20,
      );

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
      showToast('Failed to load services', 'error');
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

  // Cart helpers
  const addToCart = (s: Service) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === s.id);
      if (existing) {
        return prev.map((c) =>
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
    showToast('Added to cart', 'success');
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
    showToast('Removed from cart', 'info');
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(id);
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, quantity } : c)),
    );
  };

  // Place order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }

    if (!staffId.trim()) {
      showToast('Please enter Staff ID', 'error');
      return;
    }

    setCartPlacing(true);

    try {
      const collectoId = await storage.getItem('collectoId') || '';
      
      if (!clientId) {
        showToast('Customer ID missing. Please login.', 'error');
        return;
      }

      const payload = {
        vaultOTPToken: await storage.getItem('vaultOtpToken') || undefined,
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
      const apiRoot = response.data;
      const invoiceId = apiRoot?.data?.invoiceId;

      if (invoiceId && apiRoot?.status?.toString() === '200') {
        showToast(`Order placed: ${invoiceId}`, 'success');
        setCart([]);
        setCartOpen(false);
        setStaffId('');
        
        setTimeout(() => {
          router.push({
            pathname: '/statement',
            params: { invoiceId },
          });
        }, 500);
      } else {
        const errorMsg = apiRoot?.data?.message || 'Failed to place order';
        showToast(errorMsg, 'error');
      }
    } catch (err: any) {
      console.error('Place order failed:', err);
      const msg =
        err?.response?.data?.data?.message ||
        err.message ||
        'Failed to place order';
      showToast(msg, 'error');
    } finally {
      setCartPlacing(false);
    }
  };

  const cartCount = cart.reduce((acc, it) => acc + it.quantity, 0);
  const cartTotal = cart.reduce((acc, it) => acc + it.unitAmount * it.quantity, 0);

  if (loading && !services.length) {
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
        <View style={styles.headerLeft}>
          <Feather name="shopping-bag" size={20} color="#d81b60" />
          <Text style={styles.headerTitle}>Services & Products</Text>
        </View>
        
        {/* Cart Button */}
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => setCartOpen(true)}
        >
          <Feather name="shopping-cart" size={18} color="#667" />
          <Text style={styles.cartButtonText}>
            UGX {cartTotal.toLocaleString()}
          </Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Dropdown */}
        <View style={styles.dropdownContainer}>
          <Feather name="filter" size={16} color="#999" style={styles.filterIcon} />
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  selectedCategory === item && styles.categoryOptionActive,
                ]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    selectedCategory === item && styles.categoryOptionTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.filterOptions}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      </View>

      {/* Toast */}
      {toast && (
        <View
          style={[
            styles.toast,
            toast.type === 'success'
              ? styles.toastSuccess
              : toast.type === 'error'
              ? styles.toastError
              : styles.toastInfo,
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Services List */}
      {filteredServices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={48} color="#ddd" />
          <Text style={styles.emptyText}>No services found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id}
          renderItem={({ item: service }) => {
            const cartItem = cart.find((c) => c.id === service.id);
            const qty = cartItem?.quantity || 0;
            const isInPreview = previewId === service.id;

            return (
              <TouchableOpacity
                style={styles.serviceCard}
                onPress={() => {
                  if (isInPreview) {
                    setSelectedService(service);
                    setDetailOpen(true);
                    setPreviewId(null);
                  } else {
                    setPreviewId(service.id);
                  }
                }}
                activeOpacity={0.7}
              >
                {/* Service Image */}
                <View style={styles.imageContainer}>
                  {service.photo ? (
                    <Image
                      source={{ uri: `${photosBaseUrl}${service.photo}` }}
                      style={styles.serviceImage}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Feather name="image" size={24} color="#ccc" />
                    </View>
                  )}
                </View>

                {/* Service Info */}
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={1}>
                    {service.name}
                  </Text>
                  
                  {/* Tags */}
                  <View style={styles.tagsContainer}>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{service.category}</Text>
                    </View>
                    {service.isProduct && (
                      <View style={styles.productTag}>
                        <Text style={styles.productTagText}>Product</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.servicePrice}>
                    UGX {service.amount.toLocaleString()}
                  </Text>
                </View>

                {/* Quantity Controls */}
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => {
                      if (qty > 0) updateQuantity(service.id, qty - 1);
                      else addToCart(service);
                    }}
                  >
                    <Text style={styles.quantityBtnText}>
                      {qty > 0 ? '−' : '+'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.quantityDisplay}>
                    <Text style={styles.quantityText}>{qty}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => {
                      if (qty > 0) updateQuantity(service.id, qty + 1);
                      else addToCart(service);
                    }}
                  >
                    <Text style={styles.quantityBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Preview Overlay */}
                {isInPreview && (
                  <View style={styles.previewOverlay}>
                    <TouchableOpacity
                      style={styles.closePreview}
                      onPress={() => setPreviewId(null)}
                    >
                      <Feather name="x" size={20} color="#666" />
                    </TouchableOpacity>
                    
                    <Text style={styles.previewTitle}>{service.name}</Text>
                    <Text style={styles.previewDesc}>{service.description}</Text>
                    
                    <View style={styles.previewFooter}>
                      <Text style={styles.previewPrice}>
                        UGX {service.amount.toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        style={styles.previewAddBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          addToCart(service);
                          setPreviewId(null);
                        }}
                      >
                        <Text style={styles.previewAddBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Service Detail Modal */}
      <Modal visible={detailOpen} transparent animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setDetailOpen(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedService?.name}</Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedService?.photo && (
              <Image
                source={{ uri: `${photosBaseUrl}${selectedService.photo}` }}
                style={styles.detailImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.detailContent}>
              <View style={styles.detailTags}>
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>
                    {selectedService?.category}
                  </Text>
                </View>
                {selectedService?.isProduct && (
                  <View style={styles.productTag}>
                    <Text style={styles.productTagText}>Product</Text>
                  </View>
                )}
              </View>

              <Text style={styles.detailDesc}>{selectedService?.description}</Text>

              <View style={styles.detailPrice}>
                <Text style={styles.detailPriceLabel}>Price</Text>
                <Text style={styles.detailPriceValue}>
                  UGX {selectedService?.amount.toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.detailCloseBtn}
                  onPress={() => setDetailOpen(false)}
                >
                  <Text style={styles.detailCloseBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.detailAddBtn}
                  onPress={() => {
                    selectedService && addToCart(selectedService);
                    setDetailOpen(false);
                  }}
                >
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.detailAddBtnText}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Cart Modal */}
      <Modal visible={cartOpen} transparent animationType="slide">
        <SafeAreaView style={styles.cartModalContainer}>
          <View style={styles.cartModal}>
            <View style={styles.cartHeader}>
              <View>
                <Text style={styles.cartTitle}>Your Cart</Text>
                <Text style={styles.cartSubtitle}>
                  {cartCount} items — UGX {cartTotal.toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCartOpen(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Cart Items */}
            <ScrollView style={styles.cartItemsList}>
              {cart.length === 0 ? (
                <View style={styles.cartEmpty}>
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
                      <Text style={styles.cartItemDesc}>
                        UGX {item.unitAmount.toLocaleString()} × {item.quantity}
                      </Text>
                    </View>
                    <View style={styles.cartItemRight}>
                      <Text style={styles.cartItemTotal}>
                        UGX {(item.unitAmount * item.quantity).toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        style={styles.cartRemoveBtn}
                        onPress={() => removeFromCart(item.id)}
                      >
                        <Text style={styles.cartRemoveText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Cart Total */}
            {cart.length > 0 && (
              <>
                <View style={styles.cartTotalBox}>
                  <Text style={styles.cartTotalLabel}>Total</Text>
                  <Text style={styles.cartTotalAmount}>
                    UGX {cartTotal.toLocaleString()}
                  </Text>
                </View>

                {/* Staff ID Input */}
                <View style={styles.staffIdContainer}>
                  <Text style={styles.staffIdLabel}>Enter Staff ID</Text>
                  <TextInput
                    style={styles.staffIdInput}
                    placeholder="e.g., 674"
                    placeholderTextColor="#999"
                    value={staffId}
                    onChangeText={setStaffId}
                    keyboardType="default"
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.cartActions}>
                  <TouchableOpacity
                    style={[
                      styles.placeOrderBtn,
                      cartPlacing && styles.placeOrderBtnDisabled,
                    ]}
                    onPress={handlePlaceOrder}
                    disabled={cartPlacing}
                  >
                    <Text style={styles.placeOrderBtnText}>
                      {cartPlacing ? 'Placing Order...' : 'Place Order'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setCartOpen(false)}
                    disabled={cartPlacing}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
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
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  cartButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  cartBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#d3c7cb',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -6,
    right: -6,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1a1a1a',
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    marginRight: 8,
    marginLeft: 4,
  },
  filterOptions: {
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoryOptionActive: {
    backgroundColor: '#d81b60',
    borderColor: '#d81b60',
  },
  categoryOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  categoryOptionTextActive: {
    color: '#fff',
  },
  toast: {
    position: 'absolute',
    top: 60,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: '#4caf50',
  },
  toastError: {
    backgroundColor: '#f44336',
  },
  toastInfo: {
    backgroundColor: '#2196f3',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
    position: 'relative',
  },
  imageContainer: {
    width: 80,
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  serviceInfo: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 6,
  },
  categoryTag: {
    backgroundColor: '#fff0f5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#d81b60',
  },
  productTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  productTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  servicePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  quantityContainer: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  quantityDisplay: {
    width: 32,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  previewOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  closePreview: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  previewDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  previewAddBtn: {
    backgroundColor: '#d81b60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  previewAddBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailModal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  detailImage: {
    width: '100%',
    height: 240,
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  detailTags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  detailDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 16,
  },
  detailPrice: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  detailPriceLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailPriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailCloseBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  detailCloseBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  detailAddBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  detailAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  cartModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  cartModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxHeight: '90%',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 12,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cartSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  cartItemsList: {
    maxHeight: 240,
    marginBottom: 16,
  },
  cartEmpty: {
    alignItems: 'center',
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
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cartItemDesc: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  cartItemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  cartItemTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cartRemoveBtn: {
    marginTop: 6,
  },
  cartRemoveText: {
    fontSize: 10,
    color: '#d81b60',
    fontWeight: '600',
  },
  cartTotalBox: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  cartTotalLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  cartTotalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 4,
  },
  staffIdContainer: {
    marginBottom: 16,
  },
  staffIdLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  staffIdInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1a1a1a',
  },
  cartActions: {
    gap: 12,
  },
  placeOrderBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ddd2d6',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeOrderBtnDisabled: {
    opacity: 0.6,
  },
  placeOrderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
});
