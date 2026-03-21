import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import storage from '@/src/utils/storage';

const logo = require('../assets/images/logo.png');

interface DashboardHeaderProps {
  name?: string;
  onProfilePress?: () => void;
}

export default function DashboardHeader({ name, onProfilePress }: DashboardHeaderProps) {
  const [displayName, setDisplayName] = useState(name ?? '');

  useEffect(() => {
    const loadName = async () => {
      if (name) {
        const normalized = name.trim();
        // If the provided name is a generic placeholder, fall back to stored value.
        if (normalized.toLowerCase() !== 'user' && normalized.toLowerCase() !== 'guest') {
          setDisplayName(normalized);
          return;
        }
      }

      try {
        const stored = await storage.getItem('userName');
        if (stored) {
          const normalized = stored.trim();
          // If stored value is a generic placeholder, don't show it.
          if (normalized.toLowerCase() !== 'user' && normalized.toLowerCase() !== 'guest') {
            setDisplayName(normalized);
          }
        }
      } catch {
        // ignore
      }
    };

    loadName();
  }, [name]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerTopRow}>
        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <Feather name="user" size={20} color="#d81b60" />
        </TouchableOpacity>
      </View>
      <View style={styles.greetingRow}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <View style={styles.greetingTextContainer}>
          <Text style={styles.greetingText}>{`${greeting},`}</Text>
          <Text style={styles.userName}>{displayName || ''}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 35,
    marginRight: 12,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: '#d81b60',
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#d81b60',
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(216,27,96,0.1)',
    borderWidth: 1,
    borderColor: '#d81b60',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
