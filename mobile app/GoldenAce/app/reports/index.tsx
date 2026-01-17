import React, { useEffect, useState, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { reportsApi } from '../../src/api/reports.api';
import { Card, Avatar, Badge, Button, Loading, EmptyState } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Report } from '../../src/types';

type TabType = 'received' | 'made' | 'warnings';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [reportsReceived, setReportsReceived] = useState<Report[]>([]);
  const [reportsMade, setReportsMade] = useState<Report[]>([]);
  const [warnings, setWarnings] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Appeal modal
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  // Resolution modal
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionProof, setResolutionProof] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionSubmitting, setResolutionSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [reportsData, warningsData] = await Promise.all([
        reportsApi.getMyReports(),
        reportsApi.getMyWarnings(),
      ]);
      setReportsReceived(reportsData.reports_received || []);
      setReportsMade(reportsData.reports_made || []);
      setWarnings(warningsData || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Refresh when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleAppeal = async () => {
    if (!selectedReport) return;
    if (!appealReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your appeal');
      return;
    }

    setAppealSubmitting(true);
    try {
      const result = await reportsApi.appealReport({
        report_id: selectedReport.id,
        reason: appealReason.trim(),
      });
      Alert.alert(
        'Appeal Submitted',
        `Your appeal has been submitted. A support ticket (#${result.ticket_id}) has been created.`
      );
      setShowAppealModal(false);
      setSelectedReport(null);
      setAppealReason('');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to submit appeal');
    } finally {
      setAppealSubmitting(false);
    }
  };

  const handleSubmitResolution = async () => {
    if (!selectedReport) return;
    if (!resolutionProof.trim()) {
      Alert.alert('Error', 'Please provide resolution proof');
      return;
    }

    setResolutionSubmitting(true);
    try {
      await reportsApi.submitResolution(selectedReport.id, {
        resolution_proof: resolutionProof.trim(),
        notes: resolutionNotes.trim() || undefined,
      });
      Alert.alert(
        'Resolution Submitted',
        'Your resolution has been submitted for review. Our team will verify it shortly.'
      );
      setShowResolutionModal(false);
      setSelectedReport(null);
      setResolutionProof('');
      setResolutionNotes('');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to submit resolution');
    } finally {
      setResolutionSubmitting(false);
    }
  };

  const openAppealModal = (report: Report) => {
    setSelectedReport(report);
    setAppealReason('');
    setShowAppealModal(true);
  };

  const openResolutionModal = (report: Report) => {
    setSelectedReport(report);
    setResolutionProof('');
    setResolutionNotes('');
    setShowResolutionModal(true);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTimeRemaining = (deadline: string): string => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge text="Pending" variant="warning" size="sm" />;
      case 'investigating':
        return <Badge text="Investigating" variant="warning" size="sm" />;
      case 'warning':
        return <Badge text="Warning" variant="error" size="sm" />;
      case 'resolved':
        return <Badge text="Resolved" variant="success" size="sm" />;
      case 'valid':
        return <Badge text="Valid" variant="error" size="sm" />;
      case 'invalid':
        return <Badge text="Invalid" variant="success" size="sm" />;
      case 'malicious':
        return <Badge text="Malicious" variant="error" size="sm" />;
      default:
        return <Badge text={status} variant="default" size="sm" />;
    }
  };

  const renderReport = ({ item }: { item: Report }) => {
    const isReceived = activeTab === 'received';
    const isWarning = activeTab === 'warnings';
    const canAppeal = isReceived && ['valid', 'warning'].includes(item.status);
    const canResolve = isWarning && item.status === 'warning' && item.warning_deadline;

    return (
      <Card style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={styles.reportHeaderLeft}>
            <Text style={styles.reportLabel}>
              {isReceived || isWarning ? 'Reported by:' : 'You reported:'}
            </Text>
            <Text style={styles.reportUserName}>
              {isReceived || isWarning
                ? item.reporter_name || item.reporter_username
                : item.reported_user_name || item.reported_user_username}
            </Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.reportContent}>
          <Text style={styles.reportReasonLabel}>Reason:</Text>
          <Text style={styles.reportReason}>{item.reason}</Text>

          {item.evidence && (
            <>
              <Text style={styles.reportReasonLabel}>Evidence:</Text>
              <Text style={styles.reportReason}>{item.evidence}</Text>
            </>
          )}

          <Text style={styles.reportDate}>
            Reported on {formatDate(item.created_at)}
          </Text>
        </View>

        {/* Warning deadline */}
        {isWarning && item.warning_deadline && (
          <View style={styles.warningDeadlineBox}>
            <Ionicons name="time" size={20} color={Colors.error} />
            <View style={styles.warningDeadlineInfo}>
              <Text style={styles.warningDeadlineText}>
                Resolution Deadline: {formatDate(item.warning_deadline)}
              </Text>
              <Text style={styles.warningTimeRemaining}>
                {getTimeRemaining(item.warning_deadline)}
              </Text>
            </View>
          </View>
        )}

        {/* Admin notes */}
        {item.admin_notes && (
          <View style={styles.adminNotesBox}>
            <Ionicons name="information-circle" size={16} color={Colors.info} />
            <Text style={styles.adminNotesText}>
              Admin notes: {item.admin_notes}
            </Text>
          </View>
        )}

        {/* Action taken */}
        {item.action_taken && (
          <View style={styles.actionTakenBox}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.actionTakenText}>
              Action taken: {item.action_taken}
            </Text>
          </View>
        )}

        {/* Resolution info */}
        {item.resolution_notes && (
          <View style={styles.resolutionBox}>
            <Ionicons name="document-text" size={16} color={Colors.primary} />
            <Text style={styles.resolutionText}>
              Resolution: {item.resolution_notes}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.reportActions}>
          {canAppeal && (
            <TouchableOpacity
              style={styles.appealButton}
              onPress={() => openAppealModal(item)}
            >
              <Ionicons name="flag-outline" size={16} color={Colors.warning} />
              <Text style={styles.appealButtonText}>Appeal</Text>
            </TouchableOpacity>
          )}
          {canResolve && (
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={() => openResolutionModal(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
              <Text style={styles.resolveButtonText}>Submit Resolution</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  if (loading) {
    return <Loading fullScreen text="Loading reports..." />;
  }

  const getCurrentData = () => {
    switch (activeTab) {
      case 'received':
        return reportsReceived;
      case 'made':
        return reportsMade;
      case 'warnings':
        return warnings;
      default:
        return [];
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'received':
        return { title: 'No Reports Received', description: 'No one has reported you' };
      case 'made':
        return { title: 'No Reports Made', description: "You haven't reported anyone" };
      case 'warnings':
        return { title: 'No Active Warnings', description: 'You have no warnings to resolve' };
      default:
        return { title: 'No Data', description: '' };
    }
  };

  const emptyMessage = getEmptyMessage();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitle: 'Reports & Warnings',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'received' && styles.tabActive]}
            onPress={() => setActiveTab('received')}
          >
            <Ionicons
              name="alert-circle"
              size={16}
              color={activeTab === 'received' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
              Received ({reportsReceived.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'made' && styles.tabActive]}
            onPress={() => setActiveTab('made')}
          >
            <Ionicons
              name="flag"
              size={16}
              color={activeTab === 'made' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'made' && styles.tabTextActive]}>
              Made ({reportsMade.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'warnings' && styles.tabActive]}
            onPress={() => setActiveTab('warnings')}
          >
            <Ionicons
              name="warning"
              size={16}
              color={activeTab === 'warnings' ? Colors.error : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'warnings' && styles.tabTextActive, warnings.length > 0 && { color: Colors.error }]}>
              Warnings ({warnings.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        <FlatList
          data={getCurrentData()}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReport}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={activeTab === 'warnings' ? 'shield-checkmark-outline' : 'flag-outline'}
              title={emptyMessage.title}
              description={emptyMessage.description}
            />
          }
        />

        {/* Appeal Modal */}
        <Modal
          visible={showAppealModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowAppealModal(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Appeal Report</Text>
                <TouchableOpacity onPress={() => setShowAppealModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              {selectedReport && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.appealReportBox}>
                    <Text style={styles.appealReportLabel}>Report being appealed:</Text>
                    <Text style={styles.appealReportReason}>{selectedReport.reason}</Text>
                    <Text style={styles.appealReportDate}>
                      Reported on {formatDate(selectedReport.created_at)}
                    </Text>
                  </View>

                  <Text style={styles.inputLabel}>Why are you appealing? *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={appealReason}
                    onChangeText={setAppealReason}
                    placeholder="Explain why you believe this report is unfair or incorrect..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={1000}
                  />
                  <Text style={styles.charCount}>{appealReason.length}/1000</Text>

                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color={Colors.info} />
                    <Text style={styles.infoText}>
                      A support ticket will be created for your appeal. Our team will investigate and respond.
                    </Text>
                  </View>

                  <Button
                    title={appealSubmitting ? 'Submitting...' : 'Submit Appeal'}
                    onPress={handleAppeal}
                    loading={appealSubmitting}
                    style={styles.submitButton}
                  />
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Resolution Modal */}
        <Modal
          visible={showResolutionModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowResolutionModal(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submit Resolution</Text>
                <TouchableOpacity onPress={() => setShowResolutionModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              {selectedReport && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.warningInfoBox}>
                    <Ionicons name="warning" size={24} color={Colors.error} />
                    <View style={styles.warningInfoContent}>
                      <Text style={styles.warningInfoTitle}>Warning Details</Text>
                      <Text style={styles.warningInfoReason}>{selectedReport.reason}</Text>
                      {selectedReport.warning_deadline && (
                        <Text style={styles.warningInfoDeadline}>
                          Deadline: {formatDate(selectedReport.warning_deadline)} ({getTimeRemaining(selectedReport.warning_deadline)})
                        </Text>
                      )}
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Resolution Proof *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={resolutionProof}
                    onChangeText={setResolutionProof}
                    placeholder="Describe how you have resolved the issue (e.g., payment made, issue fixed)..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={1000}
                  />

                  <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={resolutionNotes}
                    onChangeText={setResolutionNotes}
                    placeholder="Any additional information..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={500}
                  />

                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color={Colors.info} />
                    <Text style={styles.infoText}>
                      Our team will verify your resolution. If approved, the warning will be cleared.
                    </Text>
                  </View>

                  <Button
                    title={resolutionSubmitting ? 'Submitting...' : 'Submit Resolution'}
                    onPress={handleSubmitResolution}
                    loading={resolutionSubmitting}
                    style={styles.submitButton}
                  />
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    marginRight: Spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  list: {
    padding: Spacing.md,
  },
  reportCard: {
    marginBottom: Spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  reportHeaderLeft: {
    flex: 1,
  },
  reportLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  reportUserName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  reportContent: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reportReasonLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  reportReason: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  reportDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  warningDeadlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  warningDeadlineInfo: {
    flex: 1,
  },
  warningDeadlineText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: FontWeight.medium,
  },
  warningTimeRemaining: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  adminNotesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.info + '15',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  adminNotesText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.info,
  },
  actionTakenBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.success + '15',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  actionTakenText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.success,
  },
  resolutionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.primary + '15',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  resolutionText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  reportActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  appealButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: BorderRadius.md,
  },
  appealButtonText: {
    fontSize: FontSize.sm,
    color: Colors.warning,
    fontWeight: FontWeight.medium,
  },
  resolveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: BorderRadius.md,
  },
  resolveButtonText: {
    fontSize: FontSize.sm,
    color: Colors.success,
    fontWeight: FontWeight.medium,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  appealReportBox: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  appealReportLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  appealReportReason: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  appealReportDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  warningInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.error + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  warningInfoContent: {
    flex: 1,
  },
  warningInfoTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  warningInfoReason: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  warningInfoDeadline: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: Spacing.sm,
    fontWeight: FontWeight.medium,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.info + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.info,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
});
