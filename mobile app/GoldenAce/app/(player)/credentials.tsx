import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Clipboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { gameCredentialsApi } from '../../src/api/gameCredentials.api';
import { Card, Loading, EmptyState } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { GameCredential } from '../../src/types';

export default function PlayerCredentialsScreen() {
  const [credentials, setCredentials] = useState<GameCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCredentials = async () => {
    try {
      const data = await gameCredentialsApi.getMyCredentials();
      setCredentials(data);
    } catch (error) {
      console.error('Error loading credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCredentials();
    setRefreshing(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const renderCredential = ({ item }: { item: GameCredential }) => (
    <Card style={styles.credentialCard}>
      <View style={styles.credentialHeader}>
        <View style={styles.credentialHeaderLeft}>
          <Ionicons name="game-controller" size={28} color={Colors.primary} />
          <Text style={styles.credentialGameName}>{item.game_display_name}</Text>
        </View>
        {item.is_active && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>

      <View style={styles.credentialBody}>
        <View style={styles.credentialRow}>
          <View style={styles.credentialLabelContainer}>
            <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.credentialLabel}>Username</Text>
          </View>
          <View style={styles.credentialValueContainer}>
            <Text style={styles.credentialValue}>{item.game_username}</Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(item.game_username, 'Username')}
              style={styles.copyButton}
            >
              <Ionicons name="copy-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.credentialRow}>
          <View style={styles.credentialLabelContainer}>
            <Ionicons name="key-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.credentialLabel}>Password</Text>
          </View>
          <View style={styles.credentialValueContainer}>
            <Text style={styles.credentialValue}>{item.game_password}</Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(item.game_password, 'Password')}
              style={styles.copyButton}
            >
              <Ionicons name="copy-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {item.login_url && (
          <View style={styles.credentialRow}>
            <View style={styles.credentialLabelContainer}>
              <Ionicons name="link-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.credentialLabel}>Login URL</Text>
            </View>
            <View style={styles.credentialValueContainer}>
              <Text style={styles.credentialUrl} numberOfLines={1}>
                {item.login_url}
              </Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(item.login_url!, 'Login URL')}
                style={styles.copyButton}
              >
                <Ionicons name="copy-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {item.client_name && (
        <View style={styles.credentialFooter}>
          <Text style={styles.assignedBy}>
            Assigned by: <Text style={styles.clientName}>{item.client_name}</Text>
          </Text>
        </View>
      )}
    </Card>
  );

  if (loading) {
    return <Loading fullScreen text="Loading credentials..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Game Credentials</Text>
        <Text style={styles.subtitle}>
          View your game login credentials assigned by your client
        </Text>
      </View>

      <FlatList
        data={credentials}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCredential}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="key-outline"
            title="No Credentials Yet"
            description="Your client has not assigned any game credentials to you yet. Please contact your client."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  listContent: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  credentialCard: {
    marginBottom: Spacing.md,
  },
  credentialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  credentialHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  credentialGameName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  activeBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  activeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  credentialBody: {
    gap: Spacing.md,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credentialLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  credentialLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  credentialValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    justifyContent: 'flex-end',
  },
  credentialValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  credentialUrl: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    flex: 1,
    textAlign: 'right',
  },
  copyButton: {
    padding: Spacing.xs,
  },
  credentialFooter: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  assignedBy: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  clientName: {
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
});
