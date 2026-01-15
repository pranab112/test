import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize } from '../../constants/theme';

interface LoadingProps {
  text?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  text,
  size = 'large',
  fullScreen = false,
}) => {
  const content = (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={Colors.primary} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{content}</View>;
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginTop: Spacing.md,
  },
});
