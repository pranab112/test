import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import toast from 'react-hot-toast';
import { MdSearch, MdWarning, MdCheck, MdClose, MdFilterList } from 'react-icons/md';
import { adminApi, type ReportStatus } from '@/api/endpoints';
import { type Report } from '@/api/endpoints/reports.api';

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  investigating: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  warning: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  resolved: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  valid: 'bg-green-500/20 text-green-400 border-green-500/50',
  invalid: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  malicious: 'bg-red-500/20 text-red-400 border-red-500/50',
};

export function ReportsSection() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('');
  const [counts, setCounts] = useState({
    pending: 0,
    investigating: 0,
    warning: 0,
    resolved: 0,
    valid: 0,
    invalid: 0,
    malicious: 0,
  });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter) params.status_filter = statusFilter;
      const data = await adminApi.getPendingReports(params);
      setReports(data.reports);
      setCounts({
        pending: data.pending_count,
        investigating: data.investigating_count,
        warning: data.warning_count || 0,
        resolved: data.resolved_count || 0,
        valid: data.valid_count,
        invalid: data.invalid_count,
        malicious: data.malicious_count,
      });
    } catch (error) {
      toast.error('Failed to load reports');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvestigate = async (action: 'investigating' | 'valid' | 'invalid' | 'malicious' | 'resolved') => {
    if (!selectedReport) return;

    try {
      await adminApi.investigateReport(
        selectedReport.id,
        action,
        adminNotes || undefined,
        (action === 'valid' || action === 'resolved') ? actionTaken || undefined : undefined
      );

      const messages: Record<string, string> = {
        investigating: 'Report marked as under investigation',
        valid: 'Report marked as valid',
        invalid: 'Report marked as invalid',
        malicious: 'Report marked as malicious (reporter penalized)',
        resolved: 'Report closed/resolved successfully',
      };

      toast.success(messages[action]);
      setShowModal(false);
      setSelectedReport(null);
      setAdminNotes('');
      setActionTaken('');
      loadReports();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update report');
    }
  };

  const openInvestigationModal = (report: Report) => {
    setSelectedReport(report);
    setAdminNotes('');
    setActionTaken('');
    setShowModal(true);
  };

  const columns = [
    {
      key: 'reporter',
      label: 'Reporter',
      render: (report: Report) => report.reporter_username,
    },
    {
      key: 'reported_user',
      label: 'Reported User',
      render: (report: Report) => report.reported_user_username,
    },
    {
      key: 'reason',
      label: 'Reason',
      width: '25%',
      render: (report: Report) => (
        <div className="truncate max-w-xs" title={report.reason}>
          {report.reason}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (report: Report) => (
        <span className={`px-2 py-1 rounded-full text-xs border ${STATUS_COLORS[report.status]}`}>
          {report.status.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (report: Report) => new Date(report.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (report: Report) => (
        <button
          onClick={() => openInvestigationModal(report)}
          className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
        >
          <MdSearch size={14} />
          Investigate
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Report Investigation</h1>
        <p className="text-gray-400">Investigate user reports and take action against fake reporters</p>
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-yellow-500/30">
          <div className="text-2xl font-bold text-yellow-400">{counts.pending}</div>
          <div className="text-gray-400 text-sm">Pending</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-400">{counts.investigating}</div>
          <div className="text-gray-400 text-sm">Investigating</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{counts.valid}</div>
          <div className="text-gray-400 text-sm">Valid</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-500/30">
          <div className="text-2xl font-bold text-gray-400">{counts.invalid}</div>
          <div className="text-gray-400 text-sm">Invalid</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-red-500/30">
          <div className="text-2xl font-bold text-red-400">{counts.malicious}</div>
          <div className="text-gray-400 text-sm">Malicious</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <MdFilterList className="text-gold-500" size={20} />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReportStatus | '')}
          className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-gold-500 focus:outline-none"
        >
          <option value="">All Reports</option>
          <option value="pending">Pending</option>
          <option value="investigating">Investigating</option>
          <option value="valid">Valid</option>
          <option value="invalid">Invalid</option>
          <option value="malicious">Malicious</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500">Loading reports...</div>
      ) : (
        <DataTable
          data={reports}
          columns={columns}
          emptyMessage="No reports found"
        />
      )}

      {/* Investigation Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gold-500 mb-4">Investigate Report</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-gray-400 text-sm">Reporter:</span>
                <p className="text-white font-medium">{selectedReport.reporter_username}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Reported User:</span>
                <p className="text-white font-medium">{selectedReport.reported_user_username}</p>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-gray-400 text-sm">Reason:</span>
              <p className="text-white mt-1 bg-gray-800 p-3 rounded">{selectedReport.reason}</p>
            </div>

            {selectedReport.evidence && (
              <div className="mb-4">
                <span className="text-gray-400 text-sm">Evidence:</span>
                <p className="text-white mt-1 bg-gray-800 p-3 rounded">{selectedReport.evidence}</p>
              </div>
            )}

            <div className="mb-4">
              <span className="text-gray-400 text-sm flex items-center gap-2">
                Current Status:
                <span className={`px-2 py-1 rounded-full text-xs border ${STATUS_COLORS[selectedReport.status]}`}>
                  {selectedReport.status.toUpperCase()}
                </span>
              </span>
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm block mb-2">Admin Notes:</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-gold-500 focus:outline-none"
                rows={3}
                placeholder="Investigation notes..."
              />
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm block mb-2">Action Taken (if report is valid):</label>
              <input
                type="text"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-gold-500 focus:outline-none"
                placeholder="e.g., Warning issued, Account suspended, etc."
              />
            </div>

            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Choose Investigation Result:</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleInvestigate('investigating')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <MdSearch size={18} />
                  Under Investigation
                </button>
                <button
                  onClick={() => handleInvestigate('valid')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <MdCheck size={18} />
                  Valid Report
                </button>
                <button
                  onClick={() => handleInvestigate('invalid')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <MdClose size={18} />
                  Invalid Report
                </button>
                <button
                  onClick={() => handleInvestigate('resolved')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  title="Close report as resolved"
                >
                  <MdCheck size={18} />
                  Resolved/Close
                </button>
                <button
                  onClick={() => handleInvestigate('malicious')}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 col-span-2"
                  title="Marks reporter as making false reports - may lead to suspension"
                >
                  <MdWarning size={18} />
                  Malicious Report
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                <MdWarning className="inline mr-1" />
                Marking as "Malicious" will penalize the reporter. After 3 malicious reports, their account will be suspended.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
