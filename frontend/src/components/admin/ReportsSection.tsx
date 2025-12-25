import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import toast from 'react-hot-toast';
import { adminApi, type Report } from '@/api/endpoints';

export function ReportsSection() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getReports({ limit: 100 });
      setReports(data.reports);
    } catch (error) {
      toast.error('Failed to load reports');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: number, status: string, notes?: string) => {
    try {
      await adminApi.updateReportStatus(reportId, status, notes);
      toast.success('Report status updated');
      setShowModal(false);
      setSelectedReport(null);
      loadReports();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update report status');
    }
  };

  const columns = [
    {
      key: 'reporter',
      label: 'Reporter',
      render: (report: Report) => report.reporter?.username || 'Unknown',
    },
    {
      key: 'reported_user',
      label: 'Reported User',
      render: (report: Report) => report.reported_user?.username || 'Unknown',
    },
    { key: 'reason', label: 'Reason', width: '30%' },
    {
      key: 'status',
      label: 'Status',
      render: (report: Report) => (
        <Badge
          variant={
            report.status === 'pending' ? 'warning' :
            report.status === 'resolved' ? 'success' : 'default'
          }
        >
          {report.status.toUpperCase()}
        </Badge>
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
          onClick={() => {
            setSelectedReport(report);
            setShowModal(true);
          }}
          className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          Review
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Reports</h1>
        <p className="text-gray-400">Review user reports and violations</p>
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

      {selectedReport && (
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedReport(null);
          }}
          title="Review Report"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reporter</label>
              <p className="text-white">{selectedReport.reporter?.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reported User</label>
              <p className="text-white">{selectedReport.reported_user?.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
              <p className="text-white">{selectedReport.reason}</p>
            </div>
            {selectedReport.description && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <p className="text-white">{selectedReport.description}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Current Status</label>
              <Badge variant={selectedReport.status === 'pending' ? 'warning' : 'success'}>
                {selectedReport.status.toUpperCase()}
              </Badge>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => handleUpdateStatus(selectedReport.id, 'reviewed')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Mark as Reviewed
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedReport.id, 'resolved', 'Resolved by admin')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Mark as Resolved
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedReport.id, 'dismissed', 'Report dismissed')}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
