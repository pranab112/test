import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { broadcastsApi, Broadcast } from '../api/broadcasts.api';
import { Colors, FontSize, FontWeight, Spacing } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TICKER_DURATION = 2 * 60 * 1000; // 2 minutes
const SCROLL_SPEED = 50; // pixels per second

interface AnnouncementTickerProps {
  onPress?: () => void;
}

export default function AnnouncementTicker({ onPress }: AnnouncementTickerProps) {
  const [announcements, setAnnouncements] = useState<Broadcast[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [textWidth, setTextWidth] = useState(0);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loadAnnouncements();

    // Auto-hide after 2 minutes
    hideTimer.current = setTimeout(() => {
      setIsVisible(false);
    }, TICKER_DURATION);

    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await broadcastsApi.getBroadcasts();
      // Filter to only show high priority or recent unread announcements
      const important = data.filter(
        (b) => b.priority === 'high' || (!b.is_read && isRecent(b.created_at))
      );
      setAnnouncements(important.slice(0, 5)); // Max 5 announcements in ticker
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const isRecent = (dateString: string): boolean => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours < 24; // Within last 24 hours
  };

  useEffect(() => {
    if (announcements.length > 0 && textWidth > 0) {
      startScrollAnimation();
    }
  }, [announcements, textWidth]);

  const startScrollAnimation = () => {
    const totalWidth = textWidth + SCREEN_WIDTH;
    const duration = (totalWidth / SCROLL_SPEED) * 1000;

    scrollAnim.setValue(SCREEN_WIDTH);

    animationRef.current = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -textWidth,
        duration: duration,
        useNativeDriver: true,
      })
    );

    animationRef.current.start();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
  };

  const getTickerText = (): string => {
    return announcements
      .map((a) => {
        const prefix = a.priority === 'high' ? '🔴 ' : '📢 ';
        return `${prefix}${a.title}: ${a.content}`;
      })
      .join('     •     ');
  };

  if (!isVisible || announcements.length === 0) {
    return null;
  }

  const tickerText = getTickerText();

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Ionicons name="megaphone" size={14} color={Colors.background} />
        <Text style={styles.label}>LIVE</Text>
      </View>

      <TouchableOpacity
        style={styles.tickerContainer}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Animated.View
          style={[
            styles.tickerContent,
            { transform: [{ translateX: scrollAnim }] },
          ]}
          onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
        >
          <Text style={styles.tickerText} numberOfLines={1}>
            {tickerText}
          </Text>
        </Animated.View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
        <Ionicons name="close" size={18} color={Colors.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    height: 32,
    overflow: 'hidden',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    height: '100%',
    gap: 4,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.background,
    letterSpacing: 1,
  },
  tickerContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tickerContent: {
    flexDirection: 'row',
    position: 'absolute',
  },
  tickerText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  closeButton: {
    paddingHorizontal: Spacing.sm,
    height: '100%',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});
