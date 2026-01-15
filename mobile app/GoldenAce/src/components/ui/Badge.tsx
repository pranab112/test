import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSize, FontWeight } from '../../constants/theme';

interface BadgeProps {
  text: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'emerald';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'default',
  size = 'md',
  style,
}) => {
  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'success':
        return Colors.success + '20';
      case 'error':
        return Colors.error + '20';
      case 'warning':
        return Colors.warning + '20';
      case 'info':
        return Colors.info + '20';
      case 'emerald':
        return '#10B98120';
      default:
        return Colors.surfaceLight;
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'success':
        return Colors.success;
      case 'error':
        return Colors.error;
      case 'warning':
        return Colors.warning;
      case 'info':
        return Colors.info;
      case 'emerald':
        return '#10B981';
      default:
        return Colors.textSecondary;
    }
  };

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: getBackgroundColor() },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' && styles.textSm,
          { color: getTextColor() },
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  textSm: {
    fontSize: FontSize.xs,
  },
});
