import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import { Button, Input } from '../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../src/constants/theme';
import { UserType } from '../src/types';

interface FormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  company_name: string;
  client_identifier: string;
  referral_code: string;
}

interface FormErrors {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  company_name?: string;
  client_identifier?: string;
}

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const [selectedType, setSelectedType] = useState<UserType>(UserType.PLAYER);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    company_name: '',
    client_identifier: '',
    referral_code: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (selectedType === UserType.PLAYER && !formData.client_identifier.trim()) {
      newErrors.client_identifier = 'Client username or company name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      const registerData: any = {
        email: formData.email.trim(),
        username: formData.username.trim(),
        password: formData.password,
        user_type: selectedType,
      };

      if (formData.full_name.trim()) {
        registerData.full_name = formData.full_name.trim();
      }

      if (selectedType === UserType.CLIENT && formData.company_name.trim()) {
        registerData.company_name = formData.company_name.trim();
      }

      if (selectedType === UserType.PLAYER) {
        registerData.client_identifier = formData.client_identifier.trim();
      }

      if (formData.referral_code.trim()) {
        registerData.referral_code = formData.referral_code.trim();
      }

      await register(registerData);

      if (selectedType === UserType.CLIENT) {
        Alert.alert(
          'Registration Successful',
          'Your client account is pending admin approval. You will be notified when approved.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      } else {
        Alert.alert(
          'Registration Successful',
          'Your player account is pending client approval. The client will review your request.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      }
    } catch (error: any) {
      let message = 'Registration failed. Please try again.';

      if (error?.detail) {
        message = error.detail;
      } else if (error?.error?.message) {
        message = error.error.message;
      } else if (error?.message) {
        message = error.message;
      }

      Alert.alert('Registration Failed', message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            accessibilityLabel="Green Palace logo"
          />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Green Palace today</Text>
        </View>

        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === UserType.PLAYER && styles.typeButtonActive,
            ]}
            onPress={() => setSelectedType(UserType.PLAYER)}
          >
            <Ionicons
              name="game-controller"
              size={20}
              color={selectedType === UserType.PLAYER ? Colors.background : Colors.textSecondary}
            />
            <Text
              style={[
                styles.typeButtonText,
                selectedType === UserType.PLAYER && styles.typeButtonTextActive,
              ]}
            >
              Player
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === UserType.CLIENT && styles.typeButtonActive,
            ]}
            onPress={() => setSelectedType(UserType.CLIENT)}
          >
            <Ionicons
              name="business"
              size={20}
              color={selectedType === UserType.CLIENT ? Colors.background : Colors.textSecondary}
            />
            <Text
              style={[
                styles.typeButtonText,
                selectedType === UserType.CLIENT && styles.typeButtonTextActive,
              ]}
            >
              Client
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="your@email.com"
            value={formData.email}
            onChangeText={(v) => updateField('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="mail-outline"
            error={errors.email}
          />

          <Input
            label="Username"
            placeholder="Choose a username"
            value={formData.username}
            onChangeText={(v) => updateField('username', v)}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="person-outline"
            error={errors.username}
          />

          <Input
            label="Full Name (Optional)"
            placeholder="Your full name"
            value={formData.full_name}
            onChangeText={(v) => updateField('full_name', v)}
            leftIcon="person-circle-outline"
          />

          {selectedType === UserType.CLIENT && (
            <Input
              label="Company Name (Optional)"
              placeholder="Your company name"
              value={formData.company_name}
              onChangeText={(v) => updateField('company_name', v)}
              leftIcon="business-outline"
              error={errors.company_name}
            />
          )}

          {selectedType === UserType.PLAYER && (
            <Input
              label="Client Username or Company"
              placeholder="Enter client username or company"
              value={formData.client_identifier}
              onChangeText={(v) => updateField('client_identifier', v)}
              autoCapitalize="none"
              leftIcon="business-outline"
              error={errors.client_identifier}
            />
          )}

          <Input
            label="Password"
            placeholder="Create a password"
            value={formData.password}
            onChangeText={(v) => updateField('password', v)}
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChangeText={(v) => updateField('confirmPassword', v)}
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.confirmPassword}
          />

          <Input
            label="Referral Code (Optional)"
            placeholder="Enter referral code for bonus"
            value={formData.referral_code}
            onChangeText={(v) => updateField('referral_code', v)}
            autoCapitalize="characters"
            leftIcon="gift-outline"
          />

          {selectedType === UserType.CLIENT && (
            <View style={[styles.infoBox, styles.infoBoxWarning]}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.warning} />
              <Text style={styles.infoBoxText}>
                Client accounts require admin approval before you can login.
              </Text>
            </View>
          )}

          {selectedType === UserType.PLAYER && (
            <View style={[styles.infoBox, styles.infoBoxInfo]}>
              <Ionicons name="information-circle" size={20} color={Colors.info} />
              <View style={styles.infoBoxContent}>
                <Text style={[styles.infoBoxText, styles.infoBoxTitle]}>
                  Player Registration
                </Text>
                <Text style={styles.infoBoxText}>
                  Enter the username or company name of the client you want to register under.
                  The client will need to approve your account.
                </Text>
              </View>
            </View>
          )}

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            style={styles.registerButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  backButton: {
    marginBottom: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginTop: Spacing.md,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.background,
  },
  form: {
    gap: Spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  infoBoxWarning: {
    backgroundColor: Colors.warning + '15',
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  infoBoxInfo: {
    backgroundColor: Colors.info + '15',
    borderWidth: 1,
    borderColor: Colors.info + '30',
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  infoBoxText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  registerButton: {
    marginTop: Spacing.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
