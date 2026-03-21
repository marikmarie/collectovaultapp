import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d81b60',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 12,
    color: '#d81b60',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  button: {
    backgroundColor: '#d81b60',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  faqQuestion: {
    fontSize: 14,
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

export default function HelpScreen() {
  const handlePhoneCall = () => {
    Linking.openURL('tel:0775634567');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:info@cissytech.com');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/256775618385');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>Get answers and assistance</Text>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          
          <View style={styles.card}>
            <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
              <Text style={styles.contactIcon}>📧</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email Support</Text>
                <Text style={styles.contactValue}>info@cissytech.com</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactItem} onPress={handlePhoneCall}>
              <Text style={styles.contactIcon}>📱</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>0775634567</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactItem} onPress={handleWhatsApp}>
              <Text style={styles.contactIcon}>💬</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>WhatsApp</Text>
                <Text style={styles.contactValue}>0775618385</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.contactItem}>
              <Text style={styles.contactIcon}>⏰</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Available</Text>
                <Text style={styles.contactValue}>24/7 Support</Text>
              </View>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I earn points?</Text>
            <Text style={styles.faqAnswer}>
              You earn points every time you make a purchase at our partner stores. The points are automatically added to your account.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I redeem my points?</Text>
            <Text style={styles.faqAnswer}>
              Yes! Navigate to the Spend Points section to browse available rewards and redeem your points.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What are tiers?</Text>
            <Text style={styles.faqAnswer}>
              Tiers are membership levels based on your spending. Higher tiers unlock better rewards and benefits. Check Tier Benefits for details.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I check my transaction history?</Text>
            <Text style={styles.faqAnswer}>
              Go to the Statement tab to view all your transactions, points earned, and redemptions.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is my data secure?</Text>
            <Text style={styles.faqAnswer}>
              Yes, we use industry-standard encryption and security measures to protect your personal and financial information.
            </Text>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About CollectoVault</Text>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Our Mission</Text>
            <Text style={styles.cardText}>
              To provide a seamless rewards experience that values your loyalty and gives you more for your purchases.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Version 1.0</Text>
            <Text style={styles.cardText}>
              Thank you for using CollectoVault! We&apos;re constantly improving to serve you better.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
