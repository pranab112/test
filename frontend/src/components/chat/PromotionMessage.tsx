import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/api/client';
import toast from 'react-hot-toast';

interface PromotionClaimData {
  type: string;
  claim_id: number;
  promotion_id: number;
  promotion_title: string;
  promotion_type: string;
  value: number;
  player_id?: number;
  player_username?: string;
  player_level?: number;
  client_id?: number;
  client_name?: string;
  status?: string;
  reason?: string;
}

interface PromotionMessageProps {
  content: string;
  isOwn: boolean;
  messageId: number;
}

export default function PromotionMessage({ content, isOwn, messageId: _messageId }: PromotionMessageProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [actionTaken, setActionTaken] = useState<'approved' | 'rejected' | null>(null);

  let data: PromotionClaimData;
  try {
    data = JSON.parse(content);
  } catch {
    return (
      <div className="bg-gray-700 rounded-lg p-3 text-white">
        <p>Invalid promotion message</p>
      </div>
    );
  }

  const isClient = user?.user_type === 'client';
  const isClaimRequest = data.type === 'promotion_claim_request';
  const isApproved = data.type === 'promotion_claim_approved' || data.status === 'approved';
  const isRejected = data.type === 'promotion_claim_rejected' || data.status === 'rejected';

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await apiClient.post(`/promotions/approve-claim/${data.claim_id}`);
      setActionTaken('approved');
      toast.success('Claim approved!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to approve claim');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await apiClient.post(`/promotions/reject-claim/${data.claim_id}`, { reason: '' });
      setActionTaken('rejected');
      toast.success('Claim rejected');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reject claim');
    } finally {
      setIsLoading(false);
    }
  };

  const getPromotionTypeLabel = (_type: string) => {
    return 'GC Bonus';  // All promotions are Game Credits bonuses
  };

  const getStatusBadge = () => {
    if (actionTaken === 'approved' || isApproved) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Approved
        </span>
      );
    }
    if (actionTaken === 'rejected' || isRejected) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Rejected
        </span>
      );
    }
    if (isClaimRequest) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
          <svg className="w-3 h-3 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Pending Approval
        </span>
      );
    }
    return null;
  };

  // Render for claim request (player to client)
  if (isClaimRequest) {
    return (
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4 max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            <span className="text-yellow-500 font-semibold text-sm">Promotion Claim Request</span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Promotion details */}
        <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
          <h4 className="text-white font-medium mb-1">{data.promotion_title}</h4>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-400">{getPromotionTypeLabel(data.promotion_type)}</span>
            <span className="text-yellow-500 font-bold">{data.value} GC</span>
          </div>
        </div>

        {/* Player info (shown to client) */}
        {!isOwn && isClient && (
          <div className="flex items-center space-x-2 mb-3 text-sm text-gray-300">
            <span>From:</span>
            <span className="font-medium text-white">{data.player_username}</span>
            <span className="text-gray-500">• Level {data.player_level}</span>
          </div>
        )}

        {/* Action buttons for client */}
        {!isOwn && isClient && !actionTaken && !isApproved && !isRejected && (
          <div className="flex space-x-2">
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </>
              )}
            </button>
            <button
              onClick={handleReject}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </>
              )}
            </button>
          </div>
        )}

        {/* Waiting message for player */}
        {isOwn && !isApproved && !isRejected && (
          <p className="text-sm text-gray-400 italic">
            Waiting for client approval...
          </p>
        )}
      </div>
    );
  }

  // Render for approval response (client to player)
  if (isApproved || isRejected) {
    return (
      <div className={`border rounded-lg p-4 max-w-sm ${
        isApproved
          ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30'
          : 'bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <svg
              className={`w-5 h-5 ${isApproved ? 'text-green-500' : 'text-red-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isApproved ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <span className={`font-semibold text-sm ${isApproved ? 'text-green-500' : 'text-red-500'}`}>
              Claim {isApproved ? 'Approved' : 'Rejected'}
            </span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Promotion details */}
        <div className="bg-gray-800/50 rounded-lg p-3 mb-2">
          <h4 className="text-white font-medium mb-1">{data.promotion_title}</h4>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-400">{getPromotionTypeLabel(data.promotion_type)}</span>
            <span className={`font-bold ${isApproved ? 'text-green-500' : 'text-red-500 line-through'}`}>
              {data.value} GC
            </span>
          </div>
        </div>

        {/* Rejection reason */}
        {isRejected && data.reason && (
          <p className="text-sm text-red-400 mt-2">
            <span className="font-medium">Reason:</span> {data.reason}
          </p>
        )}

        {/* Success message for approved */}
        {isApproved && !isOwn && (
          <p className="text-sm text-green-400 mt-2">
            Your promotion has been approved! You can now use it.
          </p>
        )}
      </div>
    );
  }

  // Fallback for unknown promotion message types
  return (
    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4 max-w-sm">
      <div className="flex items-center space-x-2 mb-2">
        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
        <span className="text-yellow-500 font-semibold">Promotion</span>
      </div>
      <p className="text-white">{data.promotion_title}</p>
      <p className="text-yellow-500 font-bold">{data.value} GC</p>
    </div>
  );
}
