import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

export default function MoreScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const menuItems = [
    { label: 'Dashboard', href: '/(tabs)', icon: '🏠' },
    { label: 'Services', href: '/services', icon: '🛍️' },
    { label: 'Transaction History', href: '/statement', icon: '📊' },
    { label: 'Buy Points', href: '/buy-points', icon: '💳' },
    { label: 'Redeem Points', href: '/spend-points', icon: '🎁' },
    { label: 'Tier Benefits', href: '/tier-details', icon: '👑' },
  ] as const;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Menu</Text>
          <Text style={styles.subtitle}>Quick Access</Text>
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <Link key={item.label} href={item.href} asChild>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuLabel}>
                  <Text style={styles.menuText}>{item.label}</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            </Link>
          ))}
        </View>

        <View style={styles.separator} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  menuSection: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  menuArrow: {
    fontSize: 18,
    color: '#d81b60',
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
    marginVertical: 24,
  },
  logoutButton: {
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffccdd',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d81b60',
  },
});
