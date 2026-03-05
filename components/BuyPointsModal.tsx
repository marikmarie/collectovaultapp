import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { customerService } from '@/src/api/customer';
import api from '@/src/api';
import storage from '@/src/utils/storage';

interface Package {
  id: string | number;
  points: number;
  price: number;
  label?: string;
  recommended?: boolean;
}

type ModalStep = 'select' | 'confirm' | 'success' | 'failure';

interface BuyPointsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (details?: { addedPoints?: number }) => void;
}

export default function BuyPointsModal({
  visible,
  onClose,
  onSuccess,
}: BuyPointsModalProps) {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [step, setStep] = useState<ModalStep>('select');
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [verified, setVerified] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'mobilemoney' | 'bank'>('mobilemoney');
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedPackage = packages.find((p) => String(p.id) === String(selectedId));

  useEffect(() => {
    if (visible) {
      fetchPackages();
      resetState();
    }
  }, [visible]);

  const resetState = () => {
    setSelectedId(null);
    setStep('select');
    setPhone('');
    setVerified(false);
    setAccountName(null);
    setError(null);
    setProcessing(false);
    setPaymentMode('mobilemoney');
  };

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const collectoId = await storage.getItem('collectoId');
      const response = await api.get(`/vaultPackages/${collectoId}`);
      console.log('Packages response:', response.data);
      const pkgs: any[] = response.data?.data ?? [];
      const mapped = pkgs.map((p: any) => ({
        id: p.id,
        points: p.pointsAmount,
        price: p.price,
        recommended: p.isPopular,
        label: p.name,
      }));
      setPackages(mapped);
    } catch (err) {
      console.error('Error fetching packages:', err);
      Alert.alert('Error', 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    const trimmed = String(phone || '').trim();
    if (!trimmed || trimmed.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setVerifyingPhone(true);
    try {
      const vaultOTPToken = await storage.getItem('vaultOtpToken');
      const collectoId = await storage.getItem('collectoId');
      const clientId = user?.clientId;

      const res = await api.post('/verifyPhoneNumber', {
        phoneNumber: trimmed,
        vaultOTPToken,
        collectoId,
        clientId,
      });

      const payload = res?.data ?? {};
      const nested = payload?.data ?? {};
      const name = nested?.data?.name || nested?.name || payload?.name || null;
      const verified = Boolean(nested?.verifyPhoneNumber ?? String(payload?.status_message ?? '').toLowerCase() === 'success');

      if (verified) {
        setVerified(true);
        setAccountName(name ? String(name).trim() : null);
      } else {
        setVerified(false);
        Alert.alert('Verification Failed', nested?.message ?? 'Could not verify phone number');
      }
    } catch (err: any) {
      setVerified(false);
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to verify phone');
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a package');
      return;
    }

    if (!verified) {
      Alert.alert('Error', 'Please verify your phone number');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const vaultOTPToken = await storage.getItem('vaultOtpToken');
      const collectoId = await storage.getItem('collectoId');
      const clientId = user?.clientId;

      const formattedPhone = phone.replace(/^0/, '256');

      const res = await api.post('/requestToPay', {
        vaultOTPToken,
        collectoId,
        clientId,
        packageId: selectedPackage.id,
        phone: formattedPhone,
        paymentOption: paymentMode,
        amount: selectedPackage.price,
        reference: `BUYPOINTS-${Date.now()}`,
      });

      const data = res?.data;
      const apiStatus = String(data?.status || '');

      if (apiStatus === '200') {
        if (String(data?.status_message).toLowerCase() === 'success') {
          setStep('success');
          onSuccess?.({ addedPoints: selectedPackage.points });
        } else {
          setStep('confirm');
        }
      } else {
        setError(data?.status_message || 'Payment initiation failed');
        setStep('failure');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Payment failed');
      setStep('failure');
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Buy Points</Text>
            <TouchableOpacity onPress={() => {
              resetState();
              onClose();
            }}>
              <Feather name="x" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#d81b60" />
              </View>
            )}

            {!loading && step === 'select' && (
              <>
                <Text style={styles.sectionLabel}>Select a Package</Text>
                <FlatList
                  scrollEnabled={false}
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
                      {item.recommended && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>Popular</Text>
                        </View>
                      )}
                      <View style={styles.packageContent}>
                        <Text style={styles.packagePoints}>{item.points}</Text>
                        <Text style={styles.packagePointsLabel}>Points</Text>
                      </View>
                      <View style={styles.packageRight}>
                        <Text style={styles.packagePrice}>UGX {item.price.toLocaleString()}</Text>
                        {item.label && <Text style={styles.packageLabel}>{item.label}</Text>}
                      </View>
                    </TouchableOpacity>
                  )}
                />

                {selectedPackage && (
                  <View style={styles.actionContainer}>
                    <TouchableOpacity
                      style={styles.proceedButton}
                      onPress={() => setStep('confirm')}
                    >
                      <Text style={styles.proceedButtonText}>Continue to Payment</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {!loading && step === 'confirm' && selectedPackage && (
              <>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Package Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Points:</Text>
                    <Text style={styles.summaryValue}>{selectedPackage.points}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Price:</Text>
                    <Text style={styles.summaryValue}>UGX {selectedPackage.price.toLocaleString()}</Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Payment Method</Text>
                <TouchableOpacity
                  style={[styles.methodButton, paymentMode === 'mobilemoney' && styles.methodButtonActive]}
                  onPress={() => setPaymentMode('mobilemoney')}
                >
                  <View style={styles.methodRadio}>
                    {paymentMode === 'mobilemoney' && <View style={styles.methodRadioDot} />}
                  </View>
                  <Text style={styles.methodText}>Mobile Money</Text>
                </TouchableOpacity>

                <Text style={styles.sectionLabel}>Phone Number</Text>
                <View style={styles.phoneContainer}>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="0756901234"
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
                      <Feather name="check" size={16} color="#4caf50" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>

                {verified && accountName && (
                  <View style={styles.accountNameBox}>
                    <Text style={styles.accountNameLabel}>Account Holder</Text>
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

            {step === 'success' && selectedPackage && (
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <Feather name="check-circle" size={64} color="#4caf50" />
                </View>
                <Text style={styles.successTitle}>Payment Initiated!</Text>
                <Text style={styles.successMessage}>
                  You will receive a prompt on your mobile number{'\n'}
                  to complete the payment
                </Text>
                <View style={styles.successDetails}>
                  <Text style={styles.successDetailLabel}>Points to be added:</Text>
                  <Text style={styles.successDetailValue}>{selectedPackage.points} pts</Text>
                </View>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => {
                    resetState();
                    onClose();
                  }}
                >
                  <Text style={styles.doneButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'failure' && (
              <View style={styles.failureContainer}>
                <View style={styles.failureIconContainer}>
                  <Feather name="alert-circle" size={64} color="#f44336" />
                </View>
                <Text style={styles.failureTitle}>Payment Failed</Text>
                <Text style={styles.failureMessage}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => setStep('confirm')}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d81b60',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  packageCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    alignItems: 'center',
  },
  packageCardSelected: {
    borderColor: '#d81b60',
    backgroundColor: '#fff5f8',
  },
  recommendedBadge: {
    marginRight: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#ffa727',
    borderRadius: 4,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  packageContent: {
    marginRight: 'auto',
  },
  packagePoints: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d81b60',
  },
  packagePointsLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  packageRight: {
    alignItems: 'flex-end',
  },
  packagePrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  packageLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  actionContainer: {
    paddingVertical: 16,
  },
  proceedButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    alignItems: 'center',
    marginBottom: 16,
  },
  proceedButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  summaryCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#fff5f8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#d81b60',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d81b60',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryKey: {
    fontSize: 12,
    color: '#666',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  methodButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#fff5f8',
    borderColor: '#d81b60',
  },
  methodRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d81b60',
  },
  methodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 14,
    color: '#1a1a1a',
  },
  verifyButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  verifiedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: '#4caf50',
    fontWeight: '600',
    fontSize: 12,
  },
  accountNameBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  accountNameLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  payButton: {
    paddingVertical: 12,
    marginVertical: 16,
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
    alignItems: 'center',
    paddingVertical: 32,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  successDetails: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    width: '100%',
  },
  successDetailLabel: {
    fontSize: 10,
    color: '#999',
  },
  successDetailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d81b60',
    marginTop: 4,
  },
  doneButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  failureContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  failureIconContainer: {
    marginBottom: 16,
  },
  failureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f44336',
    marginBottom: 8,
  },
  failureMessage: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#d81b60',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
