import React, { useEffect, useRef, useState } from "react";
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
import {
    getConversation,
    markChatMessageAsRead,
    sendChatMessage,
} from "../src/api/feedback";

interface ChatMessage {
  id: number;
  customerId: number;
  senderType: "customer" | "support";
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface LiveChatModalProps {
  visible: boolean;
  onClose: () => void;
  customerId: number;
}

export default function LiveChatModal({
  visible,
  onClose,
  customerId,
}: LiveChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      loadConversation();
    }
  }, [visible, customerId]);

  const loadConversation = async () => {
    try {
      const data = await getConversation(customerId, 50, 0);
      setMessages(data);

      // Mark unread messages as read
      for (const msg of data) {
        if (!msg.isRead && msg.senderType === "support") {
          await markChatMessageAsRead(msg.id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
      setError("Failed to load conversation");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const message = await sendChatMessage({
        customerId,
        message: newMessage.trim(),
      });

      setMessages([...messages, message]);
      setNewMessage("");
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
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
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Live Chat Support</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Messages Container */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No messages yet. Start a conversation!
                </Text>
              </View>
            ) : (
              messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    msg.senderType === "customer"
                      ? styles.customerMessageRow
                      : styles.supportMessageRow,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      msg.senderType === "customer"
                        ? styles.customerMessage
                        : styles.supportMessage,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        msg.senderType === "customer"
                          ? styles.customerMessageText
                          : styles.supportMessageText,
                      ]}
                    >
                      {msg.message}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        msg.senderType === "customer"
                          ? styles.customerMessageTime
                          : styles.supportMessageTime,
                      ]}
                    >
                      {formatTime(msg.createdAt)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Message Input */}
          <View style={styles.inputContainer}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Type your message..."
                value={newMessage}
                onChangeText={setNewMessage}
                maxLength={500}
                editable={!loading}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (loading || !newMessage.trim()) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={loading || !newMessage.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.charCount}>{newMessage.length}/500</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#6B7280",
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  messageRow: {
    marginVertical: 6,
    flexDirection: "row",
  },
  customerMessageRow: {
    justifyContent: "flex-end",
  },
  supportMessageRow: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  customerMessage: {
    backgroundColor: "#3B82F6",
  },
  supportMessage: {
    backgroundColor: "#E5E7EB",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  customerMessageText: {
    color: "white",
  },
  supportMessageText: {
    color: "#1F2937",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  customerMessageTime: {
    color: "#BFDBFE",
  },
  supportMessageTime: {
    color: "#9CA3AF",
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    backgroundColor: "white",
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  sendButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  charCount: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
});
