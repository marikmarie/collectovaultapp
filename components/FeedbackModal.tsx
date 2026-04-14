import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { createFeedback } from "../src/api/feedback";

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  customerId: number;
  onSuccess?: () => void;
  initialType?: 'order' | 'service' | 'app' | 'general';
}

export default function FeedbackModal({
  visible,
  onClose,
  customerId,
  onSuccess,
  initialType = 'general',
}: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<'order' | 'service' | 'app' | 'general'>(initialType);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const feedbackTypes = [
    { value: 'general', label: 'General' },
    { value: 'order', label: 'Order Related' },
    { value: 'service', label: 'Service Quality' },
    { value: 'app', label: 'App/Website' },
  ];

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createFeedback({
        customerId,
        feedbackType,
        title: title.trim(),
        message: message.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        setTitle("");
        setMessage("");
        setFeedbackType('general');
        setSuccess(false);
        onClose();
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {success ? (
            <View style={styles.successContainer}>
              <Text style={styles.successEmoji}>✓</Text>
              <Text style={styles.successTitle}>Thank you for your feedback!</Text>
              <Text style={styles.successMessage}>
                We appreciate your input and will review it soon.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Send Feedback</Text>

              <ScrollView style={styles.scrollView}>
                <View style={styles.section}>
                  <Text style={styles.label}>Feedback Category *</Text>
                  <ScrollView horizontal style={styles.typeButtons}>
                    {feedbackTypes.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.typeButton,
                          feedbackType === type.value && styles.typeButtonActive,
                        ]}
                        onPress={() => setFeedbackType(type.value as any)}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            feedbackType === type.value &&
                              styles.typeButtonTextActive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Subject *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Brief subject of your feedback..."
                    value={title}
                    onChangeText={setTitle}
                    maxLength={255}
                  />
                  <Text style={styles.charCount}>{title.length}/255</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Message *</Text>
                  <TextInput
                    style={[styles.input, styles.messageInput]}
                    placeholder="Describe your feedback in detail..."
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                  />
                  <Text style={styles.charCount}>{message.length}/2000</Text>
                </View>

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>Send Feedback</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: "70%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginRight: 8,
  },
  typeButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  typeButtonText: {
    fontSize: 12,
    color: "#6B7280",
  },
  typeButtonTextActive: {
    color: "white",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  messageInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cancelButtonText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#1F2937",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    fontWeight: "600",
    fontSize: 14,
    color: "white",
  },
});
