import { useState, useRef } from 'react';
import { chatApi } from '@/api/endpoints/chat.api';
import toast from 'react-hot-toast';

interface ChatInputProps {
  onSend: (content: string, type?: 'text' | 'image' | 'voice', fileUrl?: string, fileName?: string, duration?: number) => void;
  onTyping: () => void;
  disabled?: boolean;
  receiverId: number;
}

export default function ChatInput({ onSend, onTyping, disabled = false, receiverId }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim(), 'text');
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid image format. Allowed: JPEG, PNG, GIF, WebP');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Maximum size is 10MB');
      return;
    }

    setIsUploading(true);
    try {
      await chatApi.sendImageMessage(receiverId, file);
      toast.success('Image sent!');
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to send image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Upload voice message
        setIsUploading(true);
        try {
          await chatApi.sendVoiceMessage(receiverId, audioFile, duration);
          toast.success('Voice message sent!');
        } catch (error) {
          console.error('Failed to send voice message:', error);
          toast.error('Failed to send voice message');
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecording(false);
    }
  };

  return (
    <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
      {isRecording ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white">Recording...</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={cancelRecording}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-full transition-colors"
              title="Cancel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={stopRecording}
              className="p-2 text-white bg-yellow-500 hover:bg-yellow-600 rounded-full transition-colors"
              title="Send"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          {/* File upload button */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
            title="Send image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={disabled || isUploading}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500/50 disabled:opacity-50"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>

          {/* Voice recording button */}
          {!message.trim() && (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled || isUploading}
              className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
              title="Record voice message"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}

          {/* Send button */}
          {message.trim() && (
            <button
              type="submit"
              disabled={disabled || isUploading}
              className="p-2 text-gray-900 bg-yellow-500 hover:bg-yellow-600 rounded-full transition-colors disabled:opacity-50"
              title="Send message"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}

          {/* Loading indicator */}
          {isUploading && (
            <div className="p-2">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yellow-500"></div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
