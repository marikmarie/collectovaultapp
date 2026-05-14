import { useAuth } from "@/src/context/AuthContext";
import { useHelpFeedback } from "@/src/context/HelpFeedbackContext";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import FeedbackModal from "./FeedbackModal";
import LiveChatModal from "./LiveChatModal";
import RatingModal from "./RatingModal";

const { height } = Dimensions.get("window");

export default function HelpHubModal() {
  const {
    showHelpHub,
    closeHelpHub,
    currentPage,
    setCurrentPage,
    unreadCount,
    contextData,
    showFeedbackModal,
    closeFeedbackModal,
    showRatingModal,
    closeRatingModal,
    showChatModal,
    closeChatModal,
  } = useHelpFeedback();
  const { user } = useAuth();
  const [showChildModal, setShowChildModal] = useState(false);

  const handleMainActions = (action: string) => {
    if (action === "feedback") {
      setCurrentPage("feedback");
      setShowChildModal(true);
    } else if (action === "rating") {
      setCurrentPage("rating");
      setShowChildModal(true);
    } else if (action === "chat") {
      setCurrentPage("chat");
      setShowChildModal(true);
    } else if (action === "faq") {
      setCurrentPage("faq");
      setShowChildModal(true);
    }
  };

  const handleChildModalClose = () => {
    setShowChildModal(false);
  };

  const hasTransaction = Boolean(contextData.transactionId);

  const mainContent = (
    <View style={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Help Center</Text>
          <Text style={styles.subtitle}>
            Fast support, chat, feedback and FAQs in one place.
          </Text>
        </View>
        <TouchableOpacity onPress={closeHelpHub} style={styles.closeButton}>
          <Feather name="x" size={24} color="#4B5563" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.optionRow}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleMainActions("chat")}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, styles.chatIcon]}>
              <Feather name="message-circle" size={28} color="#2563EB" />
            </View>
            <Text style={styles.optionTitle}>Live Chat</Text>
            <Text style={styles.optionDesc}>Talk with support instantly.</Text>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleMainActions("feedback")}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, styles.feedbackIcon]}>
              <Feather name="message-square" size={28} color="#EA580C" />
            </View>
            <Text style={styles.optionTitle}>Send Feedback</Text>
            <Text style={styles.optionDesc}>
              Share your experience with us.
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.optionRow}>
          <TouchableOpacity
            style={[styles.optionCard, !hasTransaction && styles.disabledCard]}
            onPress={() => handleMainActions("rating")}
            activeOpacity={0.8}
            disabled={!hasTransaction}
          >
            <View style={[styles.iconContainer, styles.ratingIcon]}>
              <Feather name="star" size={28} color="#F59E0B" />
            </View>
            <Text style={styles.optionTitle}>Rate Transaction</Text>
            <Text style={styles.optionDesc}>
              {hasTransaction
                ? "Rate your latest transaction."
                : "Available after a transaction."}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleMainActions("faq")}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, styles.faqIcon]}>
              <Feather name="help-circle" size={28} color="#9333EA" />
            </View>
            <Text style={styles.optionTitle}>Browse FAQ</Text>
            <Text style={styles.optionDesc}>
              Quick answers to common questions.
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickInfoCard}>
          <Feather name="clock" size={18} color="#2563EB" />
          <Text style={styles.quickInfoText}>
            Support response time: typically under 2 hours.
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  const faqContent = (
    <View style={styles.content}>
      <View style={styles.faqHeader}>
        <TouchableOpacity
          onPress={() => setCurrentPage("main")}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text style={[styles.title, styles.faqTitle]}>
          Frequently Asked Questions
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {[
          {
            q: "How do I make a payment?",
            a: "Tap Pay Now on your invoice and follow the mobile money prompts.",
          },
          {
            q: "Can I use loyalty points?",
            a: "Yes — points can cover part or all of a payment.",
          },
          {
            q: "Payment time?",
            a: "Most payments process instantly with confirmation shown right away.",
          },
          {
            q: "Payment failed?",
            a: "Retry with a stable network or contact support via live chat.",
          },
        ].map((item, index) => (
          <View key={index} style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{item.q}</Text>
            <Text style={styles.faqAnswer}>{item.a}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <>
      <Modal
        visible={showHelpHub}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        hardwareAccelerated
        onRequestClose={closeHelpHub}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <TouchableWithoutFeedback onPress={closeHelpHub}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback onPress={() => null}>
                <View style={styles.modal}>
                  {currentPage === "main" ? mainContent : faqContent}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {showChildModal && currentPage === "feedback" && (
        <FeedbackModal
          visible={true}
          onClose={handleChildModalClose}
          clientId={Number(user?.clientId) || 0}
          initialType={(contextData.feedbackType as any) || "general"}
        />
      )}

      {showChildModal &&
        currentPage === "rating" &&
        contextData.transactionId && (
          <RatingModal
            visible={true}
            onClose={handleChildModalClose}
            clientId={Number(user?.clientId) || 0}
            transactionId={contextData.transactionId}
          />
        )}

      {showChildModal && currentPage === "chat" && (
        <LiveChatModal
          visible={true}
          onClose={handleChildModalClose}
          clientId={Number(user?.clientId) || 0}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    overflow: "hidden",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  closeButton: {
    padding: 8,
  },
  backButton: {
    width: 32,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
  },
  faqTitle: {
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    maxWidth: 240,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  optionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    minHeight: 150,
  },
  disabledCard: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  chatIcon: {
    backgroundColor: "#DBEAFE",
  },
  feedbackIcon: {
    backgroundColor: "#FFEDD5",
  },
  ratingIcon: {
    backgroundColor: "#FEF3C7",
  },
  faqIcon: {
    backgroundColor: "#EDE9FE",
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  optionDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
  notificationBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  notificationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  quickInfoCard: {
    marginTop: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quickInfoText: {
    color: "#2563EB",
    fontSize: 14,
    lineHeight: 20,
  },
  faqItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  faqAnswer: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 20,
  },
});
