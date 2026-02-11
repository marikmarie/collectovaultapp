import { StyleSheet, View, Text, ScrollView, FlatList, Pressable, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { ShoppingCart, Filter } from 'lucide-react-native';
import { customerService } from '@/lib/customerService';
import { StorageService, StorageKeys } from '@/lib/storage';

interface Service {
  id: string;
  name: string;
  price: number;
  photo?: string;
  description: string;
  category: string;
  is_product?: boolean;
}

interface CartItem extends Service {
  quantity: number;
}

const DUMMY_SERVICES: Service[] = [
  {
    id: '1',
    name: 'Coffee',
    price: 5,
    description: 'Freshly brewed coffee',
    category: 'Beverages',
  },
  {
    id: '2',
    name: 'Sandwich',
    price: 10,
    description: 'Delicious sandwich',
    category: 'Food',
  },
  {
    id: '3',
    name: 'Juice',
    price: 3,
    description: 'Fresh juice',
    category: 'Beverages',
  },
];

export default function ServicesScreen() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>(DUMMY_SERVICES);
  const [filteredServices, setFilteredServices] = useState<Service[]>(DUMMY_SERVICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [searchQuery, selectedCategory, services]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const collectoId = await StorageService.getItem(StorageKeys.COLLECTO_ID);
      const vaultToken = await StorageService.getItem(StorageKeys.VAULT_OTP_TOKEN);

      const response = await customerService.getServices(vaultToken || undefined, collectoId || undefined, 1, 50);
      const payload = response.data?.data;
      const innerData = payload?.data;
      const records = innerData?.records || [];

      const mappedServices = records.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        photo: item.photo,
        description: item.description,
        category: item.category || 'General',
        is_product: item.is_product,
      }));

      const catSet = new Set<string>(['All']);
      mappedServices.forEach((s: Service) => {
        if (s.category) catSet.add(s.category);
      });

      setServices(mappedServices);
      setCategories(Array.from(catSet));
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setServices(DUMMY_SERVICES);
      setCategories(['All', 'Beverages', 'Food']);
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
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
  };

  const addToCart = (service: Service) => {
    const existing = cart.find((item) => item.id === service.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...service, quantity: 1 }]);
    }
  };

  const removeFromCart = (serviceId: string) => {
    setCart(cart.filter((item) => item.id !== serviceId));
  };

  const updateQuantity = (serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(serviceId);
    } else {
      setCart(
        cart.map((item) =>
          item.id === serviceId ? { ...item, quantity } : item
        )
      );
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#d81b60" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Services & Products</Text>
        <Pressable style={styles.cartButton} onPress={() => setCartOpen(!cartOpen)}>
          <ShoppingCart size={24} color="#d81b60" />
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {cartOpen && (
        <View style={styles.cartPanel}>
          <Text style={styles.cartTitle}>Shopping Cart</Text>
          {cart.length > 0 ? (
            <>
              <FlatList
                data={cart}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemPrice}>${item.price}</Text>
                    </View>
                    <View style={styles.quantityControl}>
                      <Pressable onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Text style={styles.quantityButton}>−</Text>
                      </Pressable>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <Pressable onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Text style={styles.quantityButton}>+</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.cartItemTotal}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                )}
              />
              <View style={styles.cartFooter}>
                <Text style={styles.cartTotalLabel}>Total:</Text>
                <Text style={styles.cartTotalAmount}>${cartTotal.toFixed(2)}</Text>
              </View>
              <Pressable style={styles.checkoutButton}>
                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyCartText}>Cart is empty</Text>
          )}
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#ccc"
          />
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Services Grid */}
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View>
                  <Text style={styles.serviceName}>{item.name}</Text>
                  <Text style={styles.serviceCategory}>{item.category}</Text>
                </View>
                <Text style={styles.servicePrice}>${item.price}</Text>
              </View>
              <Text style={styles.serviceDescription}>{item.description}</Text>
              <Pressable style={styles.addButton} onPress={() => addToCart(item)}>
                <Text style={styles.addButtonText}>Add to Cart</Text>
              </Pressable>
            </View>
          )}
          numColumns={1}
        />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#d81b60',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cartBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  cartPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    maxHeight: 300,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#999',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d81b60',
    paddingHorizontal: 6,
  },
  quantity: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d81b60',
    minWidth: 50,
    textAlign: 'right',
  },
  cartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cartTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cartTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d81b60',
  },
  checkoutButton: {
    backgroundColor: '#d81b60',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCartText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryContainer: {
    gap: 8,
    paddingRight: 16,
  },
  categoryChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 12,
    color: '#999',
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d81b60',
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#d81b60',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
