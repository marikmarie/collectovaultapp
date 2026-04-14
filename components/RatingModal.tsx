import React, { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { createRating } from "../api/feedback";

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  customerId: number;
  transactionId: number;
  onSuccess?: () => void;
}

interface StarRatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function StarRating({ label, value, onChange }: StarRatingProps) {
  return (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onChange(star)}
            style={styles.starButton}
          >
            <Text
              style={[
                styles.starText,
                {
                  color: star <= value ? "#FBBF24" : "#D1D5DB",
                },
              ]}
            >
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {value > 0 && <Text style={styles.ratingValue}>{value} star(s)</Text>}
    </View>
  );
}

export default function RatingModal({
  visible,
  onClose,
  customerId,
  transactionId,
  onSuccess,
}: RatingModalProps) {
  const [orderRating, setOrderRating] = useState(0);
  const [paymentRating, setPaymentRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (
      orderRating === 0 ||
      paymentRating === 0 ||
      serviceRating === 0 ||
      overallRating === 0
    ) {
      setError("Please rate all categories");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createRating({
        customerId,
        transactionId,
        orderRating,
        paymentRating,
        serviceRating,
        overallRating,
        comment: comment || undefined,
      });

      setOrderRating(0);
      setPaymentRating(0);
      setServiceRating(0);
      setOverallRating(0);
      setComment("");
      onClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit rating");
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Rate Your Experience</Text>
          <Text style={styles.subtitle}>
            Please rate your experience with our service
          </Text>

          <ScrollView
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
          >
            <StarRating
              label="Order Quality"
              value={orderRating}
              onChange={setOrderRating}
            />

            <StarRating
              label="Payment Experience"
              value={paymentRating}
              onChange={setPaymentRating}
            />

            <StarRating
              label="Service Quality"
              value={serviceRating}
              onChange={setServiceRating}
            />

            <StarRating
              label="Overall Experience"
              value={overallRating}
              onChange={setOverallRating}
            />

            <View style={styles.commentsSection}>
              <Text style={styles.commentLabel}>
                Additional Comments (Optional)
              </Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your feedback..."
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={500}
              />
              <Text style={styles.charCount}>{comment.length}/500</Text>
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
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
    marginBottom: 16,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  starButton: {
    padding: 8,
  },
  starText: {
    fontSize: 24,
  },
  ratingValue: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  commentsSection: {
    marginTop: 12,
    marginBottom: 16,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
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
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#1F2937",
  },
});
