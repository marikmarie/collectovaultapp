import { StyleSheet, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { LogIn } from 'lucide-react-native';
import { authService } from '@/lib/authService';
import { StorageService, StorageKeys } from '@/lib/storage';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [clientId, setClientId] = useState('');
  const [collectoId, setCollectoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!clientId.trim() || !collectoId.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Store IDs
      await StorageService.setItem(StorageKeys.CLIENT_ID, clientId);
      await StorageService.setItem(StorageKeys.COLLECTO_ID, collectoId);

      // TODO: Implement actual authentication flow
      console.log('Login with:', { clientId, collectoId });

      // Navigate to dashboard
      router.replace('/(customer)' as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <LogIn size={64} color="#d81b60" strokeWidth={1.5} />
            <Text style={styles.title}>CollectoVault</Text>
            <Text style={styles.subtitle}>Customer Dashboard</Text>
          </View>

          {/* Error Alert */}
          {error && (
            <View style={styles.errorAlert}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* Client ID Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your client ID"
                value={clientId}
                onChangeText={setClientId}
                placeholderTextColor="#ccc"
                editable={!loading}
              />
            </View>

            {/* Collecto ID Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Collecto ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter collecto ID"
                value={collectoId}
                onChangeText={setCollectoId}
                placeholderTextColor="#ccc"
                editable={!loading}
              />
            </View>

            {/* Login Button */}
            <Pressable
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </Pressable>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>Demo: Use test credentials to explore</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
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
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  loginButton: {
    backgroundColor: '#d81b60',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorAlert: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
    padding: 16,
    marginBottom: 24,
    borderRadius: 4,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
  },
});
