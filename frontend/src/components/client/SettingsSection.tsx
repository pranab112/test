import { useState } from 'react';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { authApi } from '@/api/endpoints';
import toast from 'react-hot-toast';
import {
  MdPerson,
  MdSecurity,
  MdNotifications,
  MdPalette,
  MdVerified,
  MdUpload,
  MdDelete,
} from 'react-icons/md';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'appearance';

export function SettingsSection() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    companyName: 'Gaming Co.',
    bio: 'Professional gaming client with 5+ years experience.',
  });

  // Security form state
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notifications settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    promotionUpdates: true,
    messageAlerts: true,
    reviewAlerts: false,
    reportUpdates: true,
  });

  // TODO: Replace with actual user data
  const [emailVerified] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await clientApi.updateProfile(profileData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
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
      const errorMessage = error?.error?.message || error?.message || 'Failed to change password';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await clientApi.updateNotificationSettings(notificationSettings);
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Notification settings updated');
    } catch (error) {
      toast.error('Failed to update notification settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      // TODO: Replace with actual API call
      // await clientApi.sendVerificationEmail();
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      toast.error('Failed to send verification email');
      console.error(error);
    }
  };

  const handleUploadProfilePicture = () => {
    // TODO: Implement file upload
    toast.success('File upload coming soon');
  };

  const handleDeleteProfilePicture = async () => {
    if (!confirm('Remove your profile picture?')) {
      return;
    }

    try {
      // TODO: Replace with actual API call
      // await clientApi.deleteProfilePicture();
      await new Promise((resolve) => setTimeout(resolve, 300));
      setProfilePicture(undefined);
      toast.success('Profile picture removed');
    } catch (error) {
      toast.error('Failed to remove profile picture');
      console.error(error);
    }
  };

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: <MdPerson size={20} /> },
    { key: 'security' as const, label: 'Security', icon: <MdSecurity size={20} /> },
    { key: 'notifications' as const, label: 'Notifications', icon: <MdNotifications size={20} /> },
    { key: 'appearance' as const, label: 'Appearance', icon: <MdPalette size={20} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Settings Navigation Sidebar */}
        <div className="col-span-3">
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
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
        <div className="col-span-9">
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gold-500 mb-4">Profile Settings</h2>

                {/* Profile Picture Section */}
                <div className="bg-dark-300 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-4">Profile Picture</h3>
                  <div className="flex items-center gap-6">
                    <Avatar name={profileData.fullName} size="xl" src={profilePicture} />
                    <div className="space-y-2">
                      <button
                        onClick={handleUploadProfilePicture}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <MdUpload size={18} />
                        Upload New Picture
                      </button>
                      {profilePicture && (
                        <button
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
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  />
                  <Input
                    label="Company Name"
                    type="text"
                    value={profileData.companyName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, companyName: e.target.value })
                    }
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      rows={4}
                      className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                        Your email address is not verified. Please verify to access all features.
                      </p>
                      <button
                        onClick={handleVerifyEmail}
                        className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        Send Verification Email
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

                <div className="bg-dark-300 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3">Two-Factor Authentication</h3>
                  <p className="text-gray-400 mb-4">
                    Add an extra layer of security to your account.
                  </p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Enable 2FA
                  </button>
                </div>

                <div className="bg-dark-300 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3">Active Sessions</h3>
                  <p className="text-gray-400 mb-4">
                    Manage devices where you're currently logged in.
                  </p>
                  <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Logout All Devices
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gold-500 mb-4">Notification Settings</h2>

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
                    <button className="bg-dark-700 border-2 border-gold-600 rounded-lg p-4 text-left">
                      <div className="font-medium text-white mb-2">Dark (Current)</div>
                      <div className="text-sm text-gray-400">Default dark theme</div>
                    </button>
                    <button className="bg-gray-300 border-2 border-dark-400 rounded-lg p-4 text-left opacity-50 cursor-not-allowed">
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
    </div>
  );
}
