import { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '@/services/websocket.service';
import PromotionMessage from './PromotionMessage';
import { MdPlayArrow, MdPause, MdMic, MdImage, MdDownload, MdZoomOutMap } from 'react-icons/md';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
  showAvatar?: boolean;
}

export default function ChatMessage({ message, isOwn, showAvatar = true }: ChatMessageProps) {
  // Voice message state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.duration || 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Image lightbox state
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audio.currentTime = percentage * duration;
  };

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
          <>
            <div className="relative group">
              <img
                src={message.file_url}
                alt={message.file_name || 'Image'}
                className="max-w-[280px] max-h-[300px] rounded-lg cursor-pointer object-cover shadow-lg transition-transform hover:scale-[1.02]"
                onClick={() => setShowLightbox(true)}
              />
              {/* Image overlay with actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setShowLightbox(true)}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-full mx-1 hover:bg-white/30 transition-colors"
                  title="View full size"
                >
                  <MdZoomOutMap className="w-5 h-5 text-white" />
                </button>
                <a
                  href={message.file_url}
                  download={message.file_name || 'image'}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-full mx-1 hover:bg-white/30 transition-colors"
                  title="Download"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MdDownload className="w-5 h-5 text-white" />
                </a>
              </div>
              {/* Image icon indicator */}
              <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-full p-1">
                <MdImage className="w-4 h-4 text-white/80" />
              </div>
            </div>
            {/* Caption if any */}
            {message.content && (
              <p className="text-white mt-2 text-sm">{message.content}</p>
            )}
            {/* Lightbox */}
            {showLightbox && (
              <div
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                onClick={() => setShowLightbox(false)}
              >
                <div className="relative max-w-full max-h-full">
                  <img
                    src={message.file_url}
                    alt={message.file_name || 'Image'}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLightbox(false)}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    <a
                      href={message.file_url}
                      download={message.file_name || 'image'}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-dark-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MdDownload className="w-5 h-5" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        );

      case 'voice':
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        return (
          <div className={`flex items-center gap-3 min-w-[240px] p-2 rounded-xl ${
            isOwn ? 'bg-emerald-600/20' : 'bg-dark-400/50'
          }`}>
            {/* Play/Pause button */}
            <button
              type="button"
              onClick={togglePlayPause}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isOwn
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-dark-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-dark-700'
              } shadow-lg`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <MdPause className="w-6 h-6" />
              ) : (
                <MdPlayArrow className="w-6 h-6 ml-0.5" />
              )}
            </button>

            {/* Waveform / Progress */}
            <div className="flex-1">
              {/* Progress bar with waveform effect */}
              <div
                className="relative h-8 cursor-pointer group"
                onClick={handleProgressClick}
              >
                {/* Waveform bars background */}
                <div className="absolute inset-0 flex items-center gap-[2px]">
                  {[...Array(24)].map((_, i) => {
                    const height = 20 + Math.sin(i * 0.8) * 15 + Math.random() * 10;
                    const isActive = (i / 24) * 100 <= progress;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-colors ${
                          isActive
                            ? isOwn ? 'bg-emerald-500' : 'bg-emerald-500'
                            : 'bg-gray-500/40'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Time display */}
              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs font-medium ${isOwn ? 'text-emerald-200' : 'text-gray-300'}`}>
                  {formatDuration(currentTime)}
                </span>
                <span className={`text-xs ${isOwn ? 'text-emerald-200/70' : 'text-gray-400'}`}>
                  {formatDuration(duration)}
                </span>
              </div>
            </div>

            {/* Mic icon */}
            <div className={`flex-shrink-0 ${isOwn ? 'text-emerald-300' : 'text-emerald-400'}`}>
              <MdMic className="w-5 h-5" />
            </div>

            {/* Hidden audio element */}
            <audio ref={audioRef} src={message.file_url} preload="metadata" />
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
                ? 'bg-emerald-500 text-gray-900 rounded-br-md'
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
