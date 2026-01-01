import { apiClient } from '@/api/client';

export interface UploadResponse {
  url: string;
  key?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  size: number;
  filename: string;
}

export interface FileUploadConfig {
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  folder?: string; // for organizing files (e.g., 'games', 'messages', 'avatars')
}

class FileUploadService {
  private readonly DEFAULT_MAX_SIZE = 10; // 10MB
  private readonly IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
  private readonly VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
  private readonly DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  /**
   * Validate file before upload
   */
  private validateFile(file: File, config?: FileUploadConfig): void {
    const maxSize = (config?.maxSize || this.DEFAULT_MAX_SIZE) * 1024 * 1024; // Convert to bytes

    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${config?.maxSize || this.DEFAULT_MAX_SIZE}MB limit`);
    }

    if (config?.acceptedTypes && !config.acceptedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not accepted`);
    }
  }

  /**
   * Determine file type category
   */
  private getFileType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
    if (this.IMAGE_TYPES.includes(mimeType)) return 'image';
    if (this.AUDIO_TYPES.includes(mimeType)) return 'audio';
    if (this.VIDEO_TYPES.includes(mimeType)) return 'video';
    if (this.DOCUMENT_TYPES.includes(mimeType)) return 'document';
    return 'document';
  }

  /**
   * Upload a single file
   * The backend will handle S3 upload in production or local storage in development
   */
  async uploadFile(file: File, config?: FileUploadConfig): Promise<UploadResponse> {
    try {
      this.validateFile(file, config);

      const formData = new FormData();
      formData.append('file', file);

      if (config?.folder) {
        formData.append('folder', config.folder);
      }

      // The backend endpoint will handle S3 or local storage based on environment
      const response = await apiClient.post<never, { url: string; key?: string }>('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        url: response.url,
        key: response.key,
        type: this.getFileType(file.type),
        size: file.size,
        filename: file.name,
      };
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(files: File[], config?: FileUploadConfig): Promise<UploadResponse[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, config));
    return Promise.all(uploadPromises);
  }

  /**
   * Upload game image specifically
   */
  async uploadGameImage(gameId: number, file: File): Promise<string> {
    try {
      this.validateFile(file, {
        maxSize: 5,
        acceptedTypes: this.IMAGE_TYPES,
      });

      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.post<never, { icon_url: string }>(`/admin/games/${gameId}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.icon_url;
    } catch (error) {
      console.error('Game image upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload message attachment (image, voice, video, etc.)
   */
  async uploadMessageAttachment(file: File, messageType: 'chat' | 'voice'): Promise<UploadResponse> {
    const config: FileUploadConfig = {
      folder: `messages/${messageType}`,
      maxSize: messageType === 'voice' ? 5 : 10,
    };

    if (messageType === 'voice') {
      config.acceptedTypes = this.AUDIO_TYPES;
    }

    return this.uploadFile(file, config);
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<string> {
    const result = await this.uploadFile(file, {
      folder: 'avatars',
      maxSize: 2,
      acceptedTypes: this.IMAGE_TYPES,
    });

    return result.url;
  }

  /**
   * Get presigned URL for direct S3 upload (for large files)
   */
  async getPresignedUrl(filename: string, fileType: string, folder?: string): Promise<{
    uploadUrl: string;
    fileUrl: string;
  }> {
    try {
      const response = await apiClient.post<never, { uploadUrl: string; fileUrl: string }>('/upload/presigned', {
        filename,
        fileType,
        folder,
      });

      return {
        uploadUrl: response.uploadUrl,
        fileUrl: response.fileUrl,
      };
    } catch (error) {
      console.error('Failed to get presigned URL:', error);
      throw error;
    }
  }

  /**
   * Upload directly to S3 using presigned URL (for large files)
   */
  async uploadToS3(file: File, presignedUrl: string): Promise<void> {
    try {
      await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
    } catch (error) {
      console.error('Direct S3 upload failed:', error);
      throw error;
    }
  }
}

export const fileUploadService = new FileUploadService();