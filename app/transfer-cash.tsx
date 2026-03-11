import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import api from '@/src/api';
import storage from '@/src/utils/storage';
import { useAuth } from '@/src/context/AuthContext';

export default function TransferCashScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [recipientPhone, setRecipientPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
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
          [{ text: 'OK', onPress: () => router.back() }]
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer Cash</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Send cash to another wallet using mobile money.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Recipient Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="07XXXXXXXX"
            keyboardType="phone-pad"
            value={recipientPhone}
            onChangeText={setRecipientPhone}
            editable={!loading}
          />
        </View>

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

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleTransfer}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Transfer</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          The recipient will receive a prompt to accept the payment. Once confirmed, it will appear in your activity.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtnText: {
    color: '#d81b60',
    fontWeight: '600',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#d81b60',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  helpText: {
    marginTop: 16,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
