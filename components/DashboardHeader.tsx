import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface DashboardHeaderProps {
  name: string;
  phone?: string;
  avatar?: string;
}

export default function DashboardHeader({ name, phone, avatar }: DashboardHeaderProps) {
  // Create initials from name
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const initials = getInitials(name || 'User');

  return (
    <View style={styles.headerContainer}>
      {/* Gradient background */}
      <View style={styles.headerGradient} />

      <View style={styles.headerContent}>
        {/* Avatar - Large circular with initials */}
        <View style={styles.avatarLarge}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.initialsText}>{initials}</Text>
          )}
          <View style={styles.settingsIconBadge}>
            <Feather name="settings" size={16} color="#fff" />
          </View>
        </View>

        {/* User Name */}
        <Text style={styles.userName}>{name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#6a1b6b',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    position: 'relative',
    zIndex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#6a1b6b',
    zIndex: -1,
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#d81b60',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  initialsText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  settingsIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d81b60',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
});
