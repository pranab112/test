import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import { Colors, FontSize, FontWeight, Spacing } from '../src/constants/theme';
import { Loading } from '../src/components/ui';
import { UserType } from '../src/types';

export default function SplashScreen() {
  const { isLoading, isAuthenticated, userType } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && userType) {
        // Redirect based on user type
        if (userType === UserType.PLAYER) {
          router.replace('/(player)/home');
        } else if (userType === UserType.CLIENT) {
          router.replace('/(client)/dashboard');
        } else {
          // Admin - for now redirect to login (admin might need web access)
          router.replace('/login');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated, userType]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Ionicons name="git-network" size={80} color={Colors.primary} />
        <Text style={styles.title}>Green Palace</Text>
        <Text style={styles.subtitle}>Premium Sweepstakes Platform</Text>
      </View>
      <Loading text="Loading..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginTop: Spacing.md,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
