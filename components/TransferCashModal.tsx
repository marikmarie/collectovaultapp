import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '@/src/api';
import storage from '@/src/utils/storage';
import { useAuth } from '@/src/context/AuthContext';

interface TransferCashModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TransferCashModal({ visible, onClose, onSuccess }: TransferCashModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setRecipientPhone('');
      setLoading(false);
      setVerifying(false);
      setVerified(false);
      setAccountName(null);
      setPhoneError(null);
    }
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  const verifyPhone = async () => {
    const trimmed = String(recipientPhone || '').trim();
    if (!trimmed || trimmed.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setVerifying(true);
      setPhoneError(null);
      const vaultOTPToken = await storage.getItem('vaultOtpToken');
      const collectoId = await storage.getItem('collectoId');
      const clientId = user?.clientId;

      const res = await api.post('/verifyPhoneNumber', {
        vaultOTPToken,
        collectoId,
        clientId,
        phoneNumber: trimmed,
      });

      const payload = res?.data ?? {};
      const nested = payload?.data ?? {};
      const deeper = nested?.data ?? {};

      const name =
        (deeper?.name && String(deeper.name).trim()) ||
        (nested?.name && String(nested.name).trim()) ||
        (payload?.name && String(payload.name).trim()) ||
        null;

      const verifiedFlag = Boolean(
        nested?.verifyPhoneNumber ??
          deeper?.verifyPhoneNumber ??
          String(payload?.status_message ?? '').toLowerCase() === 'success'
      );

      if (verifiedFlag) {
        setVerified(true);
        setAccountName(name);
        setPhoneError(null);
      } else {
        setVerified(false);
        setAccountName(null);
        setPhoneError(nested?.message ?? 'Could not verify the phone number');
      }
    } catch (err: any) {
      setAccountName(null);
      setVerified(false);
      setPhoneError(err?.response?.data?.message ?? 'Could not verify phone');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (recipientPhone.trim().length === 10 && !verified && !verifying) {
      verifyPhone();
    }
  }, [recipientPhone, verified, verifying]);

  const handleTransfer = async () => {
    if (!verified) {
      Alert.alert('Verify phone', 'Please verify the recipient phone number before proceeding.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount to transfer.');
      return;
    }

    const trimmedPhone = recipientPhone.trim();
    if (!trimmedPhone) {
      Alert.alert('Missing recipient', 'Please enter the recipient mobile number.');
      return;
    }

    setLoading(true);
    try {
      const vaultOTPToken = await storage.getItem('vaultOtpToken');
      const collectoId = await storage.getItem('collectoId');

      const res = await api.post('/requestToPay', {
        vaultOTPToken,
        collectoId,
        clientId: user?.clientId,
        paymentOption: 'mobilemoney',
        phone: trimmedPhone.replace(/^0/, '256'),
        amount: Number(amount),
        reference: `TRANSFER-${Date.now()}`,
      });

      const status = String(res.data?.status ?? '').toLowerCase();
      if (status === '200' || status === 'success') {
        Alert.alert(
          'Transfer initiated',
          'A payment request has been sent to the recipient. The transfer will reflect once confirmed.',
          [{ text: 'OK', onPress: () => { handleClose(); onSuccess?.(); } }]
        );
      } else {
        Alert.alert('Failed', res.data?.message ?? 'Could not initiate transfer');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Transfer Cash</Text>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.sectionTitle}>Send cash to another wallet</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (UGX)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 10000"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Recipient Phone</Text>
              <View style={styles.phoneInputGroup}>
                <TextInput
                  style={[styles.phoneInput, styles.smallPhoneInput]}
                  placeholder="07XXXXXXXX"
                  keyboardType="phone-pad"
                  value={recipientPhone}
                  onChangeText={(value) => {
                    setRecipientPhone(value);
                    setVerified(false);
                    setAccountName(null);
                    setPhoneError(null);
                  }}
                  editable={!loading && !verifying}
                  maxLength={10}
                />
                <Text style={[styles.statusText, { color: verifying ? '#666' : verified ? '#2e7d32' : '#666' }]}>
                  {verifying ? 'Verifying...' : verified ? '✓ Verified' : 'Enter 10-digit phone'}
                </Text>
              </View>

              {phoneError ? (
                <Text style={styles.errorText}>{phoneError}</Text>
              ) : null}

              {verified && accountName && (
                <View style={styles.accountBox}>
                  <Feather name="check-circle" size={20} color="#4caf50" />
                  <View style={styles.accountInfo}>
                    {/* <Text style={styles.accountLabel}>Recipient Name</Text> */}
                    <Text style={styles.accountName}>{accountName}</Text>
                  </View>
                </View>
              )}
            </View>

            <Text style={styles.helpText}>
              The recipient will receive a prompt to accept the payment. Once confirmed, it will appear in your activity.
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.proceedBtn, loading && styles.proceedBtnDisabled]}
              onPress={handleTransfer}
              disabled={loading || !verified || !amount}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.proceedBtnText}>Send Transfer</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  phoneInputGroup: {
   flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  phoneInput: {
    flex: 0,
    width: 220,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  smallPhoneInput: {
    width: 220,
  },
  statusText: {
    fontSize: 12,
  },
  verifyBtn: {
    backgroundColor: '#d81b60',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnDisabled: {
    opacity: 0.7,
    backgroundColor: '#999',
  },
  verifyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 8,
  },
  accountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  accountName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2e7d32',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 8,
  },
  proceedBtn: {
    backgroundColor: '#d81b60',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#d81b60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  proceedBtnDisabled: {
    opacity: 0.6,
  },
  proceedBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d81b60',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
});
