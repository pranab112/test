import React, { useState, useEffect } from 'react';
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
  Share,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNotifications } from '../../src/contexts/NotificationContext';
import { settingsApi } from '../../src/api/settings.api';
import { referralsApi, ReferralCode, ReferralStats, Referral } from '../../src/api/referrals.api';
import { offersApi, CreditTransferResponse } from '../../src/api/offers.api';
import { friendsApi } from '../../src/api/friends.api';
import { Card, Avatar, Button, Input, Loading, Badge } from '../../src/components/ui';
import type { Friend } from '../../src/types';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';

export default function PlayerSettingsScreen() {
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
  const [savingProfile, setSavingProfile] = useState(false);

  // Email verification modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Referrals modal
  const [showReferralsModal, setShowReferralsModal] = useState(false);
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Credit transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clients, setClients] = useState<Friend[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const loadReferralData = async () => {
    setLoadingReferrals(true);
    try {
      const [codeData, statsData, listData] = await Promise.all([
        referralsApi.getMyCode().catch(() => null),
        referralsApi.getStats().catch(() => null),
        referralsApi.getList().catch(() => []),
      ]);
      if (codeData) setReferralCode(codeData);
      if (statsData) setReferralStats(statsData);
      setReferrals(listData || []);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const handleGenerateReferralCode = async () => {
    setGeneratingCode(true);
    try {
      const newCode = await referralsApi.generateCode();
      setReferralCode(newCode);
      Alert.alert('Success', 'Referral code generated!');
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to generate referral code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyReferralCode = async () => {
    if (referralCode?.code) {
      await Clipboard.setStringAsync(referralCode.code);
      Alert.alert('Copied', 'Referral code copied to clipboard!');
    }
  };

  const handleShareReferralCode = async () => {
    if (referralCode?.code) {
      try {
        await Share.share({
          message: `Join Green Palace using my referral code: ${referralCode.code}`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  useEffect(() => {
    if (showReferralsModal) {
      loadReferralData();
    }
  }, [showReferralsModal]);

  // Load clients for credit transfer
  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const friends = await friendsApi.getFriends();
      const clientFriends = friends.filter((f) => f.user_type === 'client');
      setClients(clientFriends);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (showTransferModal) {
      loadClients();
    }
  }, [showTransferModal]);

  const handleTransferCredits = async () => {
    if (!selectedClientId) {
      Alert.alert('Error', 'Please select a client to transfer to');
      return;
    }
    const amount = parseInt(transferAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (user?.credits && amount > user.credits) {
      Alert.alert('Error', 'Insufficient credits');
      return;
    }

    setTransferring(true);
    try {
      const result = await offersApi.transferCredits({
        client_id: selectedClientId,
        amount: amount,
      });
      Alert.alert(
        'Success',
        `Transferred ${result.credits_transferred} GC ($${result.dollar_value.toFixed(2)}) to ${result.to_client}`
      );
      setShowTransferModal(false);
      setTransferAmount('');
      setSelectedClientId(null);
      await refreshUser(); // Refresh user to update balance
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to transfer credits');
    } finally {
      setTransferring(false);
    }
  };

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
      await settingsApi.updateProfile({ full_name: fullName });
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
            name={user?.full_name || user?.username}
            size="xl"
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.full_name || user?.username}
            </Text>
            <Text style={styles.profileUsername}>@{user?.username}</Text>
            <View style={styles.emailRow}>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              {user?.is_email_verified && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              )}
            </View>
          </View>
        </View>
        <View style={styles.profileStats}>
          <View style={styles.profileStat}>
            <Text style={styles.statValue}>Level {user?.player_level || 1}</Text>
            <Text style={styles.statLabel}>Player Level</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.profileStat}>
            <Text style={styles.statValue}>{user?.credits || 0} GC</Text>
            <Text style={styles.statLabel}>Game Credits</Text>
          </View>
        </View>
        {user?.user_id && (
          <TouchableOpacity
            style={styles.uniqueIdContainer}
            onPress={async () => {
              await Clipboard.setStringAsync(user.user_id);
              Alert.alert('Copied!', 'Your unique ID has been copied to clipboard. Share it with clients to add you.');
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

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.settingsCard}>
          <SettingsItem
            icon="person"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => {
              setFullName(user?.full_name || '');
              setShowProfileModal(true);
            }}
          />
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
                // Pre-fill with user's email if available
                if (user?.email) {
                  setVerificationEmail(user.email);
                }
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

      {/* Quick Access */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <Card style={styles.settingsCard}>
          <SettingsItem
            icon="business"
            title="My Clients"
            subtitle="View and add clients"
            onPress={() => router.push('/(player)/friends')}
          />
          <SettingsItem
            icon="globe"
            title="Community"
            subtitle="Posts and discussions"
            onPress={() => router.push('/(player)/community')}
          />
          <SettingsItem
            icon="megaphone"
            title="Announcements"
            subtitle="News and updates"
            onPress={() => router.push('/(player)/broadcasts')}
          />
        </Card>
      </View>

      {/* Credits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Credits</Text>
        <Card style={styles.settingsCard}>
          <View style={styles.balanceDisplay}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Your Balance</Text>
              <Text style={styles.balanceAmount}>{user?.credits || 0} GC</Text>
              <Text style={styles.balanceDollar}>= ${((user?.credits || 0) / 100).toFixed(2)}</Text>
            </View>
            <Ionicons name="wallet" size={40} color={Colors.primary} />
          </View>
          <SettingsItem
            icon="send"
            title="Send Credits"
            subtitle="Transfer GC to a client"
            onPress={() => setShowTransferModal(true)}
          />
        </Card>
      </View>

      {/* Referrals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Referrals</Text>
        <Card style={styles.settingsCard}>
          <SettingsItem
            icon="gift"
            title="My Referrals"
            subtitle="Invite friends & earn rewards"
            onPress={() => setShowReferralsModal(true)}
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
            onPress={() => router.push('/(player)/notifications')}
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
          <SettingsItem
            icon="megaphone"
            title="Promotions & Rewards"
            subtitle="Get notified about offers"
            showArrow={false}
            rightElement={
              <Switch
                value={notificationSettings?.promotions_rewards ?? true}
                onValueChange={async (value) => {
                  setUpdatingNotification(true);
                  try {
                    await updateSettings({ promotions_rewards: value });
                  } catch (error) {
                    Alert.alert('Error', 'Failed to update notification settings');
                  }
                  setUpdatingNotification(false);
                }}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primary + '50' }}
                thumbColor={notificationSettings?.promotions_rewards ? Colors.primary : Colors.textMuted}
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
            icon="alert-circle"
            title="Reports & Warnings"
            subtitle="View reports and resolve warnings"
            onPress={() => router.push('/reports')}
          />
          <SettingsItem
            icon="document-text"
            title="Terms of Service"
            onPress={() => router.push('/terms')}
          />
          <SettingsItem
            icon="shield"
            title="Privacy Policy"
            onPress={() => router.push('/privacy')}
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
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              leftIcon="person-outline"
            />

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

      {/* Referrals Modal */}
      <Modal
        visible={showReferralsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReferralsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Referrals</Text>
              <TouchableOpacity onPress={() => setShowReferralsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {loadingReferrals ? (
              <View style={styles.loadingContainer}>
                <Loading text="Loading referrals..." />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Referral Code Section */}
                <Card style={styles.referralCodeCard}>
                  <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
                  {referralCode?.code ? (
                    <>
                      <View style={styles.referralCodeBox}>
                        <Text style={styles.referralCodeText}>{referralCode.code}</Text>
                      </View>
                      <View style={styles.referralActions}>
                        <TouchableOpacity
                          style={styles.referralActionButton}
                          onPress={handleCopyReferralCode}
                        >
                          <Ionicons name="copy-outline" size={20} color={Colors.primary} />
                          <Text style={styles.referralActionText}>Copy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.referralActionButton}
                          onPress={handleShareReferralCode}
                        >
                          <Ionicons name="share-outline" size={20} color={Colors.primary} />
                          <Text style={styles.referralActionText}>Share</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <Button
                      title="Generate Referral Code"
                      onPress={handleGenerateReferralCode}
                      loading={generatingCode}
                      style={styles.generateButton}
                    />
                  )}
                </Card>

                {/* Stats Section */}
                {referralStats && (
                  <Card style={styles.referralStatsCard}>
                    <Text style={styles.referralStatsTitle}>Referral Stats</Text>
                    <View style={styles.referralStatsGrid}>
                      <View style={styles.referralStatItem}>
                        <Text style={styles.referralStatValue}>
                          {referralStats.total_referrals}
                        </Text>
                        <Text style={styles.referralStatLabel}>Total</Text>
                      </View>
                      <View style={styles.referralStatItem}>
                        <Text style={[styles.referralStatValue, { color: Colors.success }]}>
                          {referralStats.completed_referrals}
                        </Text>
                        <Text style={styles.referralStatLabel}>Completed</Text>
                      </View>
                      <View style={styles.referralStatItem}>
                        <Text style={[styles.referralStatValue, { color: Colors.warning }]}>
                          {referralStats.pending_referrals}
                        </Text>
                        <Text style={styles.referralStatLabel}>Pending</Text>
                      </View>
                      <View style={styles.referralStatItem}>
                        <Text style={[styles.referralStatValue, { color: Colors.primary }]}>
                          {referralStats.total_credits_earned} GC
                        </Text>
                        <Text style={styles.referralStatLabel}>Earned</Text>
                      </View>
                    </View>
                  </Card>
                )}

                {/* Referrals List */}
                {referrals.length > 0 && (
                  <View style={styles.referralsListSection}>
                    <Text style={styles.referralsListTitle}>Referred Users</Text>
                    {referrals.map((referral) => (
                      <Card key={referral.id} style={styles.referralItem}>
                        <View style={styles.referralItemHeader}>
                          <Avatar
                            source={referral.referred_profile_picture}
                            name={referral.referred_full_name || referral.referred_username}
                            size="sm"
                          />
                          <View style={styles.referralItemInfo}>
                            <Text style={styles.referralItemName}>
                              {referral.referred_full_name || referral.referred_username}
                            </Text>
                            <Text style={styles.referralItemDate}>
                              {new Date(referral.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.referralStatusBadge,
                              {
                                backgroundColor:
                                  referral.status === 'completed'
                                    ? Colors.success + '20'
                                    : referral.status === 'pending'
                                    ? Colors.warning + '20'
                                    : Colors.error + '20',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.referralStatusText,
                                {
                                  color:
                                    referral.status === 'completed'
                                      ? Colors.success
                                      : referral.status === 'pending'
                                      ? Colors.warning
                                      : Colors.error,
                                },
                              ]}
                            >
                              {referral.status}
                            </Text>
                          </View>
                        </View>
                        {referral.status === 'completed' && (
                          <Text style={styles.referralBonus}>
                            +{referral.bonus_amount} GC earned
                          </Text>
                        )}
                      </Card>
                    ))}
                  </View>
                )}

                {referrals.length === 0 && referralCode?.code && (
                  <View style={styles.emptyReferrals}>
                    <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
                    <Text style={styles.emptyReferralsText}>
                      No referrals yet. Share your code to invite friends!
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Transfer Credits Modal */}
      <Modal
        visible={showTransferModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Credits</Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Balance Display */}
            <View style={styles.transferBalanceCard}>
              <Text style={styles.transferBalanceLabel}>Your Balance</Text>
              <Text style={styles.transferBalanceAmount}>{user?.credits || 0} GC</Text>
              <Text style={styles.transferBalanceDollar}>= ${((user?.credits || 0) / 100).toFixed(2)}</Text>
            </View>

            {/* Amount Input */}
            <View style={styles.transferSection}>
              <Text style={styles.transferSectionTitle}>Amount to Send</Text>
              <TextInput
                style={styles.transferInput}
                placeholder="Enter amount in GC"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                value={transferAmount}
                onChangeText={setTransferAmount}
              />
              {transferAmount && parseInt(transferAmount) > 0 && (
                <Text style={styles.transferDollarPreview}>
                  = ${(parseInt(transferAmount) / 100).toFixed(2)}
                </Text>
              )}
              <Text style={styles.transferRate}>Rate: 100 GC = $1</Text>
            </View>

            {/* Client Selection */}
            <View style={styles.transferSection}>
              <Text style={styles.transferSectionTitle}>Select Client</Text>
              {loadingClients ? (
                <View style={styles.loadingClients}>
                  <Loading text="Loading clients..." />
                </View>
              ) : clients.length === 0 ? (
                <View style={styles.noClients}>
                  <Ionicons name="business-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.noClientsText}>No connected clients</Text>
                  <Text style={styles.noClientsSubtext}>Add clients as friends to transfer credits</Text>
                </View>
              ) : (
                <ScrollView style={styles.clientsList} nestedScrollEnabled>
                  {clients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={[
                        styles.clientItem,
                        selectedClientId === client.id && styles.clientItemSelected,
                      ]}
                      onPress={() => setSelectedClientId(client.id)}
                    >
                      <Avatar
                        source={client.profile_picture}
                        name={client.company_name || client.username}
                        size="sm"
                      />
                      <View style={styles.clientInfo}>
                        <Text style={styles.clientName}>
                          {client.company_name || client.full_name || client.username}
                        </Text>
                        <Text style={styles.clientUsername}>@{client.username}</Text>
                      </View>
                      {selectedClientId === client.id && (
                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Transfer Button */}
            <Button
              title={`Send ${transferAmount || '0'} GC`}
              onPress={handleTransferCredits}
              loading={transferring}
              disabled={!selectedClientId || !transferAmount || parseInt(transferAmount) <= 0 || clients.length === 0}
              icon={<Ionicons name="send" size={18} color={Colors.background} />}
              style={styles.transferButton}
            />
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
    marginBottom: Spacing.md,
  },
  profileInfo: {
    marginLeft: Spacing.md,
    flex: 1,
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
  profileStats: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
  notificationBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  // Referral styles
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  referralCodeCard: {
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  referralCodeLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  referralCodeBox: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  referralCodeText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 4,
  },
  referralActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  referralActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  referralActionText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  generateButton: {
    marginTop: Spacing.sm,
  },
  referralStatsCard: {
    marginBottom: Spacing.md,
  },
  referralStatsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  referralStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  referralStatItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  referralStatValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  referralStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  referralsListSection: {
    marginTop: Spacing.sm,
  },
  referralsListTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  referralItem: {
    marginBottom: Spacing.sm,
  },
  referralItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referralItemInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  referralItemName: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  referralItemDate: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  referralStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  referralStatusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: 'capitalize',
  },
  referralBonus: {
    fontSize: FontSize.sm,
    color: Colors.success,
    marginTop: Spacing.sm,
    textAlign: 'right',
  },
  emptyReferrals: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyReferralsText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  // Credits section styles
  balanceDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  balanceAmount: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginVertical: Spacing.xs,
  },
  balanceDollar: {
    fontSize: FontSize.sm,
    color: Colors.success,
  },
  // Transfer modal styles
  transferBalanceCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  transferBalanceLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  transferBalanceAmount: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginVertical: Spacing.xs,
  },
  transferBalanceDollar: {
    fontSize: FontSize.sm,
    color: Colors.success,
  },
  transferSection: {
    marginBottom: Spacing.lg,
  },
  transferSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  transferInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  transferDollarPreview: {
    fontSize: FontSize.sm,
    color: Colors.success,
    marginTop: Spacing.xs,
  },
  transferRate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  loadingClients: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  noClients: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  noClientsText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  noClientsSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  clientsList: {
    maxHeight: 200,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  clientItemSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  clientInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  clientName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  clientUsername: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  transferButton: {
    marginTop: Spacing.md,
  },
});
