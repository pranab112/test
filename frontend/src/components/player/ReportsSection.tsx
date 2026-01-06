import { useState, useEffect } from 'react';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import { MdReport, MdWarning, MdRefresh, MdEdit, MdDelete, MdCheckCircle, MdPending, MdGavel, MdSearch, MdClose, MdCheck, MdAccessTime, MdPayment } from 'react-icons/md';
import { reportsApi, type Report, type ReportStatus, type ReportWarning } from '@/api/endpoints/reports.api';
import { friendsApi, type Friend } from '@/api/endpoints/friends.api';

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  investigating: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  warning: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  resolved: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  valid: 'bg-green-500/20 text-green-400 border-green-500/50',
  invalid: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  malicious: 'bg-red-500/20 text-red-400 border-red-500/50',
};

const STATUS_ICONS: Record<ReportStatus, React.ReactNode> = {
  pending: <MdPending className="inline" />,
  investigating: <MdSearch className="inline" />,
  warning: <MdAccessTime className="inline" />,
  resolved: <MdPayment className="inline" />,
  valid: <MdCheck className="inline" />,
  invalid: <MdClose className="inline" />,
  malicious: <MdWarning className="inline" />,
};

export function ReportsSection() {
  const [activeTab, setActiveTab] = useState<'made' | 'received' | 'warnings' | 'report_client'>('made');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [resolutionProof, setResolutionProof] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Reports data
  const [reportsMade, setReportsMade] = useState<Report[]>([]);
  const [reportsReceived, setReportsReceived] = useState<Report[]>([]);
  const [warnings, setWarnings] = useState<ReportWarning[]>([]);

  // Friends (clients) for report tab
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientId: 0,
    clientUsername: '',
    reason: '',
  });

  // Load reports on mount and set up auto-refresh
  useEffect(() => {
    loadReports();

    // Auto-refresh reports every 30 seconds to catch status updates
    const refreshInterval = setInterval(() => {
      loadReports();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Load friends when report_client tab is selected
  useEffect(() => {
    if (activeTab === 'report_client' && friends.length === 0) {
      loadFriends();
    }
  }, [activeTab]);

  const loadReports = async (showToast = false) => {
    setLoadingReports(true);
    try {
      const [reportsResponse, warningsResponse] = await Promise.all([
        reportsApi.getMyReports(),
        reportsApi.getMyWarnings(),
      ]);
      setReportsMade(reportsResponse.reports_made);
      setReportsReceived(reportsResponse.reports_received);
      setWarnings(warningsResponse);
      setLastUpdated(new Date());

      if (showToast) {
        toast.success('Reports refreshed');
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoadingReports(false);
    }
  };

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await friendsApi.getFriends();
      // Filter to show only clients (players report clients)
      const clients = data.filter(f => f.user_type === 'client');
      setFriends(clients);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const stats = {
    madeReports: reportsMade.length,
    receivedReports: reportsReceived.length,
    pendingMade: reportsMade.filter(r => r.status === 'pending').length,
    validReceived: reportsReceived.filter(r => r.status === 'valid').length,
  };

  const handleMakeReport = async () => {
    if (!formData.clientId || !formData.reason.trim()) {
      toast.error('Please select a client and provide a reason');
      return;
    }

    setLoading(true);
    try {
      const newReport = await reportsApi.createReport({
        reported_user_id: formData.clientId,
        reason: formData.reason,
      });

      // Update local state with the new report
      setReportsMade(prev => [newReport, ...prev]);

      // Show success message with status info
      toast.success(
        'Report submitted successfully! Status: Pending. An admin will review your report shortly.',
        { duration: 5000 }
      );

      setShowReportModal(false);
      resetForm();

      // Switch to "Made" tab to show the new report
      setActiveTab('made');

      // Refresh reports to ensure we have the latest data from server
      await loadReports();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to submit report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReport = async () => {
    if (!selectedReport || !formData.reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    setLoading(true);
    try {
      const updatedReport = await reportsApi.updateReport(selectedReport.id, {
        reason: formData.reason,
      });

      setReportsMade(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
      toast.success('Report updated successfully');
      setShowEditModal(false);
      setSelectedReport(null);
      resetForm();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to update report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await reportsApi.deleteReport(reportId);
      setReportsMade(prev => prev.filter(r => r.id !== reportId));
      toast.success('Report deleted');
    } catch (error: any) {
      toast.error(error.detail || 'Failed to delete report');
      console.error(error);
    }
  };

  const handleAppealReport = async () => {
    if (!selectedReport || !appealReason.trim()) {
      toast.error('Please provide a reason for your appeal');
      return;
    }

    setLoading(true);
    try {
      const result = await reportsApi.appealReport(selectedReport.id, appealReason);
      toast.success(`Appeal submitted! Ticket: ${result.ticket_number}`);
      // Update report to show appeal submitted
      setReportsReceived(prev => prev.map(r =>
        r.id === selectedReport.id ? { ...r, appeal_ticket_id: result.ticket_id } : r
      ));
      setShowAppealModal(false);
      setSelectedReport(null);
      setAppealReason('');
    } catch (error: any) {
      toast.error(error.detail || 'Failed to submit appeal');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openAppealModal = (report: Report) => {
    setSelectedReport(report);
    setAppealReason('');
    setShowAppealModal(true);
  };

  const openResolveModal = (warning: ReportWarning) => {
    // Find the full report from received reports
    const report = reportsReceived.find(r => r.id === warning.report_id);
    if (report) {
      setSelectedReport(report);
    }
    setResolutionProof('');
    setResolutionNotes('');
    setShowResolveModal(true);
  };

  const handleResolveReport = async () => {
    if (!selectedReport || !resolutionProof.trim()) {
      toast.error('Please provide proof of resolution');
      return;
    }

    setLoading(true);
    try {
      const result = await reportsApi.resolveReport(
        selectedReport.id,
        resolutionProof,
        resolutionNotes || undefined
      );
      toast.success(result.message);
      // Refresh data
      await loadReports();
      setShowResolveModal(false);
      setSelectedReport(null);
      setResolutionProof('');
      setResolutionNotes('');
    } catch (error: any) {
      toast.error(error.detail || 'Failed to submit resolution');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openReportForClient = async (friend: Friend) => {
    // Check if already reported
    try {
      const reportCheck = await reportsApi.getUserReports(friend.id);
      if (!reportCheck.can_report) {
        toast.error('You have already reported this client');
        return;
      }

      setFormData({
        clientId: friend.id,
        clientUsername: friend.username,
        reason: '',
      });
      setShowReportModal(true);
    } catch (error: any) {
      toast.error(error.detail || 'Failed to check report eligibility');
    }
  };

  const openEditModal = (report: Report) => {
    setSelectedReport(report);
    setFormData({
      clientId: report.reported_user_id,
      clientUsername: report.reported_user_username || '',
      reason: report.reason,
    });
    setShowEditModal(true);
  };

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  const resetForm = () => {
    setFormData({
      clientId: 0,
      clientUsername: '',
      reason: '',
    });
  };

  const getStatusVariant = (status: Report['status']): 'success' | 'warning' | 'error' | 'info' | 'default' | 'pending' | 'approved' | 'rejected' | 'purple' => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'investigating':
        return 'info';
      case 'warning':
        return 'warning';
      case 'resolved':
        return 'purple';
      case 'valid':
        return 'success';
      case 'invalid':
        return 'default';
      case 'malicious':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: Report['status']) => {
    return STATUS_ICONS[status] || <MdPending className="inline" />;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const currentReports = activeTab === 'made' ? reportsMade : activeTab === 'received' ? reportsReceived : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Reports</h1>
          <p className="text-gray-400">
            Manage reports and violations
            {lastUpdated && (
              <span className="text-xs text-gray-500 ml-2">
                (Last updated: {lastUpdated.toLocaleTimeString()})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadReports(true)}
            disabled={loadingReports}
            className={`bg-dark-300 hover:bg-dark-400 text-gold-500 p-3 rounded-lg transition-colors ${
              loadingReports ? 'animate-spin' : ''
            }`}
            title="Refresh"
          >
            <MdRefresh size={20} />
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowReportModal(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <MdReport size={20} />
            Make Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Reports Made"
          value={stats.madeReports}
          icon={<MdReport />}
          color="blue"
        />
        <StatCard
          title="Reports Received"
          value={stats.receivedReports}
          icon={<MdReport />}
          color="red"
        />
        <StatCard
          title="Pending (Made)"
          value={stats.pendingMade}
          icon={<MdPending />}
          color="gold"
        />
        <StatCard
          title="Valid (Received)"
          value={stats.validReceived}
          icon={<MdCheckCircle />}
          color="green"
        />
      </div>

      {/* Tab Interface */}
      <div className="flex gap-2 border-b border-gold-700">
        {[
          { key: 'made', label: 'Made' },
          { key: 'received', label: 'Received' },
          { key: 'warnings', label: 'Warnings', count: warnings.length },
          { key: 'report_client', label: 'Report Client' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-gold-500 border-b-2 border-gold-500'
                : 'text-gray-400 hover:text-gold-500'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loadingReports ? (
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
            <div className="text-gold-500">Loading reports...</div>
          </div>
        ) : activeTab === 'warnings' ? (
          // Warnings Tab
          <div>
            {warnings.length === 0 ? (
              <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
                <MdCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No Active Warnings</p>
                <p className="text-sm text-gray-500">You have no pending reports requiring resolution</p>
              </div>
            ) : (
              <div className="space-y-4">
                {warnings.map((warning) => (
                  <div
                    key={warning.report_id}
                    className="bg-dark-200 border-2 border-orange-500 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <MdWarning className="text-orange-500" size={24} />
                          <h3 className="text-lg font-bold text-orange-400">Warning: Action Required</h3>
                        </div>
                        <p className="text-white bg-dark-300 p-3 rounded mb-3">{warning.reason}</p>

                        {/* Resolution Requirements */}
                        {(warning.resolution_amount || warning.resolution_notes) && (
                          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-4">
                            <p className="text-yellow-400 font-medium mb-2">To Resolve:</p>
                            {warning.resolution_amount && (
                              <p className="text-white mb-1">
                                Amount to pay/refund: <span className="text-gold-500 font-bold">${warning.resolution_amount.toFixed(2)}</span>
                              </p>
                            )}
                            {warning.resolution_notes && (
                              <p className="text-gray-300 text-sm">{warning.resolution_notes}</p>
                            )}
                          </div>
                        )}

                        {/* Countdown Timer */}
                        <div className={`rounded-lg p-4 ${
                          warning.days_remaining <= 1
                            ? 'bg-red-900/30 border border-red-500'
                            : 'bg-dark-300'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MdAccessTime className={warning.days_remaining <= 1 ? 'text-red-400' : 'text-orange-400'} size={20} />
                              <span className="text-gray-400">Time Remaining:</span>
                            </div>
                            <span className={`font-bold text-lg ${
                              warning.days_remaining <= 1 ? 'text-red-400' : 'text-orange-400'
                            }`}>
                              {warning.days_remaining} days, {warning.hours_remaining} hours
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Deadline: {new Date(warning.warning_deadline).toLocaleString()}
                          </p>
                        </div>

                        <p className="text-xs text-gray-500 mt-3">
                          Warning issued: {new Date(warning.warning_sent_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4 pt-4 border-t border-dark-400">
                      <Button
                        onClick={() => openResolveModal(warning)}
                        fullWidth
                        variant="primary"
                      >
                        <MdPayment className="mr-2" />
                        Submit Resolution Proof
                      </Button>
                    </div>

                    <div className="mt-4 bg-red-900/20 border border-red-700 rounded-lg p-3">
                      <p className="text-sm text-red-400">
                        <strong>Warning:</strong> If not resolved within the deadline, this report will be automatically marked as valid.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'report_client' ? (
          // Report Client Tab
          <div>
            {loadingFriends ? (
              <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
                <div className="text-gold-500">Loading clients...</div>
              </div>
            ) : friends.length === 0 ? (
              <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
                <MdReport className="text-6xl text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No clients to report</p>
                <p className="text-sm text-gray-500">You can only report clients you are connected with</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-dark-200 border-2 border-gold-700 rounded-lg p-4 hover:shadow-gold transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar
                        name={friend.full_name || friend.username}
                        size="md"
                        online={friend.is_online}
                        src={friend.profile_picture}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{friend.username}</h3>
                        <p className="text-sm text-gray-400 truncate">{friend.full_name}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => openReportForClient(friend)}
                      variant="secondary"
                      fullWidth
                    >
                      <MdReport className="mr-1" />
                      Report
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : currentReports.length === 0 ? (
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
            <MdReport className="text-6xl text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No reports found</p>
          </div>
        ) : (
          // Reports List
          currentReports.map((report) => {
            const isMade = activeTab === 'made';
            const displayName = isMade
              ? report.reported_user_username || report.reported_user_name || 'Unknown Client'
              : report.reporter_username || report.reporter_name || 'Unknown User';
            const status = report.status || 'pending';
            const canAppeal = !isMade && status === 'valid' && !report.appeal_ticket_id;

            return (
              <div
                key={report.id}
                className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6 hover:shadow-gold transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{report.reason}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[status]}`}>
                        {STATUS_ICONS[status]} {status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      {isMade ? 'Reported User' : 'Reported By'}:{' '}
                      <span className="text-gold-500">{displayName}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Submitted: {formatDate(report.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isMade && status === 'pending' && (
                      <>
                        <button
                          type="button"
                          title="Edit report"
                          onClick={() => openEditModal(report)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                        >
                          <MdEdit size={16} />
                        </button>
                        <button
                          type="button"
                          title="Delete report"
                          onClick={() => handleDeleteReport(report.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                        >
                          <MdDelete size={16} />
                        </button>
                      </>
                    )}
                    {canAppeal && (
                      <button
                        type="button"
                        onClick={() => openAppealModal(report)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                        title="Appeal this report"
                      >
                        <MdGavel size={16} />
                        Appeal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleViewDetails(report)}
                      className="bg-dark-300 hover:bg-dark-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                {/* Status-specific messages */}
                {!isMade && status === 'valid' && (
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 mb-3">
                    <p className="text-sm text-green-400 flex items-center gap-2">
                      <MdCheck /> This report has been validated by admin
                    </p>
                    {report.action_taken && (
                      <p className="text-xs text-gray-400 mt-1">Action taken: {report.action_taken}</p>
                    )}
                  </div>
                )}
                {!isMade && status === 'investigating' && (
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 mb-3">
                    <p className="text-sm text-blue-400 flex items-center gap-2">
                      <MdSearch /> This report is being investigated
                    </p>
                  </div>
                )}
                {!isMade && status === 'warning' && (
                  <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-3 mb-3">
                    <p className="text-sm text-orange-400 flex items-center gap-2">
                      <MdWarning /> Warning: You must resolve this report within the grace period
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Go to the "Warnings" tab to view details and submit resolution proof.
                    </p>
                    <Button
                      variant="secondary"
                      className="mt-2"
                      onClick={() => setActiveTab('warnings')}
                    >
                      <MdAccessTime className="mr-1" /> View Warning Details
                    </Button>
                  </div>
                )}
                {!isMade && status === 'resolved' && (
                  <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3 mb-3">
                    <p className="text-sm text-purple-400 flex items-center gap-2">
                      <MdPayment /> Resolution submitted - awaiting admin verification
                    </p>
                    {report.resolved_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Resolved on: {new Date(report.resolved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                {!isMade && report.appeal_ticket_id && (
                  <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3 mb-3">
                    <p className="text-sm text-purple-400 flex items-center gap-2">
                      <MdGavel /> You have appealed this report
                    </p>
                  </div>
                )}
                {isMade && status === 'malicious' && (
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <MdWarning /> This report was marked as malicious
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Warning: Repeated malicious reports may result in account suspension.
                    </p>
                  </div>
                )}
                {isMade && status === 'invalid' && (
                  <div className="bg-gray-900/20 border border-gray-700 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <MdClose /> This report was determined to be invalid
                    </p>
                  </div>
                )}

                {/* Admin Notes Preview (if available) */}
                {report.admin_notes && (
                  <div className="mt-4 pt-4 border-t border-dark-400">
                    <p className="text-sm text-gray-400 mb-1">Admin Notes:</p>
                    <p className="text-sm text-white bg-dark-300 p-3 rounded">{report.admin_notes}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Make Report Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          resetForm();
        }}
        title="Make a Report"
        size="lg"
      >
        <div className="space-y-4">
          {formData.clientUsername ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
              <p className="text-white bg-dark-300 px-4 py-3 rounded-lg">{formData.clientUsername}</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select a Client to Report</label>
              <select
                title="Select a client to report"
                value={formData.clientId}
                onChange={(e) => {
                  const selectedFriend = friends.find(f => f.id === Number(e.target.value));
                  setFormData({
                    ...formData,
                    clientId: Number(e.target.value),
                    clientUsername: selectedFriend?.username || '',
                  });
                }}
                className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value={0}>Select a client...</option>
                {friends.map((friend) => (
                  <option key={friend.id} value={friend.id}>
                    {friend.username} ({friend.full_name})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Reason *</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Describe the issue in detail..."
              rows={5}
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <p className="text-sm text-yellow-400">
              <strong>Note:</strong> False reports may result in account penalties. Please ensure
              your report is accurate and detailed.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowReportModal(false);
                resetForm();
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={handleMakeReport} loading={loading} fullWidth variant="danger">
              Submit Report
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Report Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedReport(null);
          resetForm();
        }}
        title="Edit Report"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Update your report reason..."
              rows={5}
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setSelectedReport(null);
                resetForm();
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={handleEditReport} loading={loading} fullWidth>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report Details Modal */}
      {selectedReport && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReport(null);
          }}
          title="Report Details"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <Badge variant={getStatusVariant(selectedReport.status)} dot>
                {getStatusIcon(selectedReport.status)} {selectedReport.status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {activeTab === 'made' ? 'Reported User' : 'Reporter'}
              </label>
              <p className="text-white">
                {activeTab === 'made'
                  ? selectedReport.reported_user_username || selectedReport.reported_user_name
                  : selectedReport.reporter_username || selectedReport.reporter_name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
              <p className="text-white bg-dark-300 p-4 rounded-lg">{selectedReport.reason}</p>
            </div>
            {selectedReport.admin_notes && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Admin Response
                </label>
                <p className="text-white bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
                  {selectedReport.admin_notes}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Submitted</label>
              <p className="text-white">{new Date(selectedReport.created_at).toLocaleString()}</p>
            </div>

            {selectedReport.status === 'pending' && (
              <div className="bg-yellow-900/30 border-2 border-yellow-700 rounded-lg p-4 text-center">
                <MdWarning className="text-4xl text-yellow-500 mx-auto mb-2" />
                <p className="text-yellow-400 font-bold">Pending Review</p>
                <p className="text-sm text-gray-400 mt-1">
                  Your report is awaiting admin review. We'll notify you once it's been processed.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Appeal Report Modal */}
      <Modal
        isOpen={showAppealModal}
        onClose={() => {
          setShowAppealModal(false);
          setSelectedReport(null);
          setAppealReason('');
        }}
        title="Appeal Report"
        size="lg"
      >
        <div className="space-y-4">
          {selectedReport && (
            <>
              <div className="bg-dark-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Reported by:</span>
                  <span className="text-gold-500 font-medium">
                    {selectedReport.reporter_username || selectedReport.reporter_name || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[selectedReport.status]}`}>
                    {STATUS_ICONS[selectedReport.status]} {selectedReport.status.toUpperCase()}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-dark-400">
                  <p className="text-gray-400 text-sm mb-1">Report Reason:</p>
                  <p className="text-white">{selectedReport.reason}</p>
                </div>
                {selectedReport.evidence && (
                  <div className="mt-3 pt-3 border-t border-dark-400">
                    <p className="text-gray-400 text-sm mb-1">Evidence Provided:</p>
                    <p className="text-white">{selectedReport.evidence}</p>
                  </div>
                )}
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <MdWarning className="text-yellow-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-yellow-400 font-medium">Before you appeal</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Appeals should only be made if you believe the report against you is false,
                      misleading, or violates community guidelines. A support ticket will be created
                      for admin review.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Why do you want to appeal this report? *
                </label>
                <textarea
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Explain why this report is false or unfair..."
                  rows={4}
                  className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAppealModal(false);
                    setSelectedReport(null);
                    setAppealReason('');
                  }}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button onClick={handleAppealReport} loading={loading} fullWidth>
                  <MdGavel className="mr-1" />
                  Submit Appeal
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Resolve Report Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => {
          setShowResolveModal(false);
          setSelectedReport(null);
          setResolutionProof('');
          setResolutionNotes('');
        }}
        title="Submit Resolution Proof"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <MdWarning className="text-orange-500 mt-0.5" size={20} />
              <div>
                <p className="text-orange-400 font-medium">Resolution Required</p>
                <p className="text-sm text-gray-400 mt-1">
                  Submit proof that you have resolved the issue (e.g., transaction ID, screenshot URL,
                  payment confirmation). Admin will verify your submission.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resolution Proof *
            </label>
            <textarea
              value={resolutionProof}
              onChange={(e) => setResolutionProof(e.target.value)}
              placeholder="Provide proof of resolution (transaction ID, payment screenshot URL, etc.)..."
              rows={4}
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Any additional context or explanation..."
              rows={3}
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-400">
              <strong>Note:</strong> After submitting, an admin will review your resolution proof.
              If verified, the report will be dismissed.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowResolveModal(false);
                setSelectedReport(null);
                setResolutionProof('');
                setResolutionNotes('');
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={handleResolveReport} loading={loading} fullWidth>
              <MdPayment className="mr-1" />
              Submit Resolution
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
