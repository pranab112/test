import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors, BorderRadius, FontSize, FontWeight } from '../../constants/theme';
import { getFileUrl } from '../../config/api.config';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  showOnlineStatus = false,
  isOnline = false,
  style,
}) => {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeStyles = {
    sm: { container: 32, fontSize: FontSize.xs, status: 8 },
    md: { container: 40, fontSize: FontSize.sm, status: 10 },
    lg: { container: 56, fontSize: FontSize.lg, status: 12 },
    xl: { container: 80, fontSize: FontSize.xxl, status: 16 },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: currentSize.container,
          height: currentSize.container,
          borderRadius: currentSize.container / 2,
        },
        style,
      ]}
    >
      {source && getFileUrl(source) ? (
        <Image
          source={{ uri: getFileUrl(source) }}
          style={[
            styles.image,
            {
              width: currentSize.container,
              height: currentSize.container,
              borderRadius: currentSize.container / 2,
            },
          ]}
          contentFit="cover"
          transition={200}
          onError={() => console.log('[Avatar] Failed to load image:', getFileUrl(source))}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: currentSize.container,
              height: currentSize.container,
              borderRadius: currentSize.container / 2,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: currentSize.fontSize }]}>
            {name ? getInitials(name) : '?'}
          </Text>
        </View>
      )}
      {showOnlineStatus && (
        <View
          style={[
            styles.statusIndicator,
            {
              width: currentSize.status,
              height: currentSize.status,
              borderRadius: currentSize.status / 2,
              backgroundColor: isOnline ? Colors.online : Colors.offline,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: Colors.surfaceLight,
  },
  placeholder: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.background,
    fontWeight: FontWeight.bold,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
});
