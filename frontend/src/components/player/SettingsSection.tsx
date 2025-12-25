import { useState } from 'react';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import toast from 'react-hot-toast';
import { MdSecurity, MdNotifications, MdAccountCircle } from 'react-icons/md';
import { FaSave } from 'react-icons/fa';

interface UserProfile {
  username: string;
  full_name: string;
  email: string;
  phone: string;
  level: number;
  credits: number;
  created_at: string;
}

// TODO: Replace with API data
const MOCK_USER: UserProfile = {
  username: 'player_demo',
  full_name: 'Demo Player',
  email: 'demo@example.com',
  phone: '+1234567890',
  level: 15,
  credits: 5000,
  created_at: '2025-11-01',
};

export function SettingsSection() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [saving, setSaving] = useState(false);

  // Profile settings
  const [username, setUsername] = useState(MOCK_USER.username);
  const [fullName, setFullName] = useState(MOCK_USER.full_name);
  const [email, setEmail] = useState(MOCK_USER.email);
  const [phone, setPhone] = useState(MOCK_USER.phone);

  // Security settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [promotionNotifications, setPromotionNotifications] = useState(true);
  const [friendRequestNotifications, setFriendRequestNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);

  const handleSaveProfile = () => {
    setSaving(true);
    // TODO: API call to update profile
    setTimeout(() => {
      setSaving(false);
      toast.success('Profile updated successfully!');
    }, 1000);
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    // TODO: API call to change password
    setTimeout(() => {
      setSaving(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully!');
    }, 1000);
  };

  const handleSaveNotifications = () => {
    setSaving(true);
    // TODO: API call to update notification preferences
    setTimeout(() => {
      setSaving(false);
      toast.success('Notification preferences saved!');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account settings and preferences</p>
      </div>

      {/* Account Overview Card */}
      <div className="bg-gradient-to-r from-gold-900/40 to-yellow-900/40 border-2 border-gold-700 rounded-lg p-6">
        <div className="flex items-center gap-6">
          <Avatar name={MOCK_USER.full_name} size="lg" />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gold-500 mb-1">{MOCK_USER.username}</h2>
            <p className="text-gray-300 mb-3">{MOCK_USER.full_name}</p>
            <div className="flex gap-4">
              <div>
                <p className="text-sm text-gray-400">Level</p>
                <Badge variant="purple" size="lg">Level {MOCK_USER.level}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-400">Credits</p>
                <Badge variant="warning" size="lg">{MOCK_USER.credits.toLocaleString()}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-400">Member Since</p>
                <p className="text-white font-medium">
                  {new Date(MOCK_USER.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex gap-2 border-b-2 border-dark-400">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-3 font-medium transition-all border-b-2 ${
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
          className={`px-4 py-3 font-medium transition-all border-b-2 ${
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
          className={`px-4 py-3 font-medium transition-all border-b-2 ${
            activeTab === 'notifications'
              ? 'text-gold-500 border-gold-500'
              : 'text-gray-400 border-transparent hover:text-gold-500'
          }`}
        >
          <MdNotifications className="inline mr-2 text-xl" />
          Notifications
        </button>
      </div>

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-6 flex items-center gap-2">
            <MdAccountCircle className="text-2xl" />
            Account Information
          </h2>
          <div className="space-y-4 max-w-2xl">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
            />
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
              <p className="text-sm text-blue-400">
                <strong>Note:</strong> Verify your email to unlock special rewards!
              </p>
            </div>
            <Input
              label="Phone Number (Optional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
            />
            <div className="pt-4">
              <Button
                onClick={handleSaveProfile}
                loading={saving}
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
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
            <div className="pt-4">
              <Button
                onClick={handleChangePassword}
                loading={saving}
                variant="primary"
              >
                <MdSecurity className="inline mr-2" />
                Change Password
              </Button>
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
                  label="Email Notifications"
                  description="Receive notifications via email"
                  enabled={emailNotifications}
                  onChange={setEmailNotifications}
                />
                <ToggleSetting
                  label="Push Notifications"
                  description="Receive push notifications in your browser"
                  enabled={pushNotifications}
                  onChange={setPushNotifications}
                />
              </div>
            </div>

            <div className="bg-dark-300 rounded-lg p-4">
              <h3 className="font-bold text-white mb-4">Specific Notifications</h3>
              <div className="space-y-4">
                <ToggleSetting
                  label="Promotions & Rewards"
                  description="Get notified about new promotions and rewards"
                  enabled={promotionNotifications}
                  onChange={setPromotionNotifications}
                />
                <ToggleSetting
                  label="Friend Requests"
                  description="Get notified when someone sends you a friend request"
                  enabled={friendRequestNotifications}
                  onChange={setFriendRequestNotifications}
                />
                <ToggleSetting
                  label="Messages"
                  description="Get notified about new messages"
                  enabled={messageNotifications}
                  onChange={setMessageNotifications}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSaveNotifications}
                loading={saving}
                variant="primary"
              >
                <FaSave className="inline mr-2" />
                Save Preferences
              </Button>
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
