import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize } from '../../src/constants/theme';
import { useChat } from '../../src/contexts/ChatContext';

// Tab icon with badge component
function TabIconWithBadge({
  name,
  color,
  size,
  badgeCount,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  badgeCount: number;
}) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={name} size={size} color={color} />
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function ClientTabLayout() {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useChat();

  // Calculate proper bottom padding based on device safe area
  const bottomPadding = Math.max(insets.bottom, 10);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerTitle: 'Green Palace',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge
              name="chatbubbles"
              size={size}
              color={color}
              badgeCount={unreadCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: 'Players',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Promos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="globe" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="claims"
        options={{
          href: null, // Hide from tab bar - promotions screen handles claims
          title: 'Claims',
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          href: null, // Hide from tab bar - accessible via Players or Settings
          title: 'Add Player',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Hide from tab bar - accessible via settings
          title: 'Notifications',
        }}
      />
      <Tabs.Screen
        name="buy-credits"
        options={{
          href: null, // Hide from tab bar - accessible via settings
          title: 'Buy Credits',
        }}
      />
      <Tabs.Screen
        name="broadcasts"
        options={{
          href: null, // Hide from tab bar - accessible via settings
          title: 'Announcements',
        }}
      />
      <Tabs.Screen
        name="credentials"
        options={{
          href: null, // Hide from tab bar - accessible via chat (game icon) or players
          title: 'Credentials',
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          href: null, // Hide from tab bar - accessible via settings
          title: 'Manage Games',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
