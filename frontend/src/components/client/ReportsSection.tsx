import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import { MdReport, MdAdd, MdCheckCircle, MdPending, MdRefresh, MdEdit, MdDelete, MdGavel, MdWarning, MdSearch, MdClose, MdCheck, MdAccessTime, MdPayment } from 'react-icons/md';
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
  const [activeTab, setActiveTab] = useState<'made' | 'received' | 'warnings' | 'report_player'>('made');
  const [showMakeReportModal, setShowMakeReportModal] = useState(false);
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

  // Reports data
  const [reportsMade, setReportsMade] = useState<Report[]>([]);
  const [reportsReceived, setReportsReceived] = useState<Report[]>([]);
  const [warnings, setWarnings] = useState<ReportWarning[]>([]);

  // Friends (players) for report tab
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    playerId: 0,
    playerUsername: '',
    reason: '',
  });

  // Delete confirmation modal state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [pendingDeleteReportId, setPendingDeleteReportId] = useState<number | null>(null);

  // Load reports on mount
  useEffect(() => {
    loadReports();
  }, []);

  // Load friends when report_player tab is selected
  useEffect(() => {
    if (activeTab === 'report_player' && friends.length === 0) {
      loadFriends();
    }
  }, [activeTab]);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const [reportsResponse, warningsResponse] = await Promise.all([
        reportsApi.getMyReports(),
        reportsApi.getMyWarnings(),
      ]);
      setReportsMade(reportsResponse.reports_made);
      setReportsReceived(reportsResponse.reports_received);
      setWarnings(warningsResponse);
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
      // Filter to show only players (clients report players)
      const players = data.filter(f => f.user_type === 'player');
      setFriends(players);
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
    if (!formData.playerId || !formData.reason.trim()) {
      toast.error('Please select a player and provide a reason');
      return;
    }

    setLoading(true);
    try {
      const newReport = await reportsApi.createReport({
        reported_user_id: formData.playerId,
        reason: formData.reason,
      });

      setReportsMade(prev => [newReport, ...prev]);
      toast.success('Report submitted successfully');
      setShowMakeReportModal(false);
      resetForm();
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

  const handleDeleteReport = (reportId: number) => {
    setPendingDeleteReportId(reportId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteReport = async () => {
    if (!pendingDeleteReportId) return;

    try {
      await reportsApi.deleteReport(pendingDeleteReportId);
      setReportsMade(prev => prev.filter(r => r.id !== pendingDeleteReportId));
      toast.success('Report deleted');
    } catch (error: any) {
      toast.error(error.detail || 'Failed to delete report');
      console.error(error);
    } finally {
      setShowDeleteConfirmModal(false);
      setPendingDeleteReportId(null);
    }
  };

  const openReportForPlayer = async (friend: Friend) => {
    // Check if already reported
    try {
      const reportCheck = await reportsApi.getUserReports(friend.id);
      if (!reportCheck.can_report) {
        toast.error('You have already reported this player');
        return;
      }

      setFormData({
        playerId: friend.id,
        playerUsername: friend.username,
        reason: '',
      });
      setShowMakeReportModal(true);
    } catch (error: any) {
      toast.error(error.detail || 'Failed to check report eligibility');
    }
  };

  const openEditModal = (report: Report) => {
    setSelectedReport(report);
    setFormData({
      playerId: report.reported_user_id,
      playerUsername: report.reported_user_username || '',
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
      playerId: 0,
      playerUsername: '',
      reason: '',
    });
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

  const handleAppealReport = async () => {
    if (!selectedReport || !appealReason.trim()) {
      toast.error('Please provide a reason for your appeal');
      return;
    }

    if (appealReason.trim().length < 10) {
      toast.error('Appeal reason must be at least 10 characters long');
      return;
    }

    setLoading(true);
    try {
      const result = await reportsApi.appealReport(selectedReport.id, appealReason);
      toast.success(`Appeal submitted! Ticket #${result.ticket_number} created`);

      // Update the report with appeal ticket ID
      setReportsReceived(prev =>
        prev.map(r => r.id === selectedReport.id
          ? { ...r, appeal_ticket_id: result.ticket_id }
          : r
        )
      );

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
          <p className="text-gray-400">Manage reports and violations</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadReports}
            className="bg-dark-300 hover:bg-dark-400 text-gold-500 p-3 rounded-lg transition-colors"
            title="Refresh"
          >
            <MdRefresh size={20} />
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowMakeReportModal(true);
            }}
            className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <MdAdd size={20} />
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
          { key: 'report_player', label: 'Report Player' },
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
        ) : activeTab === 'report_player' ? (
          // Report Player Tab
          <div>
            {loadingFriends ? (
              <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
                <div className="text-gold-500">Loading players...</div>
              </div>
            ) : friends.length === 0 ? (
              <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
                <MdReport className="text-6xl text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No players to report</p>
                <p className="text-sm text-gray-500">You can only report players you are connected with</p>
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
                      onClick={() => openReportForPlayer(friend)}
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
              ? report.reported_user_username || report.reported_user_name || 'Unknown Player'
              : report.reporter_username || report.reporter_name || 'Unknown User';
            const canAppeal = !isMade && report.status === 'valid' && !report.appeal_ticket_id;

            return (
              <div
                key={report.id}
                className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6 hover:shadow-gold transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{report.reason}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[report.status]}`}>
                        {STATUS_ICONS[report.status]} {report.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      {isMade ? 'Reported User' : 'Reported By'}:{' '}
                      <span className="text-gold-500">{displayName}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Submitted: {formatDate(report.created_at)}
                    </p>
                    {report.appeal_ticket_id && (
                      <p className="text-xs text-purple-400 mt-1">
                        <MdGavel className="inline mr-1" />
                        Appeal submitted (Ticket #{report.appeal_ticket_id})
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isMade && report.status === 'pending' && (
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
                        title="Appeal this report"
                        onClick={() => openAppealModal(report)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
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

                {/* Warning status display */}
                {!isMade && report.status === 'warning' && (
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
                {!isMade && report.status === 'resolved' && (
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

                {/* Action Taken (if available) */}
                {report.action_taken && (
                  <div className="mt-4 pt-4 border-t border-dark-400">
                    <p className="text-sm text-gray-400 mb-1">Action Taken:</p>
                    <p className="text-sm text-red-400 bg-red-900/20 border border-red-700 p-3 rounded">{report.action_taken}</p>
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
        isOpen={showMakeReportModal}
        onClose={() => {
          setShowMakeReportModal(false);
          resetForm();
        }}
        title="Make a Report"
        size="lg"
      >
        <div className="space-y-4">
          {formData.playerUsername ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Player</label>
              <p className="text-white bg-dark-300 px-4 py-3 rounded-lg">{formData.playerUsername}</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select a Player to Report</label>
              <select
                title="Select a player to report"
                value={formData.playerId}
                onChange={(e) => {
                  const selectedFriend = friends.find(f => f.id === Number(e.target.value));
                  setFormData({
                    ...formData,
                    playerId: Number(e.target.value),
                    playerUsername: selectedFriend?.username || '',
                  });
                }}
                className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value={0}>Select a player...</option>
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
                setShowMakeReportModal(false);
                resetForm();
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={handleMakeReport} loading={loading} fullWidth>
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
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[selectedReport.status]}`}>
                {STATUS_ICONS[selectedReport.status]} {selectedReport.status.toUpperCase()}
              </span>
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
            {selectedReport.action_taken && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Action Taken</label>
                <p className="text-red-400 bg-red-900/20 border border-red-700 p-4 rounded-lg">
                  {selectedReport.action_taken}
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
              <div className="bg-dark-300 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Report Against You</p>
                <p className="text-white font-medium">{selectedReport.reason}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-400">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[selectedReport.status]}`}>
                    {STATUS_ICONS[selectedReport.status]} {selectedReport.status.toUpperCase()}
                  </span>
                </div>
                {selectedReport.action_taken && (
                  <div className="mt-3 pt-3 border-t border-dark-400">
                    <p className="text-sm text-gray-400 mb-1">Action Taken:</p>
                    <p className="text-sm text-red-400">{selectedReport.action_taken}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Why are you appealing this report? *
                </label>
                <textarea
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Explain why you believe this report is unfair or incorrect..."
                  rows={5}
                  className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Minimum 10 characters required
                </p>
              </div>

              <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                <p className="text-sm text-purple-400">
                  <MdGavel className="inline mr-2" />
                  <strong>Note:</strong> Your appeal will create a support ticket that will be reviewed
                  by our admin team. Please provide detailed and honest information.
                </p>
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
                <Button
                  onClick={handleAppealReport}
                  loading={loading}
                  fullWidth
                  className="!bg-purple-600 hover:!bg-purple-700"
                >
                  <MdGavel className="mr-2" />
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

      {/* Delete Report Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setPendingDeleteReportId(null);
        }}
        title="Delete Report"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <MdWarning className="text-red-500 text-2xl flex-shrink-0" />
            <p className="text-gray-300">
              Are you sure you want to delete this report? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setPendingDeleteReportId(null);
              }}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteReport}
              variant="primary"
              fullWidth
              className="!bg-red-600 hover:!bg-red-700"
            >
              Delete Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
