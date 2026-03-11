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
import { Feather } from '@expo/vector-icons';
import api from '@/src/api';
import storage from '@/src/utils/storage';
import { useAuth } from '@/src/context/AuthContext';

export default function AddCashScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddCash = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount to add.');
      return;
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      Alert.alert('Missing phone', 'Please enter your mobile money number.');
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
        reference: `ADDCASH-${Date.now()}`,
      });

      const status = String(res.data?.status ?? '').toLowerCase();
      if (status === '200' || status === 'success') {
        Alert.alert(
          'Payment Initiated',
          'A mobile money prompt has been sent. Follow the instructions on your phone.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Failed', res.data?.message ?? 'Could not initiate payment');
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
        <Text style={styles.headerTitle}>Add Cash</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Add funds to your wallet using mobile money.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="07XXXXXXXX"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
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
          onPress={handleAddCash}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Request Payment</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          After confirming the payment on your phone, your wallet and transaction history will update shortly.
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
