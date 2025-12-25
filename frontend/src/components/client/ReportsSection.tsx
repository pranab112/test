import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import { MdReport, MdAdd, MdCheckCircle, MdPending, MdCancel } from 'react-icons/md';

interface Report {
  id: number;
  reporterId: number;
  reporterName: string;
  reportedId: number;
  reportedName: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
  type: 'made' | 'received';
}

export function ReportsSection() {
  const [activeTab, setActiveTab] = useState<'made' | 'received'>('made');
  const [showMakeReportModal, setShowMakeReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    reason: 'harassment',
    description: '',
  });

  // TODO: Replace with API call
  const mockReports: Report[] = [
    {
      id: 1,
      reporterId: 1,
      reporterName: 'You',
      reportedId: 101,
      reportedName: 'player_alex',
      reason: 'Inappropriate Behavior',
      description: 'Player was using offensive language in chat.',
      status: 'reviewed',
      adminNotes: 'User has been warned.',
      createdAt: '2025-12-20',
      type: 'made',
    },
    {
      id: 2,
      reporterId: 1,
      reporterName: 'You',
      reportedId: 102,
      reportedName: 'gamer_mike',
      reason: 'Fraud/Scam',
      description: 'Attempted to request credentials without claiming promotion.',
      status: 'resolved',
      adminNotes: 'User account suspended for violation of terms.',
      createdAt: '2025-12-15',
      type: 'made',
    },
    {
      id: 3,
      reporterId: 103,
      reporterName: 'player_john',
      reportedId: 1,
      reportedName: 'You',
      reason: 'Late Credential Delivery',
      description: 'Credentials were provided 2 days late.',
      status: 'dismissed',
      adminNotes: 'Delay was due to verification process. Not a violation.',
      createdAt: '2025-12-18',
      type: 'received',
    },
    {
      id: 4,
      reporterId: 104,
      reporterName: 'gamer_sarah',
      reportedId: 1,
      reportedName: 'You',
      reason: 'Account Issues',
      description: 'Game account credentials were not working.',
      status: 'resolved',
      adminNotes: 'Issue resolved. New credentials provided.',
      createdAt: '2025-12-10',
      type: 'received',
    },
  ];

  const [reports] = useState(mockReports);

  const filteredReports = reports.filter((report) => report.type === activeTab);

  const stats = {
    madeReports: reports.filter((r) => r.type === 'made').length,
    receivedReports: reports.filter((r) => r.type === 'received').length,
    pendingMade: reports.filter((r) => r.type === 'made' && r.status === 'pending').length,
    resolvedReceived: reports.filter((r) => r.type === 'received' && r.status === 'resolved').length,
  };

  const handleMakeReport = async () => {
    if (!formData.username || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await clientApi.createReport(formData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Report submitted successfully');
      setShowMakeReportModal(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to submit report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      reason: 'harassment',
      description: '',
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Reports</h1>
          <p className="text-gray-400">Manage reports and violations</p>
        </div>
        <button
          onClick={() => setShowMakeReportModal(true)}
          className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <MdAdd size={20} />
          Make Report
        </button>
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
        ].map((tab) => (
          <button
            key={tab.key}
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

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
            <MdReport className="text-6xl text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No reports found</p>
          </div>
        ) : (
          filteredReports.map((report) => (
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
                    {report.type === 'made' ? 'Reported User' : 'Reported By'}:{' '}
                    <span className="text-gold-500">
                      {report.type === 'made' ? report.reportedName : report.reporterName}
                    </span>
                  </p>
                  <p className="text-gray-300 mb-3">{report.description}</p>
                  <p className="text-xs text-gray-500">
                    Submitted: {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleViewDetails(report)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  View Details
                </button>
              </div>

              {/* Admin Notes Preview (if available) */}
              {report.adminNotes && (
                <div className="mt-4 pt-4 border-t border-dark-400">
                  <p className="text-sm text-gray-400 mb-1">Admin Notes:</p>
                  <p className="text-sm text-white bg-dark-300 p-3 rounded">{report.adminNotes}</p>
                </div>
              )}
            </div>
          ))
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
          <Input
            label="Username to Report"
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Enter username..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="harassment">Harassment</option>
              <option value="fraud">Fraud/Scam</option>
              <option value="inappropriate_behavior">Inappropriate Behavior</option>
              <option value="spam">Spam</option>
              <option value="account_issues">Account Issues</option>
              <option value="payment_issues">Payment Issues</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide details about the issue..."
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
                {selectedReport.type === 'made' ? 'Reported User' : 'Reporter'}
              </label>
              <p className="text-white">
                {selectedReport.type === 'made'
                  ? selectedReport.reportedName
                  : selectedReport.reporterName}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
              <p className="text-white">{selectedReport.reason}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <p className="text-white bg-dark-300 p-4 rounded-lg">{selectedReport.description}</p>
            </div>
            {selectedReport.adminNotes && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Admin Response
                </label>
                <p className="text-white bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
                  {selectedReport.adminNotes}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Submitted</label>
              <p className="text-white">{new Date(selectedReport.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
