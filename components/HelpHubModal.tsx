import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useHelpFeedback } from '@/src/context/HelpFeedbackContext';
import { useAuth } from '@/src/context/AuthContext';
import FeedbackModal from './FeedbackModal';
import RatingModal from './RatingModal';
import LiveChatModal from './LiveChatModal';

const { height } = Dimensions.get('window');

export default function HelpHubModal() {
  const { showHelpHub, closeHelpHub, currentPage, setCurrentPage, unreadCount, contextData } = useHelpFeedback();
  const { user } = useAuth();
  const [showChildModal, setShowChildModal] = useState(false);

  const handleMainActions = (action: string) => {
    if (action === 'feedback') {
      setCurrentPage('feedback');
      setShowChildModal(true);
    } else if (action === 'rating') {
      setCurrentPage('rating');
      setShowChildModal(true);
    } else if (action === 'chat') {
      setCurrentPage('chat');
      setShowChildModal(true);
    } else if (action === 'faq') {
      setCurrentPage('faq');
      setShowChildModal(true);
    }
  };

  const handleChildModalClose = () => {
    setShowChildModal(false);
  };

  const mainContent = (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Help & Support</Text>
        <TouchableOpacity onPress={closeHelpHub}>
          <Feather name="x" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.optionsGrid}>
          {/* Feedback Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleMainActions('feedback')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#fff3e0' }]}>
              <Feather name="message-square" size={32} color="#f57c00" />
            </View>
            <Text style={styles.optionTitle}>Send Feedback</Text>
            <Text style={styles.optionDesc}>Share your thoughts and suggestions</Text>
          </TouchableOpacity>

          {/* Rating Option */}
          {contextData.transactionId && (
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleMainActions('rating')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#fff9c4' }]}>
                <Feather name="star" size={32} color="#fbc02d" />
              </View>
              <Text style={styles.optionTitle}>Rate Transaction</Text>
              <Text style={styles.optionDesc}>Share your experience</Text>
            </TouchableOpacity>
          )}

          {/* Live Chat Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleMainActions('chat')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#e3f2fd' }]}>
              <Feather name="message-circle" size={32} color="#1976d2" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.optionTitle}>Live Chat</Text>
            <Text style={styles.optionDesc}>Chat with our support team</Text>
          </TouchableOpacity>

          {/* FAQ Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleMainActions('faq')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#f3e5f5' }]}>
              <Feather name="help-circle" size={32} color="#7b1fa2" />
            </View>
            <Text style={styles.optionTitle}>FAQ</Text>
            <Text style={styles.optionDesc}>Find quick answers</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Feather name="info" size={20} color="#d81b60" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Response Time</Text>
              <Text style={styles.infoText}>Usually within 2 hours on business days</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const faqContent = (
    <View style={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentPage('main')} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Frequently Asked Questions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.faqList}>
          {[
            {
              q: 'How do I make a payment?',
              a: 'Navigate to your invoice and tap "Pay Now". You can use mobile money or loyalty points.',
            },
            {
              q: 'Can I use loyalty points for payments?',
              a: 'Yes! You can use your loyalty points to partially or fully pay your invoices.',
            },
            {
              q: 'How long does payment take?',
              a: 'Payments are usually processed instantly. You\'ll receive a confirmation immediately.',
            },
            {
              q: 'What if my payment failed?',
              a: 'Check your connection and try again. If it persists, contact our support team via live chat.',
            },
            {
              q: 'How do I earn loyalty points?',
              a: 'You earn points on every transaction. More points = higher loyalty tier and more benefits!',
            },
          ].map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.q}</Text>
              <Text style={styles.faqAnswer}>{item.a}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <>
      <Modal 
        visible={showHelpHub} 
        transparent 
        animationType="slide" 
        onRequestClose={closeHelpHub}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.backdrop}>
            <View style={styles.modal}>
              {currentPage === 'main' ? mainContent : faqContent}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Child Modals */}
      {showChildModal && currentPage === 'feedback' && (
        <FeedbackModal
          visible={true}
          onClose={handleChildModalClose}
          clientId={Number(user?.clientId) || 0}
          initialType={(contextData.feedbackType as any) || 'general'}
        />
      )}

      {showChildModal && currentPage === 'rating' && contextData.transactionId && (
        <RatingModal
          visible={true}
          onClose={handleChildModalClose}
          clientId={Number(user?.clientId) || 0}
          transactionId={contextData.transactionId}
        />
      )}

      {showChildModal && currentPage === 'chat' && (
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
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    width: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  optionsGrid: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 8,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#f44336',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  infoSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#f57c00',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
