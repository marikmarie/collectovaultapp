import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NavRoute {
  name: string;
  icon: string;
  route: string;
}

const routes: NavRoute[] = [
  { name: 'Home', icon: 'house.fill', route: '(tabs)' },
  { name: 'Statement', icon: 'doc.text.fill', route: '(tabs)/statement' },
  { name: 'Services', icon: 'bag.fill', route: '(tabs)/services' },
  { name: 'Help', icon: 'info.circle.fill', route: '(tabs)/help' },
];

export default function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [scaleValue] = React.useState(new Animated.Value(1));

  const getActiveRoute = () => {
    if (pathname.includes('/statement')) return '(tabs)/statement';
    if (pathname.includes('/services')) return '(tabs)/services';
    if (pathname.includes('/help')) return '(tabs)/help';
    return '(tabs)';
  };

  const activeRoute = getActiveRoute();

  const handleNavPress = (route: string) => {
    Animated.sequence([
      Animated.timing(scaleValue, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleValue, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    router.push(route);
  };

  return (
    <View
      style={[
        styles.container,
        { bottom: insets.bottom + 12 },
      ]}
    >
      <View style={styles.floatingBar}>
        {routes.map((item, index) => {
          const isActive = activeRoute === item.route;
          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.navButton,
                isActive && styles.activeNavButton,
              ]}
              onPress={() => handleNavPress(item.route)}
              activeOpacity={0.7}
            >
              <IconSymbol
                size={28}
                name={item.icon as any}
                color={isActive ? '#d81b60' : '#999'}
              />
              {isActive && <View style={styles.activeBadge} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  floatingBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  navButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  activeNavButton: {
    borderRadius: 30,
    backgroundColor: 'rgba(216, 27, 96, 0.06)',
  },
  activeBadge: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#d81b60',
    bottom: 6,
  },
});
