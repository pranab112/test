import { useState, useEffect } from 'react';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import { MdReport, MdWarning, MdRefresh, MdEdit, MdDelete, MdCheckCircle, MdPending, MdCancel } from 'react-icons/md';
import { reportsApi, type Report } from '@/api/endpoints/reports.api';
import { friendsApi, type Friend } from '@/api/endpoints/friends.api';
import { useAuth } from '@/contexts/AuthContext';

export function ReportsSection() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'made' | 'received' | 'report_client'>('made');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);

  // Reports data
  const [reportsMade, setReportsMade] = useState<Report[]>([]);
  const [reportsReceived, setReportsReceived] = useState<Report[]>([]);

  // Friends (clients) for report tab
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientId: 0,
    clientUsername: '',
    reason: '',
  });

  // Load reports on mount
  useEffect(() => {
    loadReports();
  }, []);

  // Load friends when report_client tab is selected
  useEffect(() => {
    if (activeTab === 'report_client' && friends.length === 0) {
      loadFriends();
    }
  }, [activeTab]);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const response = await reportsApi.getMyReports();
      setReportsMade(response.reports_made);
      setReportsReceived(response.reports_received);
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
    resolvedReceived: reportsReceived.filter(r => r.status === 'resolved').length,
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

      setReportsMade(prev => [newReport, ...prev]);
      toast.success('Report submitted successfully');
      setShowReportModal(false);
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

  const getStatusVariant = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'reviewed':
        return 'info';
      case 'resolved':
        return 'success';
      case 'dismissed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return <MdPending className="inline" />;
      case 'reviewed':
      case 'resolved':
        return <MdCheckCircle className="inline" />;
      case 'dismissed':
        return <MdCancel className="inline" />;
      default:
        return null;
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
          title="Resolved (Received)"
          value={stats.resolvedReceived}
          icon={<MdCheckCircle />}
          color="green"
        />
      </div>

      {/* Tab Interface */}
      <div className="flex gap-2 border-b border-gold-700">
        {[
          { key: 'made', label: 'Made' },
          { key: 'received', label: 'Received' },
          { key: 'report_client', label: 'Report Client' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-gold-500 border-b-2 border-gold-500'
                : 'text-gray-400 hover:text-gold-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loadingReports ? (
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
            <div className="text-gold-500">Loading reports...</div>
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
                      size="sm"
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

            return (
              <div
                key={report.id}
                className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6 hover:shadow-gold transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{report.reason}</h3>
                      <Badge variant={getStatusVariant(report.status)} dot>
                        {getStatusIcon(report.status)} {report.status.toUpperCase()}
                      </Badge>
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
                    <button
                      type="button"
                      onClick={() => handleViewDetails(report)}
                      className="bg-dark-300 hover:bg-dark-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>

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
    </div>
  );
}
