import { useHelpFeedback } from "@/src/context/HelpFeedbackContext";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HelpScreen() {
  const { openChatModal, openFeedbackModal, openRatingModal, contextData } =
    useHelpFeedback();
  const canRate = Boolean(contextData.transactionId);

  const handlePhoneCall = () => {
    Linking.openURL("tel:0775634567");
  };

  const handleEmail = () => {
    Linking.openURL("mailto:info@cissytech.com");
  };

  const handleWhatsApp = () => {
    Linking.openURL("https://wa.me/256775618385");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Help at your fingertips</Text>
          <Text style={styles.heroSubtitle}>
            Get fast support with chat, feedback, rating and quick answers.
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => openChatModal()}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, styles.chatIcon]}>
              <Feather name="message-circle" size={20} color="#1D4ED8" />
            </View>
            <Text style={styles.actionTitle}>Live Chat</Text>
            <Text style={styles.actionText}>Talk with support instantly.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => openFeedbackModal("general")}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, styles.feedbackIcon]}>
              <Feather name="edit-3" size={20} color="#C2410C" />
            </View>
            <Text style={styles.actionTitle}>Send Feedback</Text>
            <Text style={styles.actionText}>Share your thoughts with us.</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionCard, !canRate && styles.actionCardDisabled]}
            onPress={() =>
              canRate && contextData.transactionId
                ? openRatingModal(contextData.transactionId)
                : openFeedbackModal("general")
            }
            activeOpacity={0.85}
            disabled={!canRate}
          >
            <View style={[styles.actionIcon, styles.ratingIcon]}>
              <Feather name="star" size={20} color="#B45309" />
            </View>
            <Text style={styles.actionTitle}>Rate Experience</Text>
            <Text style={styles.actionText}>
              {canRate
                ? "Rate your latest transaction."
                : "Available after a purchase."}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => openFeedbackModal("general")}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, styles.faqIcon]}>
              <Feather name="help-circle" size={20} color="#7C3AED" />
            </View>
            <Text style={styles.actionTitle}>Quick FAQ</Text>
            <Text style={styles.actionText}>
              Find answers to common questions.
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact support</Text>
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
              <Text style={styles.contactEmoji}>📧</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>info@cissytech.com</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactCard}
              onPress={handleWhatsApp}
            >
              <Text style={styles.contactEmoji}>💬</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>WhatsApp</Text>
                <Text style={styles.contactValue}>0775618385</Text>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handlePhoneCall}
          >
            <Text style={styles.contactButtonText}>
              Call support: 0775634567
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick answers</Text>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I earn points?</Text>
            <Text style={styles.faqAnswer}>
              Earn points automatically every time you purchase through
              CollectoVault.
            </Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Where is my history?</Text>
            <Text style={styles.faqAnswer}>
              Open the Statement tab to view all transactions, points and
              redemptions.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    maxWidth: "90%",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    minHeight: 145,
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
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
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: "row",
    gap: 12,
  },
  contactCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  contactEmoji: {
    fontSize: 22,
    marginBottom: 10,
  },
  contactInfo: {
    gap: 4,
  },
  contactLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  contactButton: {
    marginTop: 16,
    backgroundColor: "#d81b60",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  contactButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  faqItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
});
