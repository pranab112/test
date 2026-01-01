import { ChatMessage as ChatMessageType } from '@/services/websocket.service';
import PromotionMessage from './PromotionMessage';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
  showAvatar?: boolean;
}

export default function ChatMessage({ message, isOwn, showAvatar = true }: ChatMessageProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return (
          <svg className="w-4 h-4 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'sent':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'delivered':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'read':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return message.is_read ? (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : null;
    }
  };

  const renderContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="relative">
            <img
              src={message.file_url}
              alt={message.file_name || 'Image'}
              className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.file_url, '_blank')}
            />
          </div>
        );

      case 'voice':
        return (
          <div className="flex items-center space-x-3 min-w-[200px]">
            <button
              type="button"
              title="Play voice message"
              className="p-2 bg-yellow-500/20 rounded-full hover:bg-yellow-500/30 transition-colors"
            >
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div className="flex-1">
              <div className="h-1 bg-gray-600 rounded-full">
                <div className="h-1 bg-yellow-500 rounded-full w-0"></div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {message.duration ? `${Math.floor(message.duration / 60)}:${(message.duration % 60).toString().padStart(2, '0')}` : '0:00'}
              </p>
            </div>
            <audio src={message.file_url} className="hidden" />
          </div>
        );

      case 'promotion':
        return (
          <PromotionMessage
            content={message.content || ''}
            isOwn={isOwn}
            messageId={message.id as number}
          />
        );

      default:
        return <p className="text-white whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${!showAvatar && !isOwn ? 'pl-12' : ''}`}>
      {/* Avatar for received messages */}
      {!isOwn && showAvatar && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center overflow-hidden">
            {message.sender_avatar ? (
              <img
                src={message.sender_avatar}
                alt={message.sender_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-300 font-semibold text-sm">
                {message.sender_name?.charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </div>
        </div>
      )}

      <div className={`max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
        {/* Message bubble - don't wrap promotion messages */}
        {message.message_type === 'promotion' ? (
          renderContent()
        ) : (
          <div
            className={`px-4 py-2 rounded-2xl ${
              isOwn
                ? 'bg-yellow-500 text-gray-900 rounded-br-md'
                : 'bg-gray-700 text-white rounded-bl-md'
            }`}
          >
            {renderContent()}
          </div>
        )}

        {/* Timestamp and status */}
        <div className={`flex items-center space-x-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
          {isOwn && getStatusIcon()}
        </div>
      </div>
    </div>
  );
}
