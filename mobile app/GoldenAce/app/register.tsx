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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import { Button, Input } from '../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../src/constants/theme';
import { UserType } from '../src/types';

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const [selectedType, setSelectedType] = useState<UserType>(UserType.PLAYER);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (selectedType === UserType.CLIENT && !formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required for clients';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.fullName.trim() || undefined,
        user_type: selectedType,
        company_name: selectedType === UserType.CLIENT ? formData.companyName.trim() : undefined,
      });

      // Navigation is handled by auth context
      if (selectedType === UserType.PLAYER) {
        router.replace('/(player)/home');
      } else if (selectedType === UserType.CLIENT) {
        router.replace('/(client)/dashboard');
      }
    } catch (error: any) {
      const message = error?.detail || error?.error?.message || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', message);
    }
  };

  const updateFormData = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
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
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Ionicons name="diamond" size={48} color={Colors.primary} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join GoldenAce today</Text>
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
            label="Username"
            placeholder="Choose a username"
            value={formData.username}
            onChangeText={(v) => updateFormData('username', v)}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="person-outline"
            error={errors.username}
          />
          <Input
            label="Email"
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(v) => updateFormData('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="mail-outline"
            error={errors.email}
          />
          <Input
            label="Full Name (Optional)"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChangeText={(v) => updateFormData('fullName', v)}
            leftIcon="text-outline"
          />
          {selectedType === UserType.CLIENT && (
            <Input
              label="Company Name"
              placeholder="Enter your company name"
              value={formData.companyName}
              onChangeText={(v) => updateFormData('companyName', v)}
              leftIcon="business-outline"
              error={errors.companyName}
            />
          )}
          <Input
            label="Password"
            placeholder="Create a password"
            value={formData.password}
            onChangeText={(v) => updateFormData('password', v)}
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.password}
          />
          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChangeText={(v) => updateFormData('confirmPassword', v)}
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.confirmPassword}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            style={styles.registerButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.back()}>
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
  },
  backButton: {
    marginBottom: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
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
  registerButton: {
    marginTop: Spacing.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
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
