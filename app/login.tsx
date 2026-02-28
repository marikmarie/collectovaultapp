import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { authService } from '@/src/api/authService';
import { setVaultOtpToken, getVaultOtpToken } from '@/src/api';

type LoginStep = 'id_entry' | 'otp_entry';

interface PendingPayload {
  id: string;
  vaultOTPToken?: string | null;
}

export default function LoginScreen() {
  const { login } = useAuth();

  // Login flow state
  const [loginStep, setLoginStep] = useState<LoginStep>('id_entry');
  const [idOrUsername, setIdOrUsername] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<PendingPayload | null>(null);
  const [showClientIdDialog, setShowClientIdDialog] = useState(false);
  const [clientIdForUsername, setClientIdForUsername] = useState('');

  const buildAuthPayload = (id: string) => {
    return { type: 'client' as const, id };
  };

  const attemptLogin = async (input: string) => {
    setError('');
    setIsProcessing(true);

    if (input.length < 3) {
      setError('Please enter a valid ID or username.');
      setIsProcessing(false);
      return;
    }

    try {
      let resolvedId = input;

      // Try as username first
      if (/^[a-zA-Z0-9_-]+$/.test(input) && input.length < 50) {
        try {
          const userInfo = await authService.getClientIdByUsername(input);
          resolvedId = userInfo.clientId;
        } catch (usernameErr) {
          // Username not found, try as client ID
        }
      }

      // Try as client ID
      const { id, type } = buildAuthPayload(resolvedId);
      const res = await authService.startCollectoAuth({ type, id });
      const inner = res?.data ?? null;

      const returnedToken = inner?.data?.vaultOTPToken ?? inner?.vaultOTPToken ?? null;

      if (returnedToken) {
        const expiryIso = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        await setVaultOtpToken(returnedToken, expiryIso);
        setPendingPayload({ id: resolvedId, vaultOTPToken: returnedToken });
        setLoginStep('otp_entry');
        return;
      }

      setError(inner?.message ?? res?.message ?? 'ID or username not found.');
    } catch (err: any) {
      setError(err?.message ?? 'Network or service error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIdSubmit = async () => {
    await attemptLogin(idOrUsername);
  };

  const handleOtpSubmit = async () => {
    setError('');
    setIsProcessing(true);

    if (otpValue.length !== 6) {
      setError('OTP must be 6 digits.');
      setIsProcessing(false);
      return;
    }

    try {
      const verifyPayload = {
        id: pendingPayload!.id,
        type: 'client' as const,
        vaultOTP: otpValue,
        vaultOTPToken: pendingPayload!.vaultOTPToken!,
      };

      await authService.verifyCollectoOtp(verifyPayload);
      // Auth context will handle navigation
      await login(pendingPayload!.id);
    } catch (err: any) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingPayload || isProcessing) return;
    setIsProcessing(true);
    try {
      const payload = buildAuthPayload(pendingPayload.id);
      await authService.startCollectoAuth({ type: payload.type, id: payload.id });
      setError('A new code has been sent.');
    } catch (e) {
      setError('Unable to resend code.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetUsernameClick = () => {
    setShowClientIdDialog(true);
    setClientIdForUsername('');
  };

  const handleClientIdSubmit = () => {
    if (clientIdForUsername.trim().length < 3) {
      setError('Please enter a valid client ID');
      return;
    }
    setShowClientIdDialog(false);
    // Note: SetUsernameModal component would be shown here (to be added later)
    setError('Username feature coming soon!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Header */}
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>CollectoVault</Text>
          <Text style={styles.tagline}>Earn & Thrive</Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* Step Title */}
          <View style={styles.headerSection}>
            <Text style={styles.stepTitle}>
              {loginStep === 'id_entry' ? 'Sign In' : 'Verify Identity'}
            </Text>
            <Text style={styles.stepDescription}>
              {loginStep === 'id_entry'
                ? 'Enter your Client ID or Username to continue'
                : 'Enter the 6-digit code sent to your device'}
            </Text>
          </View>

          {/* Error/Success Message */}
          {error && (
            <View
              style={[
                styles.messageBox,
                error.toLowerCase().includes('sent') ||
                error.toLowerCase().includes('success')
                  ? styles.messageSuccess
                  : styles.messageError,
              ]}
            >
              <Text style={styles.messageText}>{error}</Text>
            </View>
          )}

          {/* ID Entry Step */}
          {loginStep === 'id_entry' ? (
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>CLIENT ID OR USERNAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Client ID or username"
                  placeholderTextColor="#999"
                  value={idOrUsername}
                  onChangeText={(text) => {
                    setIdOrUsername(text);
                    setError('');
                  }}
                  editable={!isProcessing}
                  autoCapitalize="none"
                  autoComplete="off"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isProcessing && styles.buttonDisabled,
                ]}
                onPress={handleIdSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#1a1a1a" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Continue</Text>
                    <Text style={styles.primaryButtonIcon}>→</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSetUsernameClick}
              >
                <Text style={styles.secondaryButtonIcon}>👤</Text>
                <Text style={styles.secondaryButtonText}>Create Username</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // OTP Entry Step
            <View style={styles.formSection}>
              <View style={styles.otpInputContainer}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="000000"
                  placeholderTextColor="#ccc"
                  value={otpValue}
                  onChangeText={(text) => {
                    const val = text.replace(/\D/g, '');
                    if (val.length <= 6) {
                      setOtpValue(val);
                      setError('');
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isProcessing}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isProcessing && styles.buttonDisabled,
                ]}
                onPress={handleOtpSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#1a1a1a" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify Code</Text>
                )}
              </TouchableOpacity>

              <View style={styles.secondaryActionsContainer}>
                <TouchableOpacity
                  disabled={isProcessing}
                  onPress={handleResendOtp}
                >
                  <Text style={styles.secondaryAction}>🔄 RESEND CODE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={isProcessing}
                  onPress={() => {
                    setLoginStep('id_entry');
                    setError('');
                  }}
                >
                  <Text style={styles.tertiaryAction}>← Use a different ID</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>© 2026 CollectoVault</Text>
      </ScrollView>

      {/* Client ID Dialog Modal */}
      <Modal
        visible={showClientIdDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClientIdDialog(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Client ID</Text>
            <Text style={styles.modalDescription}>
              Please enter your client ID to create a username
            </Text>

            {error && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{error}</Text>
              </View>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 324CV38"
              placeholderTextColor="#999"
              value={clientIdForUsername}
              onChangeText={(text) => {
                setClientIdForUsername(text);
                setError('');
              }}
              autoCapitalize="none"
              autoFocus
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowClientIdDialog(false);
                  setClientIdForUsername('');
                  setError('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleClientIdSubmit}
              >
                <Text style={styles.modalConfirmButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '500',
    color: '#999',
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.05,
    shadowRadius: 50,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  headerSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  messageBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageError: {
    backgroundColor: '#FEE2E2',
  },
  messageSuccess: {
    backgroundColor: '#ECFDF5',
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  messageError_text: {
    color: '#991B1B',
  },
  messageSuccess_text: {
    color: '#065F46',
  },
  formSection: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: '#fafafa',
    color: '#1a1a1a',
  },
  otpInputContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  otpInput: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e5e5',
    borderRadius: 16,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: '#fafafa',
    color: '#1a1a1a',
  },
  primaryButton: {
    backgroundColor: '#e1d7e0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  primaryButtonIcon: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F8E9F1',
    borderWidth: 1,
    borderColor: '#E8C5D8',
    gap: 8,
  },
  secondaryButtonIcon: {
    fontSize: 16,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D81B60',
  },
  secondaryActionsContainer: {
    gap: 16,
    marginTop: 16,
  },
  secondaryAction: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  tertiaryAction: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ccc',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 50,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  modalErrorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '500',
    backgroundColor: '#fafafa',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#d0d0d0',
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
});
