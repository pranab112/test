import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNotifications } from '../../src/contexts/NotificationContext';
import { settingsApi } from '../../src/api/settings.api';
import { Card, Avatar, Button, Badge, Input } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';

export default function ClientSettingsScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { settings: notificationSettings, unreadCount, updateSettings } = useNotifications();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [updatingNotification, setUpdatingNotification] = useState(false);

  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile edit modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Email verification modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await settingsApi.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUpdateProfile = async () => {
    setSavingProfile(true);
    try {
      await settingsApi.updateProfile({
        full_name: fullName,
        company_name: companyName,
        bio: bio,
      });
      await refreshUser();
      Alert.alert('Success', 'Profile updated successfully');
      setShowProfileModal(false);
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendOTP = async () => {
    if (!verificationEmail.trim() || !verificationEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    setVerifyingEmail(true);
    try {
      await settingsApi.sendEmailVerificationOTP(verificationEmail.trim());
      setOtpSent(true);
      Alert.alert('Success', 'Verification code sent to your email');
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to send verification code');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleResendOTP = async () => {
    setVerifyingEmail(true);
    try {
      await settingsApi.resendEmailOTP();
      Alert.alert('Success', 'New verification code sent');
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to resend verification code');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit code');
      return;
    }
    setVerifyingEmail(true);
    try {
      await settingsApi.verifyEmailOTP(otpCode);
      await refreshUser();
      Alert.alert('Success', 'Email verified successfully');
      setShowEmailModal(false);
      setOtpCode('');
      setOtpSent(false);
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Invalid verification code');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const SettingsItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    showArrow = true,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingsItemIcon}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <View style={styles.settingsItemContent}>
        <Text style={styles.settingsItemTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
        )}
      </View>
      {rightElement || (showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      ))}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Section */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Avatar
            source={user?.profile_picture}
            name={user?.company_name || user?.username}
            size="xl"
          />
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>
                {user?.company_name || user?.username}
              </Text>
              <Badge text="Client" variant="emerald" size="sm" />
            </View>
            <Text style={styles.profileUsername}>@{user?.username}</Text>
            <View style={styles.emailRow}>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              {user?.is_email_verified && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              )}
            </View>
          </View>
        </View>
        {user?.user_id && (
          <TouchableOpacity
            style={styles.uniqueIdContainer}
            onPress={async () => {
              await Clipboard.setStringAsync(user.user_id);
              Alert.alert('Copied!', 'Your unique ID has been copied to clipboard. Share it with players to add you.');
            }}
          >
            <View style={styles.uniqueIdLeft}>
              <Ionicons name="finger-print" size={20} color={Colors.primary} />
              <View>
                <Text style={styles.uniqueIdLabel}>Your Unique ID</Text>
                <Text style={styles.uniqueIdValue}>{user.user_id}</Text>
              </View>
            </View>
            <Ionicons name="copy-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </Card>

      {/* Business Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business</Text>
        <Card style={styles.settingsCard}>
          <SettingsItem
            icon="business"
            title="Company Profile"
            subtitle="Update your business information"
            onPress={() => {
              setFullName(user?.full_name || '');
              setCompanyName(user?.company_name || '');
              setBio(user?.bio || '');
              setShowProfileModal(true);
            }}
          />
          <SettingsItem
            icon="card"
            title="Payment Methods"
            subtitle="Manage payment options"
            onPress={() => Alert.alert('Coming Soon', 'Payment settings will be available soon')}
          />
          <SettingsItem
            icon="wallet"
            title="Buy Credits"
            subtitle="Purchase game credits with crypto"
            onPress={() => router.push('/(client)/buy-credits')}
          />
          <SettingsItem
            icon="analytics"
            title="Analytics"
            subtitle="View detailed reports"
            onPress={() => Alert.alert('Coming Soon', 'Analytics will be available soon')}
          />
        </Card>
      </View>

      {/* Players */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Players</Text>
        <Card style={styles.settingsCard}>
          <SettingsItem
            icon="person-add"
            title="Add Player"
            subtitle="Add a player using their unique ID"
            onPress={() => router.push('/(client)/friends')}
          />
          <SettingsItem
            icon="people"
            title="My Players"
            subtitle="View and manage your players"
            onPress={() => router.push('/(client)/players')}
          />
          <SettingsItem
            icon="key"
            title="Player Credentials"
            subtitle="Manage game credentials for players"
            onPress={() => router.push('/(client)/credentials')}
          />
        </Card>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.settingsCard}>
          <SettingsItem
            icon="lock-closed"
            title="Change Password"
            subtitle="Update your password"
            onPress={() => setShowPasswordModal(true)}
          />
          <SettingsItem
            icon="mail"
            title="Email Verification"
            subtitle={user?.is_email_verified ? 'Verified' : 'Not verified - Tap to verify'}
            onPress={() => {
              if (!user?.is_email_verified) {
                setShowEmailModal(true);
              }
            }}
            rightElement={
              user?.is_email_verified ? (
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              ) : undefined
            }
          />
          <SettingsItem
            icon="shield-checkmark"
            title="Two-Factor Authentication"
            subtitle={user?.two_factor_enabled ? 'Enabled' : 'Disabled'}
            onPress={() => Alert.alert('Coming Soon', '2FA setup will be available soon')}
          />
        </Card>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.settingsCard}>
          <SettingsItem
            icon="notifications"
            title="Notification Center"
            subtitle="View all notifications"
            onPress={() => router.push('/(client)/notifications')}
            rightElement={
              unreadCount > 0 ? (
                <View style={styles.notificationBadgeContainer}>
                  <Badge text={unreadCount.toString()} variant="primary" size="sm" />
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                </View>
              ) : undefined
            }
          />
          <SettingsItem
            icon="volume-high"
            title="Notification Sounds"
            subtitle="Play sound for new notifications"
            showArrow={false}
            rightElement={
              <Switch
                value={notificationSettings?.notification_sounds ?? true}
                onValueChange={async (value) => {
                  setUpdatingNotification(true);
                  try {
                    await updateSettings({ notification_sounds: value });
                  } catch (error) {
                    Alert.alert('Error', 'Failed to update notification settings');
                  }
                  setUpdatingNotification(false);
                }}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary + '50' }}
                thumbColor={notificationSettings?.notification_sounds ? Colors.primary : Colors.textMuted}
                disabled={updatingNotification}
              />
            }
          />
          <SettingsItem
            icon="paper-plane"
            title="Push Notifications"
            subtitle="Receive push notifications"
            showArrow={false}
            rightElement={
              <Switch
                value={notificationSettings?.push_notifications ?? true}
                onValueChange={async (value) => {
                  setUpdatingNotification(true);
                  try {
                    await updateSettings({ push_notifications: value });
                  } catch (error) {
                    Alert.alert('Error', 'Failed to update notification settings');
                  }
                  setUpdatingNotification(false);
                }}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary + '50' }}
                thumbColor={notificationSettings?.push_notifications ? Colors.primary : Colors.textMuted}
                disabled={updatingNotification}
              />
            }
          />
          <SettingsItem
            icon="chatbubble"
            title="Message Notifications"
            subtitle="Get notified for new messages"
            showArrow={false}
            rightElement={
              <Switch
                value={notificationSettings?.messages ?? true}
                onValueChange={async (value) => {
                  setUpdatingNotification(true);
                  try {
                    await updateSettings({ messages: value });
                  } catch (error) {
                    Alert.alert('Error', 'Failed to update notification settings');
                  }
                  setUpdatingNotification(false);
                }}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary + '50' }}
                thumbColor={notificationSettings?.messages ? Colors.primary : Colors.textMuted}
                disabled={updatingNotification}
              />
            }
          />
        </Card>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <Card style={styles.settingsCard}>
          <SettingsItem
            icon="moon"
            title="Theme"
            subtitle="Dark mode"
            onPress={() => Alert.alert('Theme', 'Dark mode is enabled by default')}
          />
        </Card>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <Card style={styles.settingsCard}>
          <SettingsItem
            icon="help-circle"
            title="Help Center"
            subtitle="Get help & submit tickets"
            onPress={() => router.push('/support')}
          />
          <SettingsItem
            icon="chatbubble-ellipses"
            title="Contact Support"
            subtitle="Create support ticket"
            onPress={() => router.push('/support')}
          />
          <SettingsItem
            icon="megaphone"
            title="Announcements"
            subtitle="News and updates"
            onPress={() => router.push('/(client)/broadcasts')}
          />
          <SettingsItem
            icon="document-text"
            title="Terms of Service"
            onPress={() => Alert.alert('Terms', 'Terms of Service')}
          />
          <SettingsItem
            icon="shield"
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy', 'Privacy Policy')}
          />
        </Card>
      </View>

      {/* Logout */}
      <Button
        title="Logout"
        onPress={handleLogout}
        variant="outline"
        loading={isLoggingOut}
        style={styles.logoutButton}
        icon={<Ionicons name="log-out" size={20} color={Colors.error} />}
        textStyle={{ color: Colors.error }}
      />

      <Text style={styles.versionText}>Green Palace v1.0.0</Text>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Input
              label="Current Password"
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />
            <Input
              label="New Password"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />
            <Input
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            <Text style={styles.passwordHint}>
              Password must be at least 6 characters long
            </Text>

            <Button
              title="Change Password"
              onPress={handleChangePassword}
              loading={changingPassword}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Input
              label="Full Name"
              placeholder="Your full name"
              value={fullName}
              onChangeText={setFullName}
              leftIcon="person-outline"
            />

            <Input
              label="Company Name"
              placeholder="Your company name"
              value={companyName}
              onChangeText={setCompanyName}
              leftIcon="business-outline"
            />

            <View style={styles.bioContainer}>
              <Text style={styles.bioLabel}>Bio</Text>
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about your company..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <Button
              title="Save Changes"
              onPress={handleUpdateProfile}
              loading={savingProfile}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>

      {/* Email Verification Modal */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Email</Text>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {!otpSent ? (
              <>
                <Text style={styles.modalText}>
                  Enter your email address to receive a verification code
                </Text>
                <Input
                  placeholder="Enter your email"
                  value={verificationEmail}
                  onChangeText={setVerificationEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                />
                <Button
                  title="Send Verification Code"
                  onPress={handleSendOTP}
                  loading={verifyingEmail}
                  style={styles.modalButton}
                />
              </>
            ) : (
              <>
                <Text style={styles.modalText}>
                  Enter the 6-digit code sent to {verificationEmail}
                </Text>
                <TextInput
                  style={styles.otpInput}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="000000"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                />
                <Button
                  title="Verify Email"
                  onPress={handleVerifyEmail}
                  loading={verifyingEmail}
                  style={styles.modalButton}
                />
                <TouchableOpacity onPress={handleResendOTP} style={styles.resendButton}>
                  <Text style={styles.resendText}>Resend Code</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  profileCard: {
    marginBottom: Spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  profileName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  profileUsername: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  uniqueIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  uniqueIdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  uniqueIdLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  uniqueIdValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  settingsItemSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    marginTop: Spacing.md,
    borderColor: Colors.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  modalButton: {
    marginTop: Spacing.md,
  },
  passwordHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  bioContainer: {
    marginBottom: Spacing.md,
  },
  bioLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  bioInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    height: 100,
  },
  otpInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.xxl,
    color: Colors.text,
    letterSpacing: 10,
    marginBottom: Spacing.md,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  resendText: {
    color: Colors.primary,
    fontSize: FontSize.md,
  },
  notificationBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
