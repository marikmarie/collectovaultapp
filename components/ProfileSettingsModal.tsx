import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import storage from '@/src/utils/storage';
import SetUsernameModal from '../app/SetUsernameModal';
import { customerService } from '@/src/api/customer';

interface ProfileSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function ProfileSettingsModal({
  visible,
  onClose,
  onLogout,
}: ProfileSettingsModalProps) {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState(user?.userName || '');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const fetchLoyaltySettings = async () => {
    if (!user?.clientId || !user?.collectoId) return;

    try {
      setIsFetchingData(true);
      const customerRes = await customerService.getCustomerData(
        user.collectoId,
        user.clientId,
      );
      const loyaltySettings = customerRes.data?.data?.loyaltySettings ?? {};

      const loyaltyNameFromSettings =
        typeof loyaltySettings?.name === "string" && loyaltySettings.name.trim()
          ? loyaltySettings.name.trim()
          : undefined;
      setDisplayName(loyaltyNameFromSettings || '');

      const usernameFromSettings =
        typeof loyaltySettings?.username === "string" && loyaltySettings.username.trim()
          ? loyaltySettings.username.trim()
          : undefined;
      setUsername(usernameFromSettings || '');

      // Store the data in storage for persistence
      if (loyaltyNameFromSettings) {
        await storage.setItem("name", loyaltyNameFromSettings);
      }
      if (usernameFromSettings) {
        await storage.setItem("userName", usernameFromSettings);
      }
    } catch (err) {
      console.error("Error fetching loyalty settings:", err);
      // Fallback to storage if API fails
      const loadFromStorage = async () => {
        const storedName = await storage.getItem('name');
        const storedUsername = await storage.getItem('userName');
        if (storedName) setDisplayName(storedName);
        if (storedUsername) setUsername(storedUsername);
      };
      loadFromStorage();
    } finally {
      setIsFetchingData(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchLoyaltySettings();
    }
  }, [visible, user?.clientId, user?.collectoId]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await logout();
              onClose();
              onLogout();
            } catch (err) {
              Alert.alert('Error', 'Failed to logout');
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUsernameSuccess = async (newUsername: string) => {
    setUsername(newUsername);
    await storage.setItem('userName', newUsername);
    setShowUsernameModal(false);
    // Refresh data to get updated loyalty settings
    fetchLoyaltySettings();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        {isLoading || isFetchingData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#d81b60" />
            {isFetchingData && (
              <Text style={styles.loadingText}>Loading profile data...</Text>
            )}
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {/* Profile Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile</Text>
              
              <View style={styles.profileCard}>
                <View style={styles.profileField}>
                  <Text style={styles.profileLabel}>Client ID</Text>
                  <Text style={styles.profileValue}>{user?.clientId || '—'}</Text>
                </View>

                <View style={[styles.profileField, styles.borderTop]}>
                  <Text style={styles.profileLabel}>Username</Text>
                  <Text style={styles.profileValue}>
                    {username ? `@${username}` : 'Not set'}
                  </Text>
                </View>

                <View style={[styles.profileField, styles.borderTop]}>
                  <Text style={styles.profileLabel}>Display Name</Text>
                  <Text style={styles.profileValue}>{displayName || '—'}</Text>
                </View>
              </View>
            </View>

            {/* Username Management Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Username Management</Text>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowUsernameModal(true)}
              >
                <View style={styles.actionButtonContent}>
                  <Feather
                    name={username ? 'edit-2' : 'plus'}
                    size={20}
                    color="#d81b60"
                  />
                  <View style={styles.actionButtonText}>
                    <Text style={styles.actionButtonTitle}>
                      {username ? 'Update Username' : 'Set Username'}
                    </Text>
                    <Text style={styles.actionButtonDescription}>
                      {username
                        ? 'Change your current username'
                        : 'Set up a unique username for your account'}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>

            {/* Account Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleLogout}
              >
                <View style={styles.actionButtonContent}>
                  <Feather name="log-out" size={20} color="#ff3333" />
                  <View style={styles.actionButtonText}>
                    <Text style={[styles.actionButtonTitle, styles.dangerText]}>
                      Logout
                    </Text>
                    <Text style={styles.actionButtonDescription}>
                      Sign out from your account
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>

            {/* App Version */}
            <View style={styles.footerSection}>
              <Text style={styles.versionText}>CollectoVault v1.0.0</Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Username Modal */}
      {showUsernameModal && (
        <SetUsernameModal
          isOpen={showUsernameModal}
          onClose={() => setShowUsernameModal(false)}
          onSuccess={handleUsernameSuccess}
          existingUsername={username || undefined}
          displayName={displayName || undefined}
          clientId={user?.clientId}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileField: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  profileLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#ff3333',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  actionButtonText: {
    marginLeft: 12,
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  dangerText: {
    color: '#ff3333',
  },
  actionButtonDescription: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 12,
    color: '#ccc',
  },
});
