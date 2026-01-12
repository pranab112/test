import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import toast from 'react-hot-toast';
import {
  MdSearch,
  MdClose,
  MdFilterList,
  MdCheck,
  MdPerson,
  MdSend,
  MdLock,
  MdPriorityHigh,
} from 'react-icons/md';
import { ticketsApi } from '@/api/endpoints';
import {
  Ticket,
  TicketDetail,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketStatsResponse,
} from '@/types/ticket.types';

const STATUS_COLORS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  [TicketStatus.IN_PROGRESS]: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  [TicketStatus.WAITING_USER]: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  [TicketStatus.RESOLVED]: 'bg-green-500/20 text-green-400 border-green-500/50',
  [TicketStatus.CLOSED]: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'text-gray-400',
  [TicketPriority.MEDIUM]: 'text-blue-400',
  [TicketPriority.HIGH]: 'text-orange-400',
  [TicketPriority.URGENT]: 'text-red-400',
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.ACCOUNT]: 'Account',
  [TicketCategory.PAYMENT]: 'Payment',
  [TicketCategory.TECHNICAL]: 'Technical',
  [TicketCategory.GAME_ISSUE]: 'Game Issue',
  [TicketCategory.REPORT_DISPUTE]: 'Report Dispute',
  [TicketCategory.APPEAL_REPORT]: 'Report Appeal',
  [TicketCategory.OTHER]: 'Other',
};

export function TicketsSection() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TicketStatsResponse | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | ''>('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [unassigned, setUnassigned] = useState(false);

  // Modal state
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Action state
  const [updatingTicket, setUpdatingTicket] = useState(false);

  useEffect(() => {
    loadTickets();
    loadStats();
  }, [statusFilter, priorityFilter, categoryFilter, assignedToMe, unassigned]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter) params.status_filter = statusFilter;
      if (priorityFilter) params.priority_filter = priorityFilter;
      if (categoryFilter) params.category_filter = categoryFilter;
      if (assignedToMe) params.assigned_to_me = true;
      if (unassigned) params.unassigned = true;

      const data = await ticketsApi.getAllTickets(params);
      setTickets(data.tickets);
    } catch (error) {
      toast.error('Failed to load tickets');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await ticketsApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load ticket stats', error);
    }
  };

  const openTicketModal = async (ticket: Ticket) => {
    try {
      const fullTicket = await ticketsApi.getTicket(ticket.id);
      setSelectedTicket(fullTicket);
      setShowModal(true);
      setReplyContent('');
      setIsInternalNote(false);
    } catch (error) {
      toast.error('Failed to load ticket details');
      console.error(error);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSendingReply(true);
    try {
      await ticketsApi.addMessage(selectedTicket.id, {
        content: replyContent,
        is_internal_note: isInternalNote,
      });

      toast.success(isInternalNote ? 'Internal note added' : 'Reply sent');

      // Reload ticket details
      const updatedTicket = await ticketsApi.getTicket(selectedTicket.id);
      setSelectedTicket(updatedTicket);
      setReplyContent('');
      setIsInternalNote(false);

      // Reload tickets list
      loadTickets();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to send reply');
      console.error(error);
    } finally {
      setSendingReply(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicket) return;

    setUpdatingTicket(true);
    try {
      await ticketsApi.assignTicket(selectedTicket.id);
      toast.success('Ticket assigned to you');

      // Reload ticket
      const updatedTicket = await ticketsApi.getTicket(selectedTicket.id);
      setSelectedTicket(updatedTicket);
      loadTickets();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to assign ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;

    setUpdatingTicket(true);
    try {
      await ticketsApi.updateTicket(selectedTicket.id, { status: newStatus });
      toast.success(`Ticket status updated to ${newStatus}`);

      // Reload ticket
      const updatedTicket = await ticketsApi.getTicket(selectedTicket.id);
      setSelectedTicket(updatedTicket);
      loadTickets();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to update status');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleUpdatePriority = async (newPriority: TicketPriority) => {
    if (!selectedTicket) return;

    setUpdatingTicket(true);
    try {
      await ticketsApi.updateTicket(selectedTicket.id, { priority: newPriority });
      toast.success(`Ticket priority updated to ${newPriority}`);

      // Reload ticket
      const updatedTicket = await ticketsApi.getTicket(selectedTicket.id);
      setSelectedTicket(updatedTicket);
      loadTickets();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to update priority');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;

    setUpdatingTicket(true);
    try {
      await ticketsApi.resolveTicket(selectedTicket.id);
      toast.success('Ticket marked as resolved');

      // Reload ticket
      const updatedTicket = await ticketsApi.getTicket(selectedTicket.id);
      setSelectedTicket(updatedTicket);
      loadTickets();
      loadStats();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to resolve ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const columns = [
    {
      key: 'ticket_number',
      label: 'Ticket #',
      render: (ticket: Ticket) => (
        <span className="font-mono text-gold-500">{ticket.ticket_number}</span>
      ),
    },
    {
      key: 'user',
      label: 'User',
      render: (ticket: Ticket) => (
        <div>
          <div className="font-medium">{ticket.user?.username || 'Unknown'}</div>
          <div className="text-xs text-gray-400">{ticket.user?.user_type || ''}</div>
        </div>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      width: '25%',
      render: (ticket: Ticket) => (
        <div>
          <div className="truncate max-w-xs" title={ticket.subject}>
            {ticket.subject}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {CATEGORY_LABELS[ticket.category]}
          </div>
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (ticket: Ticket) => (
        <span className={`flex items-center gap-1 ${PRIORITY_COLORS[ticket.priority]}`}>
          {ticket.priority === TicketPriority.URGENT && <MdPriorityHigh />}
          {ticket.priority.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (ticket: Ticket) => (
        <span className={`px-2 py-1 rounded-full text-xs border ${STATUS_COLORS[ticket.status]}`}>
          {ticket.status.replace('_', ' ').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'assigned',
      label: 'Assigned To',
      render: (ticket: Ticket) =>
        ticket.assigned_admin ? (
          <span className="text-sm">{ticket.assigned_admin.username}</span>
        ) : (
          <span className="text-gray-500 text-sm">Unassigned</span>
        ),
    },
    {
      key: 'messages',
      label: 'Messages',
      render: (ticket: Ticket) => (
        <span className="text-sm text-gray-400">{ticket.message_count || 0}</span>
      ),
    },
    {
      key: 'created',
      label: 'Created',
      render: (ticket: Ticket) => (
        <span className="text-sm text-gray-400">
          {new Date(ticket.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (ticket: Ticket) => (
        <button
          onClick={() => openTicketModal(ticket)}
          className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
        >
          <MdSearch size={14} />
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Support Tickets</h1>
        <p className="text-gray-400">Manage and respond to support tickets</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-dark-200 border-2 border-yellow-600 rounded-lg p-4">
            <div className="text-yellow-500 text-2xl font-bold">{stats.open_tickets}</div>
            <div className="text-gray-400 text-sm">Open Tickets</div>
          </div>
          <div className="bg-dark-200 border-2 border-blue-600 rounded-lg p-4">
            <div className="text-blue-500 text-2xl font-bold">{stats.in_progress_tickets}</div>
            <div className="text-gray-400 text-sm">In Progress</div>
          </div>
          <div className="bg-dark-200 border-2 border-red-600 rounded-lg p-4">
            <div className="text-red-500 text-2xl font-bold">{stats.urgent_tickets}</div>
            <div className="text-gray-400 text-sm">Urgent</div>
          </div>
          <div className="bg-dark-200 border-2 border-purple-600 rounded-lg p-4">
            <div className="text-purple-500 text-2xl font-bold">
              {stats.by_category[TicketCategory.APPEAL_REPORT] || 0}
            </div>
            <div className="text-gray-400 text-sm">Report Appeals</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <MdFilterList className="text-gold-500" size={20} />
          <h3 className="text-lg font-semibold text-gold-500">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
            className="bg-dark-400 text-white px-3 py-2 rounded border border-gold-700 focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="">All Status</option>
            {Object.values(TicketStatus).map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | '')}
            className="bg-dark-400 text-white px-3 py-2 rounded border border-gold-700 focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="">All Priority</option>
            {Object.values(TicketPriority).map((priority) => (
              <option key={priority} value={priority}>
                {priority.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | '')}
            className="bg-dark-400 text-white px-3 py-2 rounded border border-gold-700 focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Assigned to me */}
          <label className="flex items-center gap-2 bg-dark-400 px-3 py-2 rounded border border-gold-700 cursor-pointer">
            <input
              type="checkbox"
              checked={assignedToMe}
              onChange={(e) => {
                setAssignedToMe(e.target.checked);
                if (e.target.checked) setUnassigned(false);
              }}
              className="w-4 h-4 text-gold-500 bg-dark-500 border-gold-700 rounded focus:ring-gold-500"
            />
            <span className="text-white text-sm">Assigned to Me</span>
          </label>

          {/* Unassigned */}
          <label className="flex items-center gap-2 bg-dark-400 px-3 py-2 rounded border border-gold-700 cursor-pointer">
            <input
              type="checkbox"
              checked={unassigned}
              onChange={(e) => {
                setUnassigned(e.target.checked);
                if (e.target.checked) setAssignedToMe(false);
              }}
              className="w-4 h-4 text-gold-500 bg-dark-500 border-gold-700 rounded focus:ring-gold-500"
            />
            <span className="text-white text-sm">Unassigned</span>
          </label>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={tickets}
          loading={loading}
          emptyMessage="No tickets found"
        />
      </div>

      {/* Ticket Detail Modal */}
      {showModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gold-700">
              <div>
                <h2 className="text-xl font-bold text-gold-500">
                  {selectedTicket.ticket_number}
                </h2>
                <p className="text-sm text-gray-400">{selectedTicket.subject}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Ticket Info */}
            <div className="p-4 border-b border-gold-700 bg-dark-300">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">User:</span>
                  <div className="font-medium text-white">
                    {selectedTicket.user?.username}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Category:</span>
                  <div className="font-medium text-white">
                    {CATEGORY_LABELS[selectedTicket.category]}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Priority:</span>
                  <div className={`font-medium ${PRIORITY_COLORS[selectedTicket.priority]}`}>
                    {selectedTicket.priority.toUpperCase()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[selectedTicket.status]}`}
                    >
                      {selectedTicket.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b border-gold-700 bg-dark-300">
              <div className="flex flex-wrap gap-2">
                {!selectedTicket.assigned_admin_id && (
                  <button
                    onClick={handleAssignToMe}
                    disabled={updatingTicket}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    <MdPerson size={16} />
                    Assign to Me
                  </button>
                )}

                {selectedTicket.status !== TicketStatus.RESOLVED &&
                  selectedTicket.status !== TicketStatus.CLOSED && (
                    <button
                      onClick={handleResolveTicket}
                      disabled={updatingTicket}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <MdCheck size={16} />
                      Mark as Resolved
                    </button>
                  )}

                {/* Status dropdown */}
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                  disabled={updatingTicket}
                  className="bg-dark-400 text-white px-3 py-1.5 rounded text-sm border border-gold-700 focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {Object.values(TicketStatus).map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>

                {/* Priority dropdown */}
                <select
                  value={selectedTicket.priority}
                  onChange={(e) => handleUpdatePriority(e.target.value as TicketPriority)}
                  disabled={updatingTicket}
                  className="bg-dark-400 text-white px-3 py-1.5 rounded text-sm border border-gold-700 focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {Object.values(TicketPriority).map((priority) => (
                    <option key={priority} value={priority}>
                      {priority.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedTicket.messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.is_internal_note
                      ? 'bg-purple-900/20 border-2 border-purple-600'
                      : message.sender?.id === selectedTicket.user_id
                      ? 'bg-dark-300 border border-dark-400'
                      : 'bg-blue-900/20 border border-blue-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gold-500">
                        {message.sender?.username || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.sender?.user_type}
                      </span>
                      {message.is_internal_note && (
                        <span className="flex items-center gap-1 text-xs text-purple-400">
                          <MdLock size={12} />
                          Internal Note
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-300 whitespace-pre-wrap">{message.content}</div>
                </div>
              ))}
            </div>

            {/* Reply Section */}
            {selectedTicket.status !== TicketStatus.CLOSED && (
              <div className="p-4 border-t border-gold-700 bg-dark-300">
                <div className="space-y-3">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    rows={4}
                    className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500 border border-gold-700"
                  />

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="w-4 h-4 text-purple-500 bg-dark-500 border-purple-700 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-purple-400 flex items-center gap-1">
                        <MdLock size={14} />
                        Internal Note (not visible to user)
                      </span>
                    </label>

                    <button
                      onClick={handleSendReply}
                      disabled={sendingReply || !replyContent.trim()}
                      className="bg-gold-600 hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed text-dark-700 px-4 py-2 rounded font-medium transition-colors flex items-center gap-2"
                    >
                      <MdSend size={16} />
                      {sendingReply ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
