import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import { authApi, settingsApi } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import toast from 'react-hot-toast';
import {
  MdPerson,
  MdSecurity,
  MdNotifications,
  MdPalette,
  MdVerified,
  MdUpload,
  MdDelete,
  MdRefresh,
  MdWarning,
} from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'appearance';

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

  // Delete profile picture confirmation modal state
  const [showDeletePictureModal, setShowDeletePictureModal] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    companyName: '',
    bio: '',
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

  // Notifications settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    promotionUpdates: true,
    messageAlerts: true,
    reviewAlerts: false,
    reportUpdates: true,
  });

  // Profile picture
  const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
  const [uploadingPicture, setUploadingPicture] = useState(false);

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
        fullName: user.full_name || '',
        email: user.email || '',
        companyName: user.company_name || '',
        bio: user.bio || '',
      });
      setProfilePicture(user.profile_picture);
      setEmailVerified(user.is_email_verified || false);

      // Load email verification status for players
      if (user.user_type === 'player') {
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
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await settingsApi.updateProfile({
        full_name: profileData.fullName,
        company_name: profileData.companyName,
        bio: profileData.bio,
      });

      // Update local user state
      if (user) {
        const updatedUser = {
          ...user,
          full_name: profileData.fullName,
          company_name: profileData.companyName,
          bio: profileData.bio,
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to update profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!securityData.currentPassword || !securityData.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (securityData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(securityData.currentPassword, securityData.newPassword);
      toast.success('Password changed successfully');
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

    // Validate file
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

      // Update user state
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

      // Update user state
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
        promotion_updates: notificationSettings.promotionUpdates,
        message_alerts: notificationSettings.messageAlerts,
        review_alerts: notificationSettings.reviewAlerts,
        report_updates: notificationSettings.reportUpdates,
      });
      toast.success('Notification settings updated');
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to update notification settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: <MdPerson size={20} /> },
    { key: 'security' as const, label: 'Security', icon: <MdSecurity size={20} /> },
    { key: 'notifications' as const, label: 'Notifications', icon: <MdNotifications size={20} /> },
    { key: 'appearance' as const, label: 'Appearance', icon: <MdPalette size={20} /> },
  ];

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

      <div className="grid grid-cols-12 gap-6">
        {/* Settings Navigation Sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-gold-600 text-dark-700'
                      : 'text-gray-400 hover:bg-dark-300 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gold-500 mb-4">Profile Settings</h2>

                {/* Profile Picture Section */}
                <div className="bg-dark-300 p-6 rounded-lg">
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

                {/* Profile Information */}
                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, fullName: e.target.value })
                    }
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={profileData.email}
                    disabled
                    onChange={() => {}}
                  />
                  {user?.user_type === 'client' && (
                    <Input
                      label="Company Name"
                      type="text"
                      value={profileData.companyName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, companyName: e.target.value })
                      }
                    />
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      rows={4}
                      className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>

                {/* Email Verification Section */}
                <div className="bg-dark-300 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3">Email Verification</h3>
                  {emailVerified ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <MdVerified size={20} />
                      <span className="font-medium">Your email is verified</span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-400 mb-3">
                        Verify your email address to access all features and bonuses.
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

                <Button onClick={handleSaveProfile} loading={loading}>
                  Save Changes
                </Button>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gold-500 mb-4">Security Settings</h2>

                <div className="bg-dark-300 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <Input
                      label="Current Password"
                      type="password"
                      value={securityData.currentPassword}
                      onChange={(e) =>
                        setSecurityData({ ...securityData, currentPassword: e.target.value })
                      }
                    />
                    <Input
                      label="New Password"
                      type="password"
                      value={securityData.newPassword}
                      onChange={(e) =>
                        setSecurityData({ ...securityData, newPassword: e.target.value })
                      }
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      value={securityData.confirmPassword}
                      onChange={(e) =>
                        setSecurityData({ ...securityData, confirmPassword: e.target.value })
                      }
                    />
                    <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                      <p className="text-sm text-blue-400">
                        Password must be at least 6 characters long and no more than 72 characters.
                      </p>
                    </div>
                    <Button onClick={handleChangePassword} loading={loading}>
                      Change Password
                    </Button>
                  </div>
                </div>

                {/* Danger Zone - inside Security tab */}
                <div className="bg-red-900/30 border-2 border-red-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-red-500 mb-4 flex items-center gap-2">
                    <MdWarning className="text-xl" />
                    Danger Zone
                  </h3>
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
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gold-500 mb-4">Notification Settings</h2>

                {/* Sound Toggle - Separate from other settings */}
                <div className="bg-dark-300 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white">Notification Sounds</p>
                      <p className="text-sm text-gray-400">Play sound when receiving new messages and notifications</p>
                    </div>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        soundEnabled ? 'bg-gold-500' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          soundEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      key: 'emailNotifications',
                      label: 'Email Notifications',
                      description: 'Receive notifications via email',
                    },
                    {
                      key: 'promotionUpdates',
                      label: 'Promotion Updates',
                      description: 'Get notified about promotion claims and expirations',
                    },
                    {
                      key: 'messageAlerts',
                      label: 'Message Alerts',
                      description: 'Receive alerts for new messages',
                    },
                    {
                      key: 'reviewAlerts',
                      label: 'Review Alerts',
                      description: 'Get notified when someone reviews you',
                    },
                    {
                      key: 'reportUpdates',
                      label: 'Report Updates',
                      description: 'Receive updates on your reports',
                    },
                  ].map((setting) => (
                    <div
                      key={setting.key}
                      className="bg-dark-300 p-4 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-medium">{setting.label}</p>
                        <p className="text-sm text-gray-400">{setting.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            notificationSettings[setting.key as keyof typeof notificationSettings]
                          }
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              [setting.key]: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <Button onClick={handleSaveNotifications} loading={loading}>
                  Save Notification Settings
                </Button>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gold-500 mb-4">Appearance Settings</h2>

                <div className="bg-dark-300 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3">Theme</h3>
                  <p className="text-gray-400 mb-4">
                    Choose your preferred theme. Currently using Dark theme.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" className="bg-dark-700 border-2 border-gold-600 rounded-lg p-4 text-left">
                      <div className="font-medium text-white mb-2">Dark (Current)</div>
                      <div className="text-sm text-gray-400">Default dark theme</div>
                    </button>
                    <button type="button" className="bg-gray-300 border-2 border-dark-400 rounded-lg p-4 text-left opacity-50 cursor-not-allowed">
                      <div className="font-medium text-dark-700 mb-2">Light (Coming Soon)</div>
                      <div className="text-sm text-gray-600">Bright theme option</div>
                    </button>
                  </div>
                </div>

                <div className="bg-dark-300 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3">Language</h3>
                  <select className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500">
                    <option>English (US)</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>

                <div className="bg-dark-300 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3">Display Density</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="density" defaultChecked className="w-4 h-4" />
                      <span className="text-white">Comfortable (Recommended)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="density" className="w-4 h-4" />
                      <span className="text-white">Compact</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
                  promotions, and player information will be permanently removed. This cannot be undone.
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
    </div>
  );
}
