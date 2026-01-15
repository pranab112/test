/**
 * Green Palace Theme Colors
 * Clean emerald theme - premium, trustworthy, elegant
 */

import { Platform } from 'react-native';

// Green Palace primary color (emerald - clean, professional)
const primaryEmerald = '#10B981';
const tintColorDark = primaryEmerald;

export const Colors = {
  light: {
    // Light mode not used - app is dark-only
    text: '#11181C',
    background: '#fff',
    tint: primaryEmerald,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: primaryEmerald,
  },
  dark: {
    text: '#ECEDEE',
    background: '#0a0a0a',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#666666',
    tabIconSelected: primaryEmerald,
    // Green Palace specific
    primary: primaryEmerald,
    surface: '#111111',
    border: 'rgba(16, 185, 129, 0.2)',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
