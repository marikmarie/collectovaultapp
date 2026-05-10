import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface PostPaymentFeedbackProps {
  visible: boolean;
  invoiceId: string;
  amount: number;
  onClose: () => void;
  onOpenFeedback: () => void;
  onOpenRating: () => void;
}

const { height } = Dimensions.get('window');

export default function PostPaymentFeedback({
  visible,
  invoiceId,
  amount,
  onClose,
  onOpenFeedback,
  onOpenRating,
}: PostPaymentFeedbackProps) {
  const [step, setStep] = useState<'confirmation' | 'options'>(visible ? 'confirmation' : 'options');

  useEffect(() => {
    if (visible) {
      setStep('confirmation');
      // Auto-transition to options after 2 seconds
      const timer = setTimeout(() => setStep('options'), 2000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleFeedback = () => {
    onOpenFeedback();
    onClose();
  };

  const handleRating = () => {
    onOpenRating();
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.backdrop} />
        <View style={styles.modal}>
          {step === 'confirmation' ? (
            <View style={styles.confirmationContent}>
              <View style={styles.checkCircle}>
                <Feather name="check-circle" size={48} color="#4caf50" />
              </View>
              <Text style={styles.confirmTitle}>Payment Successful!</Text>
              <Text style={styles.confirmAmount}>
                UGX {amount.toLocaleString()}
              </Text>
              <Text style={styles.confirmInvoice}>Invoice: {invoiceId}</Text>
              <Text style={styles.loadingText}>Getting feedback options...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.optionsContent}>
              <View style={styles.header}>
                <Text style={styles.title}>Help us improve!</Text>
                <Text style={styles.subtitle}>Your feedback helps us serve you better</Text>
              </View>

              {/* Share Feedback Option */}
              <TouchableOpacity
                style={styles.option}
                onPress={handleFeedback}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  <Feather name="message-square" size={24} color="#f57c00" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Share Feedback</Text>
                  <Text style={styles.optionDesc}>Tell us about your payment experience</Text>
                </View>
                <Feather name="arrow-right" size={20} color="#d81b60" />
              </TouchableOpacity>

              {/* Rate Transaction Option */}
              <TouchableOpacity
                style={styles.option}
                onPress={handleRating}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  <Feather name="star" size={24} color="#fbc02d" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Rate This Transaction</Text>
                  <Text style={styles.optionDesc}>Rate order, payment, and service quality</Text>
                </View>
                <Feather name="arrow-right" size={20} color="#d81b60" />
              </TouchableOpacity>

              {/* Skip Option */}
              <TouchableOpacity
                style={[styles.option, styles.skipOption]}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Maybe Later</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {step === 'options' && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleSkip}
            >
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: height * 0.7,
    width: '100%',
    overflow: 'hidden',
    zIndex: 1000,
  },
  confirmationContent: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  checkCircle: {
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  confirmAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4caf50',
    marginBottom: 8,
  },
  confirmInvoice: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 13,
    color: '#d81b60',
    fontStyle: 'italic',
  },
  optionsContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: '#999',
  },
  skipOption: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
});
