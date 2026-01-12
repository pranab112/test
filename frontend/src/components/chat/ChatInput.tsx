import { useState, useRef, useEffect } from 'react';
import { chatApi } from '@/api/endpoints/chat.api';
import toast from 'react-hot-toast';
import { MdImage, MdClose, MdSend, MdMic } from 'react-icons/md';

interface ChatInputProps {
  onSend: (content: string, type?: 'text' | 'image' | 'voice', fileUrl?: string, fileName?: string, duration?: number) => void;
  onTyping: () => void;
  disabled?: boolean;
  receiverId: number;
}

interface ImagePreview {
  file: File;
  url: string;
}

export default function ChatInput({ onSend, onTyping, disabled = false, receiverId }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cleanup image preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview?.url) {
        URL.revokeObjectURL(imagePreview.url);
      }
    };
  }, [imagePreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If there's an image preview, send image with caption
    if (imagePreview) {
      await sendImageWithCaption();
      return;
    }

    // Otherwise send text message
    if (message.trim() && !disabled) {
      onSend(message.trim(), 'text');
      setMessage('');
    }
  };

  const sendImageWithCaption = async () => {
    if (!imagePreview) return;

    setIsUploading(true);
    try {
      await chatApi.sendImageMessage(receiverId, imagePreview.file, message.trim() || undefined);
      toast.success('Image sent!');
      clearImagePreview();
      setMessage('');
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to send image');
    } finally {
      setIsUploading(false);
    }
  };

  const clearImagePreview = () => {
    if (imagePreview?.url) {
      URL.revokeObjectURL(imagePreview.url);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Create preview
    const url = URL.createObjectURL(file);
    setImagePreview({ file, url });

    // Focus the textarea for caption input
    setTimeout(() => textareaRef.current?.focus(), 100);
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

  // Show recording UI
  if (isRecording) {
    return (
      <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
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
              <MdClose className="w-6 h-6" />
            </button>
            <button
              onClick={stopRecording}
              className="p-2 text-white bg-yellow-500 hover:bg-yellow-600 rounded-full transition-colors"
              title="Send"
            >
              <MdSend className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border-t border-gray-700">
      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 pt-3 pb-2">
          <div className="relative inline-block">
            <img
              src={imagePreview.url}
              alt="Preview"
              className="max-h-32 max-w-[200px] rounded-lg object-cover border-2 border-gold-500/50"
            />
            <button
              type="button"
              onClick={clearImagePreview}
              className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
              title="Remove image"
            >
              <MdClose className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Add a caption (optional) and press send
          </p>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="px-4 py-3 flex items-end space-x-2">
        {/* File upload button */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
            imagePreview
              ? 'text-gold-500 bg-gold-500/20'
              : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-700'
          }`}
          title="Send image"
        >
          <MdImage className="w-6 h-6" />
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={imagePreview ? "Add a caption..." : "Type a message..."}
            disabled={disabled || isUploading}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500/50 disabled:opacity-50"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
        </div>

        {/* Voice recording button - only show when no text and no image */}
        {!message.trim() && !imagePreview && (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled || isUploading}
            className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
            title="Record voice message"
          >
            <MdMic className="w-6 h-6" />
          </button>
        )}

        {/* Send button - show when there's text OR an image */}
        {(message.trim() || imagePreview) && (
          <button
            type="submit"
            disabled={disabled || isUploading}
            className="p-2 text-gray-900 bg-yellow-500 hover:bg-yellow-600 rounded-full transition-colors disabled:opacity-50"
            title={imagePreview ? "Send image" : "Send message"}
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900"></div>
            ) : (
              <MdSend className="w-6 h-6" />
            )}
          </button>
        )}

        {/* Loading indicator for other operations */}
        {isUploading && !message.trim() && !imagePreview && (
          <div className="p-2">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        )}
      </form>
    </div>
  );
}
