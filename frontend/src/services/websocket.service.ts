import { io, Socket } from 'socket.io-client';

export interface WebSocketMessage {
  id: string;
  type: 'text' | 'image' | 'voice' | 'video' | 'file';
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  recipientId?: number;
  roomId?: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
}

export interface TypingIndicator {
  userId: number;
  userName: string;
  roomId: string;
  isTyping: boolean;
}

export interface OnlineStatus {
  userId: number;
  isOnline: boolean;
  lastSeen?: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private listeners: Map<string, Set<Function>> = new Map();
  private messageQueue: WebSocketMessage[] = [];

  /**
   * Initialize WebSocket connection
   */
  connect(token: string, userId: number): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

    this.socket = io(wsUrl, {
      auth: {
        token,
        userId,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.flushMessageQueue();
      this.emit('connected', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
    });

    // Message events
    this.socket.on('message:new', (message: WebSocketMessage) => {
      this.emit('message:new', message);
    });

    this.socket.on('message:updated', (message: WebSocketMessage) => {
      this.emit('message:updated', message);
    });

    this.socket.on('message:deleted', (messageId: string) => {
      this.emit('message:deleted', { messageId });
    });

    this.socket.on('message:delivered', (data: { messageId: string; userId: number }) => {
      this.emit('message:delivered', data);
    });

    this.socket.on('message:read', (data: { messageId: string; userId: number }) => {
      this.emit('message:read', data);
    });

    // Typing indicators
    this.socket.on('typing:start', (data: TypingIndicator) => {
      this.emit('typing:start', data);
    });

    this.socket.on('typing:stop', (data: TypingIndicator) => {
      this.emit('typing:stop', data);
    });

    // Online status
    this.socket.on('user:online', (data: OnlineStatus) => {
      this.emit('user:online', data);
    });

    this.socket.on('user:offline', (data: OnlineStatus) => {
      this.emit('user:offline', data);
    });

    // Room events
    this.socket.on('room:joined', (data: { roomId: string; userId: number }) => {
      this.emit('room:joined', data);
    });

    this.socket.on('room:left', (data: { roomId: string; userId: number }) => {
      this.emit('room:left', data);
    });

    // Broadcast events (for admin)
    this.socket.on('broadcast:new', (data: any) => {
      this.emit('broadcast:new', data);
    });
  }

  /**
   * Send a message
   */
  sendMessage(message: Omit<WebSocketMessage, 'id' | 'timestamp' | 'status'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    if (this.socket?.connected) {
      this.socket.emit('message:send', fullMessage);
    } else {
      // Queue message if not connected
      fullMessage.status = 'failed';
      this.messageQueue.push(fullMessage);
      this.emit('message:queued', fullMessage);
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(roomId: string, isTyping: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('typing', { roomId, isTyping });
    }
  }

  /**
   * Join a chat room
   */
  joinRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('room:join', { roomId });
    }
  }

  /**
   * Leave a chat room
   */
  leaveRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('room:leave', { roomId });
    }
  }

  /**
   * Mark messages as delivered
   */
  markAsDelivered(messageIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('message:delivered', { messageIds });
    }
  }

  /**
   * Mark messages as read
   */
  markAsRead(messageIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('message:read', { messageIds });
    }
  }

  /**
   * Request online status for users
   */
  requestOnlineStatus(userIds: number[]): void {
    if (this.socket?.connected) {
      this.socket.emit('user:status', { userIds });
    }
  }

  /**
   * Admin broadcast message
   */
  sendBroadcast(message: string, target: 'all' | 'clients' | 'players', metadata?: any): void {
    if (this.socket?.connected) {
      this.socket.emit('broadcast:send', {
        message,
        target,
        metadata,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit an event to local listeners
   */
  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in WebSocket listener for ${event}:`, error);
      }
    });
  }

  /**
   * Flush message queue when reconnected
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.messageQueue = [];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    return 'connecting';
  }
}

export const wsService = new WebSocketService();