import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface DashboardHeaderProps {
  name: string;
  phone?: string;
  avatar?: string;
}

export default function DashboardHeader({ name, phone, avatar }: DashboardHeaderProps) {
  return (
    <View style={styles.headerContainer}>
      {/* Background gradient-like effect */}
      <View style={styles.headerBackground} />

      <View style={styles.headerContent}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={styles.avatar}
              defaultSource={require('@/assets/images/icon.png')}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={28} color="#fff" />
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{name}</Text>
          {phone && <Text style={styles.phone}>{phone}</Text>}
        </View>

        {/* Settings icon */}
        <TouchableOpacity style={styles.settingsButton}>
          <Feather name="settings" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#fafafa',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#d81b60',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#d81b60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  phone: {
    fontSize: 10,
    color: '#ccc',
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
  },
});
