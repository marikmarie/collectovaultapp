import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/src/api/authService';

interface SetUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string) => void;
  existingUsername?: string | null;
  clientId?: string;
}

export default function SetUsernameModal({
  isOpen,
  onClose,
  onSuccess,
  existingUsername,
  clientId: passedClientId,
}: SetUsernameModalProps) {
  const [username, setUsername] = useState(existingUsername || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (existingUsername) {
      setUsername(existingUsername);
    }
  }, [existingUsername]);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    const trimmed = username.trim();
    if (!trimmed) {
      setError('Username cannot be empty');
      return;
    }
    if (trimmed.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (trimmed.length > 100) {
      setError('Username cannot exceed 100 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError(
        'Username can only contain letters, numbers, underscores, and hyphens'
      );
      return;
    }

    setIsLoading(true);
    try {
      const storedClientId =
        passedClientId || (await AsyncStorage.getItem('clientId'));
      const collectoId = await AsyncStorage.getItem('collectoId');

      if (!storedClientId) {
        setError('Client ID not found. Please login again.');
        setIsLoading(false);
        return;
      }

      // check availability by attempting to fetch client id by username
      try {
        const avail = await authService.checkUsernameAvailability(trimmed);
        if (!avail.available) {
          setError('Username already exists. Please try another one.');
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        // if the helper throws we treat as unavailable
        setError('Username already exists. Please try another one.');
        setIsLoading(false);
        return;
      }

      const result = await authService.setUsername({
        clientId: storedClientId,
        username: trimmed,
        collectoId: collectoId || undefined,
      });

      if (result.success) {
        setSuccess('Username created successfully!');
        await AsyncStorage.setItem('userName', trimmed);
        setTimeout(() => {
          onSuccess(trimmed);
          onClose();
        }, 1500);
      } else {
        setError(result.message || 'Failed to create username');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create username. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={styles.backdrop} />
      <View style={styles.container}>
        <Text style={styles.title}>Create Username</Text>
        <Text style={styles.description}>
          Create a unique username to make it easier to login next time
        </Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="username"
            value={username}
            onChangeText={(t) => {
              setUsername(t);
              setError('');
            }}
            editable={!isLoading}
            maxLength={100}
            autoCapitalize="none"
          />
          <Text style={styles.charCount}>{username.length}/100</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            disabled={isLoading}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            disabled={isLoading}
            onPress={handleSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.footer}>
          Username may only contain letters, numbers, _ and -
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    margin: 16,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 5,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  description: { fontSize: 14, color: '#555', marginBottom: 16 },
  inputWrapper: { marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
  },
  charCount: { fontSize: 12, color: '#777', textAlign: 'right', marginTop: 4 },
  error: { color: '#b00020', marginBottom: 8 },
  success: { color: '#0a0', marginBottom: 8 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#eee', marginRight: 8 },
  confirmButton: { backgroundColor: '#67095D' },
  cancelText: { color: '#333', fontWeight: 'bold' },
  confirmText: { color: '#fff', fontWeight: 'bold' },
  footer: { fontSize: 12, color: '#555', marginTop: 16, textAlign: 'center' },
});