import { useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { MdReport, MdWarning } from 'react-icons/md';

interface Report {
  id: number;
  reported_user: string;
  reported_user_type: 'player' | 'client';
  reason: string;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at?: string;
  admin_response?: string;
}

// TODO: Replace with API data
const MOCK_REPORTS: Report[] = [
  {
    id: 1,
    reported_user: 'player_spam',
    reported_user_type: 'player',
    reason: 'Spam messages',
    description: 'This user keeps sending spam messages in chat',
    status: 'pending',
    created_at: '2025-12-23',
  },
  {
    id: 2,
    reported_user: 'fake_client_123',
    reported_user_type: 'client',
    reason: 'Suspicious activity',
    description: 'This client seems to be fraudulent and not paying out bonuses',
    status: 'investigating',
    created_at: '2025-12-20',
  },
  {
    id: 3,
    reported_user: 'player_offensive',
    reported_user_type: 'player',
    reason: 'Harassment',
    description: 'Using offensive language and harassing other players',
    status: 'resolved',
    created_at: '2025-12-15',
    resolved_at: '2025-12-18',
    admin_response: 'User has been warned and banned for 7 days. Thank you for reporting.',
  },
];

const REPORT_REASONS = [
  'Spam messages',
  'Harassment',
  'Offensive language',
  'Suspicious activity',
  'Fraud',
  'Cheating',
  'Impersonation',
  'Other',
];

const REPORTABLE_USERS = [
  { id: 1, username: 'player_example', type: 'player' as const },
  { id: 2, username: 'suspicious_client', type: 'client' as const },
];

export function ReportsSection() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<typeof REPORTABLE_USERS[0] | null>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleOpenReportModal = (user: typeof REPORTABLE_USERS[0]) => {
    setSelectedUser(user);
    setReason('');
    setDescription('');
    setShowReportModal(true);
  };

  const handleSubmitReport = () => {
    if (!selectedUser) return;
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setSubmitting(true);
    // TODO: API call to submit report
    setTimeout(() => {
      setSubmitting(false);
      toast.success(`Report submitted for ${selectedUser.username}`);
      setShowReportModal(false);
      setSelectedUser(null);
    }, 1000);
  };

  const handleViewDetails = (report: Report) => {
    setViewingReport(report);
    setShowDetailsModal(true);
  };

  const getStatusVariant = (status: Report['status']): 'warning' | 'info' | 'success' | 'default' => {
    switch (status) {
      case 'pending': return 'warning';
      case 'investigating': return 'info';
      case 'resolved': return 'success';
      case 'dismissed': return 'default';
      default: return 'default';
    }
  };

  const columns = [
    {
      key: 'reported_user',
      label: 'Reported User',
      render: (report: Report) => (
        <div>
          <div className="font-medium text-white">{report.reported_user}</div>
          <Badge variant={report.reported_user_type === 'client' ? 'info' : 'purple'} size="sm">
            {report.reported_user_type}
          </Badge>
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      width: '20%',
    },
    {
      key: 'description',
      label: 'Description',
      width: '30%',
      render: (report: Report) => (
        <p className="text-sm text-gray-400 truncate max-w-xs">
          {report.description}
        </p>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (report: Report) => (
        <Badge variant={getStatusVariant(report.status)}>
          {report.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (report: Report) => (
        <span className="text-sm text-gray-400">
          {new Date(report.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (report: Report) => (
        <button
          onClick={() => handleViewDetails(report)}
          className="text-blue-500 hover:text-blue-400 text-sm font-medium"
        >
          View Details
        </button>
      ),
    },
  ];

  const stats = {
    total: MOCK_REPORTS.length,
    pending: MOCK_REPORTS.filter(r => r.status === 'pending').length,
    investigating: MOCK_REPORTS.filter(r => r.status === 'investigating').length,
    resolved: MOCK_REPORTS.filter(r => r.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Reports</h1>
        <p className="text-gray-400">Your submitted reports and their status</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-300 border-2 border-gold-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Total Reports</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-dark-300 border-2 border-yellow-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-500">{stats.pending}</p>
        </div>
        <div className="bg-dark-300 border-2 border-blue-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Investigating</p>
          <p className="text-3xl font-bold text-blue-500">{stats.investigating}</p>
        </div>
        <div className="bg-dark-300 border-2 border-green-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Resolved</p>
          <p className="text-3xl font-bold text-green-500">{stats.resolved}</p>
        </div>
      </div>

      {/* Make a Report Button */}
      <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 border-2 border-red-700 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <MdWarning className="text-5xl text-red-500" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-red-400 mb-2">Report a User</h3>
            <p className="text-gray-300 mb-4">
              Help us maintain a safe community by reporting suspicious or inappropriate behavior.
            </p>
            <div className="flex gap-3">
              {REPORTABLE_USERS.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleOpenReportModal(user)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Report {user.username}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gold-500 mb-4">Your Reports</h2>
        <DataTable
          data={MOCK_REPORTS}
          columns={columns}
          emptyMessage="You haven't submitted any reports"
        />
      </div>

      {/* Submit Report Modal */}
      {showReportModal && selectedUser && (
        <Modal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedUser(null);
          }}
          title={`Report ${selectedUser.username}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="bg-red-900/30 border-2 border-red-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <MdReport className="text-3xl text-red-500" />
                <div>
                  <h3 className="font-bold text-white">Reporting: {selectedUser.username}</h3>
                  <Badge variant={selectedUser.type === 'client' ? 'info' : 'purple'}>
                    {selectedUser.type}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-300">
                Please provide accurate information. False reports may result in penalties.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">Select a reason...</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide details about the incident..."
                rows={6}
                className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-2">
                Be as specific as possible. Include dates, times, and any relevant context.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSubmitReport}
                loading={submitting}
                variant="danger"
                fullWidth
              >
                Submit Report
              </Button>
              <Button
                onClick={() => setShowReportModal(false)}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Report Details Modal */}
      {showDetailsModal && viewingReport && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setViewingReport(null);
          }}
          title="Report Details"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-dark-300 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Reported User</p>
                  <div>
                    <p className="font-bold text-white">{viewingReport.reported_user}</p>
                    <Badge variant={viewingReport.reported_user_type === 'client' ? 'info' : 'purple'} size="sm">
                      {viewingReport.reported_user_type}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  <Badge variant={getStatusVariant(viewingReport.status)} size="lg">
                    {viewingReport.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Report ID</p>
                  <p className="font-mono text-white">#{viewingReport.id.toString().padStart(6, '0')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Submitted</p>
                  <p className="text-white">{new Date(viewingReport.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-1">Reason</p>
                <p className="font-medium text-white">{viewingReport.reason}</p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Description</p>
                <p className="text-white">{viewingReport.description}</p>
              </div>
            </div>

            {viewingReport.status === 'resolved' && viewingReport.admin_response && (
              <div className="bg-green-900/30 border-2 border-green-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MdReport className="text-xl text-green-500" />
                  <h4 className="font-bold text-green-400">Admin Response</h4>
                </div>
                <p className="text-gray-300 text-sm">{viewingReport.admin_response}</p>
                {viewingReport.resolved_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    Resolved on {new Date(viewingReport.resolved_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {viewingReport.status === 'pending' && (
              <div className="bg-yellow-900/30 border-2 border-yellow-700 rounded-lg p-4 text-center">
                <MdWarning className="text-4xl text-yellow-500 mx-auto mb-2" />
                <p className="text-yellow-400 font-bold">Pending Review</p>
                <p className="text-sm text-gray-400 mt-1">
                  Your report is awaiting admin review. We'll notify you once it's been processed.
                </p>
              </div>
            )}

            {viewingReport.status === 'investigating' && (
              <div className="bg-blue-900/30 border-2 border-blue-700 rounded-lg p-4 text-center">
                <MdReport className="text-4xl text-blue-500 mx-auto mb-2" />
                <p className="text-blue-400 font-bold">Under Investigation</p>
                <p className="text-sm text-gray-400 mt-1">
                  Our team is currently investigating this report. Thank you for your patience.
                </p>
              </div>
            )}

            <Button
              onClick={() => setShowDetailsModal(false)}
              variant="secondary"
              fullWidth
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
