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
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
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

  // Profile picture
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const handlePickProfilePicture = async () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera permission is required to take photos');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              await uploadProfilePicture(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Gallery permission is required to select photos');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              await uploadProfilePicture(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Remove Photo',
          style: 'destructive',
          onPress: async () => {
            if (!user?.profile_picture) {
              Alert.alert('Info', 'No profile picture to remove');
              return;
            }
            setUploadingPicture(true);
            try {
              await settingsApi.deleteProfilePicture();
              await refreshUser();
              Alert.alert('Success', 'Profile picture removed');
            } catch (error: any) {
              Alert.alert('Error', error?.detail || 'Failed to remove profile picture');
            } finally {
              setUploadingPicture(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadProfilePicture = async (imageUri: string) => {
    setUploadingPicture(true);
    try {
      await settingsApi.uploadProfilePicture(imageUri);
      await refreshUser();
      Alert.alert('Success', 'Profile picture updated');
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
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
          <TouchableOpacity onPress={handlePickProfilePicture} disabled={uploadingPicture}>
            <View style={styles.avatarContainer}>
              <Avatar
                source={user?.profile_picture}
                name={user?.company_name || user?.username}
                size="xl"
              />
              {uploadingPicture ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={Colors.text} size="small" />
                </View>
              ) : (
                <View style={styles.avatarCameraIcon}>
                  <Ionicons name="camera" size={16} color={Colors.text} />
                </View>
              )}
            </View>
          </TouchableOpacity>
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
            icon="game-controller"
            title="Manage Games"
            subtitle="Select games to offer players"
            onPress={() => router.push('/(client)/games')}
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
            icon="star"
            title="Reviews"
            subtitle="View and write reviews"
            onPress={() => router.push('/reviews')}
          />
          <SettingsItem
            icon="alert-circle"
            title="Reports & Warnings"
            subtitle="View reports and resolve warnings"
            onPress={() => router.push('/reports')}
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
  avatarContainer: {
    position: 'relative',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
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
  notificationBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
