import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../src/constants/theme';

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Terms of Service',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using the Green Palace application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. We reserve the right to modify these terms at any time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Eligibility</Text>
          <Text style={styles.paragraph}>
            You must be at least 18 years of age to use our services. By using the application, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Account Registration</Text>
          <Text style={styles.paragraph}>
            To access certain features, you must register for an account. You agree to:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Provide accurate and complete information</Text>
            <Text style={styles.listItem}>• Maintain the security of your account credentials</Text>
            <Text style={styles.listItem}>• Notify us immediately of any unauthorized access</Text>
            <Text style={styles.listItem}>• Accept responsibility for all activities under your account</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Conduct</Text>
          <Text style={styles.paragraph}>
            When using our services, you agree not to:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Violate any applicable laws or regulations</Text>
            <Text style={styles.listItem}>• Infringe on the rights of others</Text>
            <Text style={styles.listItem}>• Send spam or unsolicited communications</Text>
            <Text style={styles.listItem}>• Attempt to gain unauthorized access to our systems</Text>
            <Text style={styles.listItem}>• Use automated systems to access our services</Text>
            <Text style={styles.listItem}>• Engage in fraudulent or deceptive activities</Text>
            <Text style={styles.listItem}>• Harass, abuse, or harm other users</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Game Credits</Text>
          <Text style={styles.paragraph}>
            Game Credits (GC) are virtual currency used within the platform. The following terms apply:
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• Credits have no cash value and cannot be exchanged for real money</Text>
            <Text style={styles.listItem}>• Credits are non-transferable except through authorized platform features</Text>
            <Text style={styles.listItem}>• We reserve the right to modify credit values and conversion rates</Text>
            <Text style={styles.listItem}>• Unused credits may expire according to our policies</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            All content, features, and functionality of the application are owned by Green Palace and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our prior written consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Termination</Text>
          <Text style={styles.paragraph}>
            We may suspend or terminate your account at any time for violations of these terms or for any other reason at our discretion. Upon termination, your right to use the services will immediately cease, and any remaining credits may be forfeited.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Disclaimer of Warranties</Text>
          <Text style={styles.paragraph}>
            The application is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the services will be uninterrupted, secure, or error-free.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            To the fullest extent permitted by law, Green Palace shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the services, even if we have been advised of the possibility of such damages.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Indemnification</Text>
          <Text style={styles.paragraph}>
            You agree to indemnify and hold harmless Green Palace and its affiliates from any claims, damages, losses, or expenses arising from your use of the services or violation of these terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms of Service shall be governed by and construed in accordance with applicable laws. Any disputes arising from these terms or your use of the services shall be resolved through binding arbitration.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Information</Text>
          <Text style={styles.paragraph}>
            For questions about these Terms of Service, please contact us through the in-app support system or by submitting a support ticket.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  lastUpdated: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  paragraph: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  list: {
    marginTop: Spacing.sm,
    marginLeft: Spacing.md,
  },
  listItem: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
});
