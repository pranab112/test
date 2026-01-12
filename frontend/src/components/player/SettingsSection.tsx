import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import { authApi, settingsApi, referralsApi } from '@/api/endpoints';
import type { ReferralStats, ReferredUser, PaymentMethod, PlayerPaymentPreferences } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
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
  MdCheck,
  MdPayment,
  MdWarning,
} from 'react-icons/md';
import { FaSave, FaGift, FaUsers, FaClock, FaCheckCircle, FaCreditCard } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'referrals' | 'payments';

export function SettingsSection() {
  const { user, setUser, logout } = useAuth();
  const { soundEnabled, setSoundEnabled } = useNotifications();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Confirmation modal states
  const [showDeletePictureModal, setShowDeletePictureModal] = useState(false);
  const [showRegenerateCodeModal, setShowRegenerateCodeModal] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    username: '',
    fullName: '',
    email: '',
  });

  // Security form state
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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

  // Payment preferences state
  const [allPaymentMethods, setAllPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentPreferences, setPaymentPreferences] = useState<PlayerPaymentPreferences | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [savingPayments, setSavingPayments] = useState(false);
  const [selectedReceiveMethods, setSelectedReceiveMethods] = useState<number[]>([]);
  const [selectedSendMethods, setSelectedSendMethods] = useState<number[]>([]);
  const [receiveDetails, setReceiveDetails] = useState<Record<string, string>>({});
  const [sendDetails, setSendDetails] = useState<Record<string, string>>({});

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
      });
      setProfilePicture(user.profile_picture);
      setEmailVerified(user.is_email_verified || false);

      // Load email verification status
      try {
        const emailStatus = await settingsApi.getEmailVerificationStatus();
        setEmailVerified(emailStatus.is_email_verified);
        setEmailVerificationPending(emailStatus.verification_pending);
        if (emailStatus.secondary_email) {
          setVerificationEmail(emailStatus.secondary_email);
          // If email is verified, use the verified email as the main email
          if (emailStatus.is_email_verified) {
            setProfileData(prev => ({
              ...prev,
              email: emailStatus.secondary_email || prev.email,
            }));
          }
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

  const loadPaymentData = async () => {
    setLoadingPayments(true);
    try {
      const [methods, prefs] = await Promise.all([
        settingsApi.getAllPaymentMethods(),
        settingsApi.getMyPaymentPreferences(),
      ]);

      setAllPaymentMethods(methods);
      setPaymentPreferences(prefs);

      // Set selected methods from preferences
      setSelectedReceiveMethods(prefs.receive_methods.map(m => m.method_id));
      setSelectedSendMethods(prefs.send_methods.map(m => m.method_id));

      // Set details from preferences
      const recDetails: Record<string, string> = {};
      prefs.receive_methods.forEach(m => {
        if (m.account_info) recDetails[m.method_id.toString()] = m.account_info;
      });
      setReceiveDetails(recDetails);

      const sndDetails: Record<string, string> = {};
      prefs.send_methods.forEach(m => {
        if (m.account_info) sndDetails[m.method_id.toString()] = m.account_info;
      });
      setSendDetails(sndDetails);
    } catch (error) {
      console.error('Failed to load payment data:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleSavePaymentPreferences = async () => {
    setSavingPayments(true);
    try {
      const result = await settingsApi.updateMyPaymentPreferences({
        receive_methods: selectedReceiveMethods,
        send_methods: selectedSendMethods,
        receive_details: receiveDetails,
        send_details: sendDetails,
      });

      setPaymentPreferences(result);
      toast.success('Payment preferences saved!');
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to save payment preferences');
      console.error(error);
    } finally {
      setSavingPayments(false);
    }
  };

  const toggleReceiveMethod = (methodId: number) => {
    setSelectedReceiveMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    );
  };

  const toggleSendMethod = (methodId: number) => {
    setSelectedSendMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    );
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await settingsApi.updateProfile({
        full_name: profileData.fullName,
      });

      // Update local user state
      if (user) {
        const updatedUser = {
          ...user,
          full_name: profileData.fullName,
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

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm deletion');
      return;
    }

    setDeletingAccount(true);
    try {
      await settingsApi.deleteMyAccount(deletePassword);
      toast.success('Your account has been deleted successfully');
      setShowDeleteModal(false);
      // Log out and redirect to landing page
      logout();
      navigate('/');
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || 'Failed to delete account';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setDeletingAccount(false);
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

  const handleDeleteProfilePicture = () => {
    if (!user) return;
    setShowDeletePictureModal(true);
  };

  const confirmDeleteProfilePicture = async () => {
    if (!user) return;

    setLoading(true);
    setShowDeletePictureModal(false);
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
  // Generate dynamic referral link using current domain
  const getDynamicReferralLink = () => {
    if (!referralCode) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/register?ref=${referralCode}`;
  };

  const handleCopyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success('Referral code copied!');
    }
  };

  const handleCopyReferralLink = () => {
    const linkToCopy = getDynamicReferralLink() || referralLink;
    if (linkToCopy) {
      navigator.clipboard.writeText(linkToCopy);
      toast.success('Referral link copied!');
    }
  };

  const handleRegenerateCode = () => {
    setShowRegenerateCodeModal(true);
  };

  const confirmRegenerateCode = async () => {
    setShowRegenerateCodeModal(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'expired':
        return <Badge variant="error">Expired</Badge>;
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
                <Badge variant="purple" size="lg">Level {user?.player_level || 1}</Badge>
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
        <button
          onClick={() => {
            setActiveTab('payments');
            if (!paymentPreferences) loadPaymentData();
          }}
          className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'payments'
              ? 'text-gold-500 border-gold-500'
              : 'text-gray-400 border-transparent hover:text-gold-500'
          }`}
        >
          <MdPayment className="inline mr-2 text-xl" />
          Payment Methods
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

          {/* Danger Zone - inside Security tab */}
          <div className="bg-red-900/30 border-2 border-red-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              <MdWarning className="text-2xl" />
              Danger Zone
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-300 rounded-lg">
                <div>
                  <p className="font-medium text-white">Delete Account</p>
                  <p className="text-sm text-gray-400">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
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
                  label="Notification Sounds"
                  description="Play sound when receiving new messages and notifications"
                  enabled={soundEnabled}
                  onChange={setSoundEnabled}
                />
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

                {referralCode && (
                  <div className="bg-dark-300 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">Registration URL (Share this link!)</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={getDynamicReferralLink() || referralLink || ''}
                        readOnly
                        className="flex-1 bg-dark-400 text-white px-3 py-2 rounded-lg text-sm font-mono"
                      />
                      <button
                        onClick={handleCopyReferralLink}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <MdContentCopy size={18} />
                        Copy Link
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Anyone who registers using this link will automatically have your referral code applied!
                    </p>
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

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Payment Methods Header */}
          <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-600 rounded-full">
                <FaCreditCard className="text-white text-2xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Payment Methods</h2>
                <p className="text-gray-300">Set your preferred payment methods for receiving and sending funds</p>
              </div>
            </div>
          </div>

          {loadingPayments ? (
            <div className="text-center py-12 text-gold-500">Loading payment methods...</div>
          ) : (
            <>
              {/* Receive Methods */}
              <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gold-500 mb-4 flex items-center gap-2">
                  <MdPayment className="text-green-500" />
                  Payment Methods I Can Receive
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Select the payment methods you can receive payments through. Clients will see these options.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allPaymentMethods.map((method) => {
                    const isSelected = selectedReceiveMethods.includes(method.id);
                    return (
                      <div
                        key={method.id}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-green-500 bg-green-900/20'
                            : 'border-dark-400 bg-dark-300 hover:border-gold-700'
                        }`}
                        onClick={() => toggleReceiveMethod(method.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{method.display_name}</span>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-green-500 border-green-500' : 'border-gray-500'
                          }`}>
                            {isSelected && <MdCheck className="text-white text-sm" />}
                          </div>
                        </div>

                        {isSelected && (
                          <input
                            type="text"
                            value={receiveDetails[method.id.toString()] || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              setReceiveDetails(prev => ({
                                ...prev,
                                [method.id.toString()]: e.target.value
                              }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder={`Your ${method.display_name} address/account...`}
                            className="w-full mt-2 bg-dark-400 border border-gold-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {allPaymentMethods.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No payment methods available
                  </div>
                )}
              </div>

              {/* Send Methods */}
              <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gold-500 mb-4 flex items-center gap-2">
                  <MdPayment className="text-blue-500" />
                  Payment Methods I Can Send
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Select the payment methods you can send payments through.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allPaymentMethods.map((method) => {
                    const isSelected = selectedSendMethods.includes(method.id);
                    return (
                      <div
                        key={method.id}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-dark-400 bg-dark-300 hover:border-gold-700'
                        }`}
                        onClick={() => toggleSendMethod(method.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{method.display_name}</span>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-500'
                          }`}>
                            {isSelected && <MdCheck className="text-white text-sm" />}
                          </div>
                        </div>

                        {isSelected && (
                          <input
                            type="text"
                            value={sendDetails[method.id.toString()] || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSendDetails(prev => ({
                                ...prev,
                                [method.id.toString()]: e.target.value
                              }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder={`Your ${method.display_name} address/account...`}
                            className="w-full mt-2 bg-dark-400 border border-gold-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {allPaymentMethods.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No payment methods available
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSavePaymentPreferences}
                  loading={savingPayments}
                  variant="primary"
                >
                  <FaSave className="mr-2" />
                  Save Payment Preferences
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletePassword('');
        }}
        title="Delete Your Account"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MdWarning className="text-red-500 text-2xl flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">This action is permanent!</p>
                <p className="text-gray-400 text-sm mt-1">
                  Once you delete your account, all your data including messages, game credentials,
                  rewards, and transaction history will be permanently removed. This cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Enter your password to confirm"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Your current password"
          />

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletePassword('');
              }}
              fullWidth
            >
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || !deletePassword}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {deletingAccount ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <MdDelete size={18} />
                  Delete My Account
                </>
              )}
            </button>
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

      {/* Delete Profile Picture Confirmation Modal */}
      <Modal
        isOpen={showDeletePictureModal}
        onClose={() => setShowDeletePictureModal(false)}
        title="Remove Profile Picture"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <MdWarning className="text-red-500 text-2xl flex-shrink-0" />
            <p className="text-gray-300">
              Are you sure you want to remove your profile picture?
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowDeletePictureModal(false)}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteProfilePicture}
              variant="primary"
              fullWidth
              className="!bg-red-600 hover:!bg-red-700"
            >
              Remove Picture
            </Button>
          </div>
        </div>
      </Modal>

      {/* Regenerate Referral Code Confirmation Modal */}
      <Modal
        isOpen={showRegenerateCodeModal}
        onClose={() => setShowRegenerateCodeModal(false)}
        title="Generate New Referral Code"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <MdWarning className="text-yellow-500 text-2xl flex-shrink-0" />
            <p className="text-gray-300">
              Are you sure you want to generate a new referral code? Your old code will stop working.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowRegenerateCodeModal(false)}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRegenerateCode}
              variant="primary"
              fullWidth
            >
              Generate New Code
            </Button>
          </div>
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
