import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface DashboardHeaderProps {
  name: string;
  phone?: string;
  avatar?: string;
}

export default function DashboardHeader({ name, phone, avatar }: DashboardHeaderProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.headerContainer}>
      {/* Decorative circles/pattern */}
      <View style={[styles.decorativeCircle, styles.circleTop]} />
      <View style={[styles.decorativeCircle, styles.circleBottom]} />

      <View style={styles.headerContent}>
        {/* Large Avatar in center */}
        <View style={styles.avatarWrapper}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={styles.avatar}
              defaultSource={require('@/assets/images/logo.png')}
            />
          ) : (
            <View style={styles.avatarInitials}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
          )}
          {/* Camera icon overlay */}
          <TouchableOpacity style={styles.cameraButton}>
            <Feather name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* User Name */}
        <Text style={styles.userName}>{name}</Text>
        
        {/* Phone if provided */}
        {phone && <Text style={styles.phone}>{phone}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 28,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    // Gradient effect with multiple shades of purple
    backgroundColor: '#7B3FF2',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 200,
    opacity: 0,
    display: 'none',
  },
  circleTop: {
    width: 300,
    height: 300,
    top: -100,
    right: -50,
    backgroundColor: '#fff',
    display: 'none',
  },
  circleBottom: {
    width: 200,
    height: 200,
    bottom: -80,
    left: -50,
    backgroundColor: '#fff',
    display: 'none',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  avatarWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  avatarInitials: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  initialsText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B7B8B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  phone: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
