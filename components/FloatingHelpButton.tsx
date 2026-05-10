import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Animated, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useHelpFeedback } from '@/src/context/HelpFeedbackContext';

const { height } = Dimensions.get('window');

export default function FloatingHelpButton() {
  const { openHelpHub, unreadCount } = useHelpFeedback();
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (unreadCount > 0) {
      // Pulse animation when unread messages
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [unreadCount]);

  const handlePress = () => {
    openHelpHub('main');
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.fab}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Feather name="help-circle" size={24} color="#fff" />

        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 999,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#d81b60',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f44336',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
