import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import storage from '@/src/utils/storage';
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
      let storedClientId = passedClientId;
      if (storedClientId == null) {
        const id = await storage.getItem('clientId');
        if (id) storedClientId = id;
      }
      let collectoId: string = '';
      const rawCollectoId = await storage.getItem('collectoId');
      if (rawCollectoId) collectoId = rawCollectoId;

      if (!storedClientId || typeof storedClientId !== 'string') {
        setError('Client ID not found. Please login again.');
        setIsLoading(false);
        return;
      }

    

          const resp = await authService.setUsername(
            storedClientId,
            collectoId,
            trimmed,
            { clientId: storedClientId, collectoId, username: trimmed, action: existingUsername ? 'update' : 'create' }
          );

          console.log('Set username response:', resp);
          //log request body for debugging
          console.log('Request body:', { clientId: storedClientId,
            collectoId,
            username: trimmed,
            action: existingUsername ? 'update' : 'create' });

      if (resp.success) {
        setSuccess('Username created successfully!');
        await storage.setItem('userName', trimmed);
        setTimeout(() => {
          onSuccess(trimmed);
          onClose();
        }, 1500);
      } else {
        setError(resp.message || 'Failed to create username');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create username. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Username</Text>
            <TouchableOpacity onPress={onClose} disabled={isLoading}>
              <Text style={{ fontSize: 28, color: '#1a1a1a' }}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <Text style={styles.description}>
              Create a unique username to make it easier to login next time
            </Text>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
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

            <Text style={styles.footer}>
              Username may only contain letters, numbers, _ and -
            </Text>
          </ScrollView>

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
  description: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
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
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#777',
    textAlign: 'right',
    marginTop: 4,
  },
  error: {
    color: '#b00020',
    marginBottom: 8,
    fontSize: 14,
  },
  success: {
    color: '#0a0',
    marginBottom: 8,
    fontSize: 14,
  },
  footer: {
    fontSize: 12,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#eee',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#d81b60',
  },
  cancelText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});