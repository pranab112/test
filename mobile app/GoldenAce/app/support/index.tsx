import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ticketsApi, Ticket, TicketCategory, TicketMessage } from '../../src/api/tickets.api';
import { Card, Badge, Button, Loading, EmptyState, Input } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';

const CATEGORIES: { value: TicketCategory; label: string; icon: string }[] = [
  { value: 'account', label: 'Account', icon: 'person-outline' },
  { value: 'payment', label: 'Payment', icon: 'card-outline' },
  { value: 'technical', label: 'Technical', icon: 'bug-outline' },
  { value: 'game', label: 'Game Issues', icon: 'game-controller-outline' },
  { value: 'report', label: 'Report User', icon: 'flag-outline' },
  { value: 'other', label: 'Other', icon: 'help-circle-outline' },
];

export default function SupportScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New ticket modal
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>('other');
  const [creating, setCreating] = useState(false);

  // Ticket detail modal
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const loadTickets = async () => {
    try {
      const data = await ticketsApi.getTickets();
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async () => {
    if (!newTicketSubject.trim() || !newTicketDescription.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setCreating(true);
    try {
      await ticketsApi.createTicket({
        subject: newTicketSubject.trim(),
        description: newTicketDescription.trim(),
        category: selectedCategory,
      });
      Alert.alert('Success', 'Support ticket created successfully');
      setShowNewTicketModal(false);
      setNewTicketSubject('');
      setNewTicketDescription('');
      setSelectedCategory('other');
      await loadTickets();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
    setLoadingMessages(true);
    try {
      // Get full ticket details which includes messages
      const ticketDetails = await ticketsApi.getTicket(ticket.id);
      // The ticket response includes messages array
      setMessages((ticketDetails as any).messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setSendingMessage(true);
    try {
      const message = await ticketsApi.addMessage(selectedTicket.id, newMessage.trim());
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'open':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTicket = ({ item }: { item: Ticket }) => (
    <TouchableOpacity onPress={() => openTicket(item)}>
      <Card style={styles.ticketCard}>
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketSubject} numberOfLines={1}>
            {item.subject}
          </Text>
          <Badge text={item.status.replace('_', ' ')} variant={getStatusVariant(item.status)} size="sm" />
        </View>
        <Text style={styles.ticketDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.ticketFooter}>
          <View style={styles.ticketMeta}>
            <Badge text={item.category} variant="default" size="sm" />
            <Text style={styles.ticketDate}>{formatDate(item.created_at)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading fullScreen text="Loading support..." />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitle: 'Support',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowNewTicketModal(true)}>
              <Ionicons name="add-circle" size={28} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTicket}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="help-buoy-outline"
              title="No Support Tickets"
              description="Create a ticket if you need help"
              actionLabel="Create Ticket"
              onAction={() => setShowNewTicketModal(true)}
            />
          }
        />

        {/* New Ticket Modal */}
        <Modal
          visible={showNewTicketModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowNewTicketModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNewTicketModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Ticket</Text>
              <Button
                title="Create"
                onPress={handleCreateTicket}
                loading={creating}
                size="sm"
                disabled={!newTicketSubject.trim() || !newTicketDescription.trim()}
              />
            </View>

            <ScrollView style={styles.modalContent}>
              <Input
                label="Subject"
                placeholder="Brief summary of your issue"
                value={newTicketSubject}
                onChangeText={setNewTicketSubject}
                maxLength={100}
              />

              <Text style={styles.categoryLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryItem,
                      selectedCategory === cat.value && styles.categoryItemSelected,
                    ]}
                    onPress={() => setSelectedCategory(cat.value)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={24}
                      color={selectedCategory === cat.value ? Colors.primary : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === cat.value && styles.categoryTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.descriptionLabel}>Description</Text>
              <TextInput
                style={styles.descriptionInput}
                value={newTicketDescription}
                onChangeText={setNewTicketDescription}
                placeholder="Describe your issue in detail..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>{newTicketDescription.length}/1000</Text>
            </ScrollView>
          </View>
        </Modal>

        {/* Ticket Detail Modal */}
        <Modal
          visible={showTicketModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowTicketModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedTicket?.subject}
              </Text>
              <Badge
                text={selectedTicket?.status.replace('_', ' ') || ''}
                variant={getStatusVariant(selectedTicket?.status || '')}
                size="sm"
              />
            </View>

            {loadingMessages ? (
              <Loading text="Loading messages..." />
            ) : (
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.messageItem,
                      item.is_staff ? styles.staffMessage : styles.userMessage,
                    ]}
                  >
                    <View style={styles.messageBubble}>
                      {item.is_staff && (
                        <Text style={styles.staffLabel}>Support Team</Text>
                      )}
                      <Text style={styles.messageText}>{item.content}</Text>
                      <Text style={styles.messageTime}>{formatDate(item.created_at)}</Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.messagesList}
                ListHeaderComponent={
                  selectedTicket ? (
                    <Card style={styles.ticketDetailCard}>
                      <Text style={styles.ticketDetailDesc}>{selectedTicket.description}</Text>
                      <View style={styles.ticketDetailMeta}>
                        <Badge text={selectedTicket.category} variant="default" size="sm" />
                        <Text style={styles.ticketDetailDate}>
                          Created {formatDate(selectedTicket.created_at)}
                        </Text>
                      </View>
                    </Card>
                  ) : null
                }
              />
            )}

            {selectedTicket?.status !== 'closed' && selectedTicket?.status !== 'resolved' && (
              <View style={styles.messageInputContainer}>
                <TextInput
                  style={styles.messageInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Type a message..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                >
                  <Ionicons
                    name="send"
                    size={20}
                    color={newMessage.trim() && !sendingMessage ? Colors.background : Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    marginRight: Spacing.sm,
  },
  list: {
    padding: Spacing.md,
  },
  ticketCard: {
    marginBottom: Spacing.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ticketSubject: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  ticketDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ticketDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  cancelText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  categoryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoryItem: {
    width: '31%',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  categoryText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  descriptionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  descriptionInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 150,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  ticketDetailCard: {
    marginBottom: Spacing.md,
  },
  ticketDetailDesc: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  ticketDetailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ticketDetailDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  messagesList: {
    padding: Spacing.md,
  },
  messageItem: {
    marginBottom: Spacing.sm,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  staffMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  staffLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  messageText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  messageTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  messageInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
});
