import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { customerService } from '@/src/api/customer';
import api from '@/src/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Package {
  id: string | number;
  points: number;
  price: number;
  label?: string;
  recommended?: boolean;
}

export default function BuyPointsScreen() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [step, setStep] = useState<'select' | 'confirm' | 'success' | 'failure'>('select');
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [verified, setVerified] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPackage = packages.find((p) => String(p.id) === String(selectedId));

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await customerService.getVaultPackages();
      const pkgs = response.data?.packages || response.data || [];
      setPackages(
        Array.isArray(pkgs)
          ? pkgs.map((p: any) => ({
              id: p.id,
              points: p.pointsAmount || p.points,
              price: p.price,
              label: p.name,
              recommended: p.isPopular,
            }))
          : [],
      );
    } catch (err) {
      console.error('Error fetching packages:', err);
      Alert.alert('Error', 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setVerifyingPhone(true);
    try {
      const vaultOTPToken = await AsyncStorage.getItem('vaultOtpToken');
      const collectoId = await AsyncStorage.getItem('collectoId');
      const clientId = user?.clientId;

      const res = await api.post('/verifyPhoneNumber', {
        phone,
        vaultOTPToken,
        collectoId,
        clientId,
      });

      if (res.data?.name) {
        setAccountName(res.data.name);
        setVerified(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to verify phone');
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedPackage || !verified) {
      Alert.alert('Error', 'Please select a package and verify phone');
      return;
    }

    setProcessing(true);
    try {
      const vaultOTPToken = await AsyncStorage.getItem('vaultOtpToken');
      const collectoId = await AsyncStorage.getItem('collectoId');
      const clientId = user?.clientId;

      const response = await api.post('/initiateMobileMoneyPayment', {
        phone,
        amount: selectedPackage.price,
        packageId: selectedPackage.id,
        vaultOTPToken,
        collectoId,
        clientId,
      });

      if (response.data?.success) {
        setStep('success');
      } else {
        setError(response.data?.message || 'Payment initiation failed');
        setStep('failure');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Payment failed');
      setStep('failure');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d81b60" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buy Points</Text>
      </View>

      {step === 'select' && (
        <>
          <Text style={styles.sectionLabel}>Select a Package</Text>
          <FlatList
            data={packages}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.packageCard,
                  String(selectedId) === String(item.id) && styles.packageCardSelected,
                ]}
                onPress={() => setSelectedId(item.id)}
              >
                {item.recommended && <View style={styles.recommendedBadge} />}
                <Text style={styles.packagePoints}>{item.points} Points</Text>
                <Text style={styles.packagePrice}>${item.price}</Text>
                <Text style={styles.packageLabel}>{item.label}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.packageList}
        />

          {selectedPackage && (
            <View style={styles.confirmContainer}>
              <Text style={styles.confirmText}>
                Pay ${selectedPackage.price} for {selectedPackage.points} points?
              </Text>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => setStep('confirm')}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {step === 'confirm' && selectedPackage && (
        <>
          <Text style={styles.sectionLabel}>Verify Phone for Payment</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={phone}
              onChangeText={setPhone}
              editable={!verified}
              keyboardType="phone-pad"
            />
            {!verified ? (
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleVerifyPhone}
                disabled={verifyingPhone}
              >
                <Text style={styles.verifyButtonText}>
                  {verifyingPhone ? 'Verifying...' : 'Verify'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>

          {verified && accountName && (
            <View style={styles.accountNameContainer}>
              <Text style={styles.accountNameLabel}>Account Name</Text>
              <Text style={styles.accountName}>{accountName}</Text>
            </View>
          )}

          {verified && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={handleProceedToPayment}
              disabled={processing}
            >
              <Text style={styles.payButtonText}>
                {processing ? 'Processing...' : 'Complete Payment'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {step === 'success' && (
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Payment Initiated!</Text>
          <Text style={styles.successMessage}>
            You will receive a payment prompt on your phone
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setStep('select')}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'failure' && (
        <View style={styles.failureContainer}>
          <Text style={styles.failureIcon}>✗</Text>
          <Text style={styles.failureTitle}>Payment Failed</Text>
          <Text style={styles.failureMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setStep('confirm')}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  packageList: {
    paddingHorizontal: 16,
  },
  packageCard: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#eee',
  },
  packageCardSelected: {
    borderColor: '#d81b60',
    backgroundColor: '#fff5f8',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#d81b60',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  packagePoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d81b60',
  },
  packagePrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  packageLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  confirmContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  confirmText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  nextButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  verifyButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  verifiedBadge: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#4caf50',
    fontWeight: '600',
    fontSize: 14,
  },
  accountNameContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
  },
  accountNameLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  payButton: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  successIcon: {
    fontSize: 60,
    color: '#4caf50',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  doneButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#d81b60',
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  failureContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  failureIcon: {
    fontSize: 60,
    color: '#f44336',
    marginBottom: 12,
  },
  failureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  failureMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#d81b60',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
