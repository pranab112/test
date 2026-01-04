import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import { authApi, settingsApi, referralsApi } from '@/api/endpoints';
import type { ReferralCodeResponse, ReferralStats, ReferredUser, ReferralListResponse } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  MdSecurity,
  MdNotifications,
  MdAccountCircle,
  MdShare,
  MdContentCopy,
  MdRefresh,
  MdVerified,
  MdUpload,
  MdDelete,
  MdWarning,
  MdCheck,
} from 'react-icons/md';
import { FaSave, FaGift, FaUsers, FaClock, FaCheckCircle } from 'react-icons/fa';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'referrals';

export function SettingsSection() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
  });

  // Security form state
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [show2FADisableModal, setShow2FADisableModal] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret: string;
    qr_code: string;
    backup_codes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Email verification state
  const [emailVerified, setEmailVerified] = useState(false);
  const [showEmailVerifyModal, setShowEmailVerifyModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [emailOTP, setEmailOTP] = useState('');
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    promotionNotifications: true,
    friendRequestNotifications: true,
    messageNotifications: true,
  });

  // Profile picture
  const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Referral state
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referralList, setReferralList] = useState<ReferredUser[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  // Load initial data
  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setInitialLoading(true);
    try {
      // Set profile data from user
      setProfileData({
        username: user.username || '',
        fullName: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      setProfilePicture(user.profile_picture);
      setEmailVerified(user.is_email_verified || false);
      setTwoFactorEnabled(user.two_factor_enabled || false);

      // Load 2FA status
      try {
        const twoFAStatus = await settingsApi.get2FAStatus();
        setTwoFactorEnabled(twoFAStatus.enabled);
      } catch {
        // 2FA status endpoint may not exist yet
      }

      // Load email verification status
      try {
        const emailStatus = await settingsApi.getEmailVerificationStatus();
        setEmailVerified(emailStatus.is_email_verified);
        setEmailVerificationPending(emailStatus.verification_pending);
        if (emailStatus.secondary_email) {
          setVerificationEmail(emailStatus.secondary_email);
        }
      } catch {
        // Email status endpoint may not exist
      }

      // Load referral data
      loadReferralData();
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadReferralData = async () => {
    setLoadingReferrals(true);
    try {
      // Get referral code
      const codeResponse = await referralsApi.getMyCode();
      setReferralCode(codeResponse.referral_code);
      setReferralLink(codeResponse.referral_link);

      // Get stats
      const stats = await referralsApi.getStats();
      setReferralStats(stats);

      // Get list of referrals
      const listResponse = await referralsApi.getList();
      setReferralList(listResponse.referrals);
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await settingsApi.updateProfile({
        full_name: profileData.fullName,
        phone: profileData.phone,
      });

      // Update local user state
      if (user) {
        const updatedUser = {
          ...user,
          full_name: profileData.fullName,
          phone: profileData.phone,
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to update profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!securityData.currentPassword || !securityData.newPassword || !securityData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (securityData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(securityData.currentPassword, securityData.newPassword);
      toast.success('Password changed successfully!');
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      const errorMessage = error?.error?.message || error?.message || error?.detail || 'Failed to change password';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 2FA Functions
  const handleSetup2FA = async () => {
    setLoading(true);
    try {
      const setup = await settingsApi.setup2FA();
      setTwoFactorSetup(setup);
      setShow2FASetupModal(true);
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to initialize 2FA setup');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await settingsApi.verify2FA(verificationCode);
      setTwoFactorEnabled(true);
      setShowBackupCodes(true);
      toast.success('Two-factor authentication enabled successfully!');
    } catch (error: any) {
      toast.error(error?.detail || 'Invalid verification code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!verificationCode) {
      toast.error('Please enter your verification code');
      return;
    }

    setLoading(true);
    try {
      await settingsApi.disable2FA(verificationCode);
      setTwoFactorEnabled(false);
      setShow2FADisableModal(false);
      setVerificationCode('');
      toast.success('Two-factor authentication disabled');
    } catch (error: any) {
      toast.error(error?.detail || 'Invalid verification code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (twoFactorSetup?.backup_codes) {
      navigator.clipboard.writeText(twoFactorSetup.backup_codes.join('\n'));
      toast.success('Backup codes copied to clipboard');
    }
  };

  // Email Verification Functions
  const handleSendVerificationEmail = async () => {
    if (!verificationEmail || !verificationEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await settingsApi.sendEmailVerificationOTP(verificationEmail);
      setEmailVerificationPending(true);
      toast.success('Verification code sent! Check your email.');
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to send verification email');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    if (!emailOTP || emailOTP.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await settingsApi.verifyEmailOTP(emailOTP);
      setEmailVerified(true);
      setShowEmailVerifyModal(false);
      setEmailOTP('');
      toast.success('Email verified successfully!');

      // Update user state
      if (user) {
        const updatedUser = { ...user, is_email_verified: true };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error: any) {
      toast.error(error?.detail || 'Invalid verification code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await settingsApi.resendEmailOTP();
      toast.success('New verification code sent!');
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to resend code. Please wait before trying again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Profile Picture Functions
  const handleUploadProfilePicture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setUploadingPicture(true);
    try {
      const result = await settingsApi.uploadProfilePicture(user.id, file);
      setProfilePicture(result.profile_picture_url);

      const updatedUser = { ...user, profile_picture: result.profile_picture_url };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Profile picture updated successfully');
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to upload profile picture');
      console.error(error);
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!user || !confirm('Remove your profile picture?')) return;

    setLoading(true);
    try {
      await settingsApi.deleteProfilePicture(user.id);
      setProfilePicture(undefined);

      const updatedUser = { ...user, profile_picture: undefined };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Profile picture removed');
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to remove profile picture');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      await settingsApi.updateNotificationSettings({
        email_notifications: notificationSettings.emailNotifications,
        promotion_updates: notificationSettings.promotionNotifications,
        message_alerts: notificationSettings.messageNotifications,
        review_alerts: notificationSettings.friendRequestNotifications,
        report_updates: true,
      });
      toast.success('Notification preferences saved!');
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to update notification settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Referral Functions
  const handleCopyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success('Referral code copied!');
    }
  };

  const handleCopyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied!');
    }
  };

  const handleRegenerateCode = async () => {
    if (!confirm('Are you sure you want to generate a new referral code? Your old code will stop working.')) {
      return;
    }

    setLoadingReferrals(true);
    try {
      const response = await referralsApi.regenerateCode();
      setReferralCode(response.referral_code);
      setReferralLink(response.referral_link);
      toast.success('New referral code generated!');
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to generate new code');
      console.error(error);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm('This will log you out of all devices including this one. Continue?')) return;

    setLoading(true);
    try {
      await settingsApi.logoutAllSessions();
      toast.success('Logged out of all devices');
      authApi.logout();
      window.location.href = '/login';
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to logout all devices');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'expired':
        return <Badge variant="danger">Expired</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account settings and preferences</p>
      </div>

      {/* Account Overview Card */}
      <div className="bg-gradient-to-r from-gold-900/40 to-yellow-900/40 border-2 border-gold-700 rounded-lg p-6">
        <div className="flex items-center gap-6">
          <Avatar name={user?.full_name || user?.username || ''} size="lg" src={profilePicture} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gold-500 mb-1">{user?.username}</h2>
            <p className="text-gray-300 mb-3">{user?.full_name || 'Player'}</p>
            <div className="flex gap-4 flex-wrap">
              <div>
                <p className="text-sm text-gray-400">Level</p>
                <Badge variant="purple" size="lg">Level {user?.level || 1}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-400">Credits</p>
                <Badge variant="warning" size="lg">{(user?.credits || 0).toLocaleString()}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-400">Member Since</p>
                <p className="text-white font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              {emailVerified && (
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <div className="flex items-center gap-1 text-green-400">
                    <MdVerified size={16} />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex gap-2 border-b-2 border-dark-400 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'text-gold-500 border-gold-500'
              : 'text-gray-400 border-transparent hover:text-gold-500'
          }`}
        >
          <MdAccountCircle className="inline mr-2 text-xl" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'security'
              ? 'text-gold-500 border-gold-500'
              : 'text-gray-400 border-transparent hover:text-gold-500'
          }`}
        >
          <MdSecurity className="inline mr-2 text-xl" />
          Security
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'text-gold-500 border-gold-500'
              : 'text-gray-400 border-transparent hover:text-gold-500'
          }`}
        >
          <MdNotifications className="inline mr-2 text-xl" />
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'referrals'
              ? 'text-gold-500 border-gold-500'
              : 'text-gray-400 border-transparent hover:text-gold-500'
          }`}
        >
          <MdShare className="inline mr-2 text-xl" />
          Referrals
        </button>
      </div>

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-6 flex items-center gap-2">
            <MdAccountCircle className="text-2xl" />
            Account Information
          </h2>

          {/* Profile Picture Section */}
          <div className="bg-dark-300 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Profile Picture</h3>
            <div className="flex items-center gap-6">
              <Avatar name={profileData.fullName || user?.username || ''} size="xl" src={profilePicture} />
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadProfilePicture}
                  className="hidden"
                  title="Upload profile picture"
                  aria-label="Upload profile picture"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPicture}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <MdUpload size={18} />
                  {uploadingPicture ? 'Uploading...' : 'Upload New Picture'}
                </button>
                {profilePicture && (
                  <button
                    type="button"
                    onClick={handleDeleteProfilePicture}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <MdDelete size={18} />
                    Remove Picture
                  </button>
                )}
                <p className="text-xs text-gray-400">JPG, PNG or GIF. Max size 2MB.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl">
            <Input
              label="Username"
              value={profileData.username}
              disabled
              onChange={() => {}}
              placeholder="Your username"
            />
            <Input
              label="Full Name"
              value={profileData.fullName}
              onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
              placeholder="Your full name"
            />
            <Input
              label="Email Address"
              type="email"
              value={profileData.email}
              disabled
              onChange={() => {}}
              placeholder="your@email.com"
            />

            {/* Email Verification Section */}
            <div className="bg-dark-300 p-4 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-3">Email Verification</h3>
              {emailVerified ? (
                <div className="flex items-center gap-2 text-green-400">
                  <MdVerified size={20} />
                  <span className="font-medium">Your email is verified</span>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 mb-3">
                    Verify your email address to unlock special rewards and features!
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowEmailVerifyModal(true)}
                    className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Verify Email
                  </button>
                </div>
              )}
            </div>

            <Input
              label="Phone Number (Optional)"
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="+1234567890"
            />
            <div className="pt-4">
              <Button
                onClick={handleSaveProfile}
                loading={loading}
                variant="primary"
              >
                <FaSave className="inline mr-2" />
                Save Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gold-500 mb-6 flex items-center gap-2">
              <MdSecurity className="text-2xl" />
              Change Password
            </h2>
            <div className="space-y-4 max-w-2xl">
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-400">
                  <strong>Security Tips:</strong>
                </p>
                <ul className="text-sm text-gray-300 mt-2 space-y-1 list-disc list-inside">
                  <li>Use at least 8 characters</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Add numbers and special characters</li>
                  <li>Don't reuse passwords from other sites</li>
                </ul>
              </div>
              <Input
                label="Current Password"
                type="password"
                value={securityData.currentPassword}
                onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
              <Input
                label="New Password"
                type="password"
                value={securityData.newPassword}
                onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                placeholder="Enter new password"
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={securityData.confirmPassword}
                onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
              />
              <div className="pt-4">
                <Button
                  onClick={handleChangePassword}
                  loading={loading}
                  variant="primary"
                >
                  <MdSecurity className="inline mr-2" />
                  Change Password
                </Button>
              </div>
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Two-Factor Authentication</h3>
              {twoFactorEnabled && (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <MdCheck size={16} />
                  Enabled
                </span>
              )}
            </div>
            <p className="text-gray-400 mb-4">
              Add an extra layer of security to your account using a time-based one-time password (TOTP).
            </p>
            {twoFactorEnabled ? (
              <button
                type="button"
                onClick={() => setShow2FADisableModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSetup2FA}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Enable 2FA
              </button>
            )}
          </div>

          {/* Active Sessions */}
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">Active Sessions</h3>
            <p className="text-gray-400 mb-4">
              Manage devices where you're currently logged in.
            </p>
            <button
              type="button"
              onClick={handleLogoutAllDevices}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Logout All Devices
            </button>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-6 flex items-center gap-2">
            <MdNotifications className="text-2xl" />
            Notification Preferences
          </h2>
          <div className="space-y-6 max-w-2xl">
            <div className="bg-dark-300 rounded-lg p-4">
              <h3 className="font-bold text-white mb-4">General Notifications</h3>
              <div className="space-y-4">
                <ToggleSetting
                  label="Email Notifications"
                  description="Receive notifications via email"
                  enabled={notificationSettings.emailNotifications}
                  onChange={(enabled) => setNotificationSettings({ ...notificationSettings, emailNotifications: enabled })}
                />
                <ToggleSetting
                  label="Push Notifications"
                  description="Receive push notifications in your browser"
                  enabled={notificationSettings.pushNotifications}
                  onChange={(enabled) => setNotificationSettings({ ...notificationSettings, pushNotifications: enabled })}
                />
              </div>
            </div>

            <div className="bg-dark-300 rounded-lg p-4">
              <h3 className="font-bold text-white mb-4">Specific Notifications</h3>
              <div className="space-y-4">
                <ToggleSetting
                  label="Promotions & Rewards"
                  description="Get notified about new promotions and rewards"
                  enabled={notificationSettings.promotionNotifications}
                  onChange={(enabled) => setNotificationSettings({ ...notificationSettings, promotionNotifications: enabled })}
                />
                <ToggleSetting
                  label="Friend Requests"
                  description="Get notified when someone sends you a friend request"
                  enabled={notificationSettings.friendRequestNotifications}
                  onChange={(enabled) => setNotificationSettings({ ...notificationSettings, friendRequestNotifications: enabled })}
                />
                <ToggleSetting
                  label="Messages"
                  description="Get notified about new messages"
                  enabled={notificationSettings.messageNotifications}
                  onChange={(enabled) => setNotificationSettings({ ...notificationSettings, messageNotifications: enabled })}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSaveNotifications}
                loading={loading}
                variant="primary"
              >
                <FaSave className="inline mr-2" />
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Referrals Tab */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          {/* Referral Code Card */}
          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-2 border-purple-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-600 rounded-full">
                <FaGift className="text-white text-2xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Your Referral Code</h2>
                <p className="text-gray-300">Share this code with friends and earn 500 credits per referral!</p>
              </div>
            </div>

            {loadingReferrals ? (
              <div className="text-center py-4 text-gray-400">Loading referral code...</div>
            ) : (
              <>
                <div className="bg-dark-300 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Your Code</p>
                      <p className="text-3xl font-bold text-gold-500 font-mono tracking-wider">
                        {referralCode || 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyReferralCode}
                        className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <MdContentCopy size={18} />
                        Copy Code
                      </button>
                      <button
                        onClick={handleRegenerateCode}
                        disabled={loadingReferrals}
                        className="bg-dark-400 hover:bg-dark-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        title="Generate new code"
                      >
                        <MdRefresh size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {referralLink && (
                  <div className="bg-dark-300 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">Referral Link</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={referralLink}
                        readOnly
                        className="flex-1 bg-dark-400 text-white px-3 py-2 rounded-lg text-sm"
                      />
                      <button
                        onClick={handleCopyReferralLink}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <MdContentCopy size={18} />
                        Copy Link
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Referral Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FaUsers className="text-gold-500 text-2xl" />
                <div>
                  <p className="text-sm text-gray-400">Total Referrals</p>
                  <p className="text-2xl font-bold text-white">{referralStats?.total_referrals || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-dark-200 border-2 border-green-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FaCheckCircle className="text-green-500 text-2xl" />
                <div>
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-white">{referralStats?.completed_referrals || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-dark-200 border-2 border-yellow-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FaClock className="text-yellow-500 text-2xl" />
                <div>
                  <p className="text-sm text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-white">{referralStats?.pending_referrals || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-dark-200 border-2 border-purple-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FaGift className="text-purple-500 text-2xl" />
                <div>
                  <p className="text-sm text-gray-400">Credits Earned</p>
                  <p className="text-2xl font-bold text-white">{(referralStats?.total_credits_earned || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Referral List */}
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gold-500 mb-4">Your Referrals</h3>
            {referralList.length === 0 ? (
              <div className="text-center py-8">
                <FaUsers className="text-gray-600 text-5xl mx-auto mb-3" />
                <p className="text-gray-400">No referrals yet</p>
                <p className="text-sm text-gray-500">Share your referral code to start earning credits!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-dark-400">
                      <th className="pb-3 text-gray-400 font-medium">User</th>
                      <th className="pb-3 text-gray-400 font-medium">Status</th>
                      <th className="pb-3 text-gray-400 font-medium">Joined</th>
                      <th className="pb-3 text-gray-400 font-medium">Bonus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralList.map((referral) => (
                      <tr key={referral.id} className="border-b border-dark-400">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={referral.full_name || referral.username} size="sm" />
                            <div>
                              <p className="text-white font-medium">{referral.username}</p>
                              {referral.full_name && (
                                <p className="text-sm text-gray-400">{referral.full_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">{getStatusBadge(referral.status)}</td>
                        <td className="py-3 text-gray-300">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          {referral.status === 'completed' ? (
                            <span className="text-green-400 font-medium">+{referral.bonus_amount} credits</span>
                          ) : referral.status === 'pending' ? (
                            <span className="text-yellow-400">Pending approval</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gold-500 mb-4">How Referrals Work</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-gold-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-dark-700">1</span>
                </div>
                <h4 className="font-bold text-white mb-2">Share Your Code</h4>
                <p className="text-gray-400 text-sm">Share your unique referral code with friends</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gold-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-dark-700">2</span>
                </div>
                <h4 className="font-bold text-white mb-2">Friend Signs Up</h4>
                <p className="text-gray-400 text-sm">They register using your referral code</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gold-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-dark-700">3</span>
                </div>
                <h4 className="font-bold text-white mb-2">Earn 500 Credits</h4>
                <p className="text-gray-400 text-sm">Get credited when they're approved!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-red-900/30 border-2 border-red-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-500 mb-4">Danger Zone</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-dark-300 rounded-lg">
            <div>
              <p className="font-medium text-white">Delete Account</p>
              <p className="text-sm text-gray-400">
                Permanently delete your account and all associated data
              </p>
            </div>
            <button
              onClick={() => toast.error('Please contact support to delete your account')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={show2FASetupModal}
        onClose={() => {
          if (!showBackupCodes) {
            setShow2FASetupModal(false);
            setTwoFactorSetup(null);
            setVerificationCode('');
          }
        }}
        title={showBackupCodes ? 'Save Your Backup Codes' : 'Set Up Two-Factor Authentication'}
        size="lg"
      >
        {showBackupCodes ? (
          <div className="space-y-4">
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 flex items-start gap-3">
              <MdWarning className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-yellow-400">
                <strong>Important:</strong> Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </div>
            </div>

            <div className="bg-dark-300 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2">
                {twoFactorSetup?.backup_codes.map((code, index) => (
                  <div key={index} className="font-mono text-center py-2 bg-dark-400 rounded text-white">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={copyBackupCodes}
              className="w-full flex items-center justify-center gap-2 bg-dark-300 hover:bg-dark-400 text-white py-2 rounded-lg transition-colors"
            >
              <MdContentCopy size={18} />
              Copy All Codes
            </button>

            <Button
              onClick={() => {
                setShow2FASetupModal(false);
                setShowBackupCodes(false);
                setTwoFactorSetup(null);
                setVerificationCode('');
              }}
              fullWidth
            >
              I've Saved My Codes
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-400">
              Scan the QR code below with your authenticator app (like Google Authenticator or Authy).
            </p>

            {twoFactorSetup?.qr_code && (
              <div className="flex justify-center">
                <img
                  src={twoFactorSetup.qr_code}
                  alt="2FA QR Code"
                  className="w-48 h-48 bg-white p-2 rounded-lg"
                />
              </div>
            )}

            <div className="bg-dark-300 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Or enter this code manually:</p>
              <code className="block text-center font-mono text-gold-500 break-all">
                {twoFactorSetup?.secret}
              </code>
            </div>

            <Input
              label="Enter 6-digit code from your app"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
            />

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShow2FASetupModal(false);
                  setTwoFactorSetup(null);
                  setVerificationCode('');
                }}
                fullWidth
              >
                Cancel
              </Button>
              <Button onClick={handleVerify2FA} loading={loading} fullWidth>
                Verify & Enable
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 2FA Disable Modal */}
      <Modal
        isOpen={show2FADisableModal}
        onClose={() => {
          setShow2FADisableModal(false);
          setVerificationCode('');
        }}
        title="Disable Two-Factor Authentication"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start gap-3">
            <MdWarning className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-red-400">
              Disabling 2FA will make your account less secure. You'll need to set it up again if you want to re-enable it.
            </div>
          </div>

          <Input
            label="Enter 6-digit code or backup code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.toUpperCase().slice(0, 8))}
            placeholder="Enter code"
          />

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShow2FADisableModal(false);
                setVerificationCode('');
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={handleDisable2FA} loading={loading} fullWidth>
              Disable 2FA
            </Button>
          </div>
        </div>
      </Modal>

      {/* Email Verification Modal */}
      <Modal
        isOpen={showEmailVerifyModal}
        onClose={() => {
          setShowEmailVerifyModal(false);
          setEmailOTP('');
        }}
        title="Verify Your Email"
        size="md"
      >
        <div className="space-y-4">
          {!emailVerificationPending ? (
            <>
              <p className="text-gray-400">
                Enter your email address to receive a verification code.
              </p>
              <Input
                label="Email Address"
                type="email"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowEmailVerifyModal(false)}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button onClick={handleSendVerificationEmail} loading={loading} fullWidth>
                  Send Code
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-400">
                We sent a 6-digit verification code to <strong className="text-white">{verificationEmail}</strong>
              </p>
              <Input
                label="Verification Code"
                type="text"
                value={emailOTP}
                onChange={(e) => setEmailOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
              />
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-gold-500 hover:text-gold-400 text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <MdRefresh size={16} />
                Resend Code
              </button>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEmailVerificationPending(false);
                    setEmailOTP('');
                  }}
                  fullWidth
                >
                  Back
                </Button>
                <Button onClick={handleVerifyEmailOTP} loading={loading} fullWidth>
                  Verify
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="font-medium text-white">{label}</p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-gold-500' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
