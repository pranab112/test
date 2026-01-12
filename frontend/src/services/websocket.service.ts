/**
 * WebSocket Service for Real-time Messaging
 *
 * Uses native WebSocket to connect to FastAPI backend.
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Message queuing when offline
 * - Heartbeat/ping-pong for connection health
 * - Type-safe message handling
 * - Event-based architecture
 */

// Message types matching backend WSMessageType
export enum WSMessageType {
  // Connection
  PING = 'ping',
  PONG = 'pong',
  CONNECTED = 'connected',
  ERROR = 'error',

  // Messages
  MESSAGE_SEND = 'message:send',
  MESSAGE_NEW = 'message:new',
  MESSAGE_DELIVERED = 'message:delivered',
  MESSAGE_READ = 'message:read',
  MESSAGE_DELETED = 'message:deleted',

  // Typing
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',

  // Online Status
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  USER_STATUS_REQUEST = 'user:status',
  USER_STATUS_RESPONSE = 'user:status:response',

  // Rooms
  ROOM_JOIN = 'room:join',
  ROOM_LEAVE = 'room:leave',
  ROOM_JOINED = 'room:joined',
  ROOM_LEFT = 'room:left',

  // Notifications
  NOTIFICATION = 'notification',
  FRIEND_REQUEST = 'friend_request',
  FRIEND_ACCEPTED = 'friend_accepted',
}

export interface WSMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface ChatMessage {
  id: number | string;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  sender_type?: string;
  receiver_id: number;
  receiver_name?: string;
  message_type: 'text' | 'image' | 'voice' | 'promotion';
  content?: string;
  file_url?: string;
  file_name?: string;
  duration?: number;
  is_read: boolean;
  created_at: string;
  room_id: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface TypingIndicator {
  user_id: number;
  username: string;
  room_id: string;
  is_typing: boolean;
}

export interface OnlineStatus {
  user_id: number;
  username?: string;
  is_online: boolean;
  last_seen?: string;
  profile_picture?: string;
  user_type?: string;
}

export interface UserStatusResponse {
  statuses: OnlineStatus[];
}

type EventCallback = (data: unknown) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private userId: number | null = null;

  // Reconnection settings
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 50; // More attempts for better resilience
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 10000; // Max 10 seconds (reduced from 30)
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  // Heartbeat settings - more aggressive for Railway
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatIntervalMs = 15000; // Send ping every 15 seconds (Railway may timeout idle connections)
  private heartbeatTimeoutMs = 10000; // Wait 10 seconds for pong

  // Event listeners
  private listeners: Map<string, Set<EventCallback>> = new Map();

  // Message queue for offline messages
  private messageQueue: WSMessage[] = [];

  // Connection state
  private isConnecting = false;
  private manualDisconnect = false;

  // Visibility change handler
  private visibilityHandler: (() => void) | null = null;

  // Beforeunload handler
  private beforeUnloadHandler: (() => void) | null = null;

  /**
   * Get WebSocket URL based on environment
   */
  private getWsUrl(): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    // Convert http(s) to ws(s)
    const wsUrl = baseUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
    return `${wsUrl}/ws`;
  }

  /**
   * Initialize WebSocket connection
   */
  connect(token: string, userId: number): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket connection in progress');
      return;
    }

    // Validate token before connecting
    if (this.isTokenExpired(token)) {
      console.log('Token expired, cannot connect to WebSocket');
      // Don't redirect here - let the API call handle it
      // Just don't attempt the connection
      return;
    }

    this.token = token;
    this.userId = userId;
    this.manualDisconnect = false;
    this.isConnecting = true;

    const wsUrl = `${this.getWsUrl()}?token=${encodeURIComponent(token)}`;
    console.log('Connecting to WebSocket:', wsUrl.replace(token, '***'));

    try {
      this.socket = new WebSocket(wsUrl);
      this.setupEventHandlers();
      this.setupVisibilityHandler();
      this.setupBeforeUnloadHandler();
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Setup beforeunload handler to cleanly close connection on page unload
   */
  private setupBeforeUnloadHandler(): void {
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }

    this.beforeUnloadHandler = () => {
      // Set manual disconnect to prevent reconnection attempts during unload
      this.manualDisconnect = true;
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.close(1000, 'Page unload');
      }
    };

    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  /**
   * Setup visibility change handler to reconnect when tab becomes visible
   */
  private setupVisibilityHandler(): void {
    // Remove existing handler if any
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // Check connection and reconnect if needed
        if (this.socket?.readyState !== WebSocket.OPEN && !this.isConnecting && !this.manualDisconnect) {
          console.log('Tab visible, checking connection...');
          if (this.token && this.userId) {
            // Check if token is expired - just skip reconnection, don't redirect
            if (this.isTokenExpired(this.token)) {
              console.log('Token expired on tab visible, skipping WebSocket reconnection');
              return;
            }
            this.reconnectAttempts = 0; // Reset attempts on visibility change
            this.connect(this.token, this.userId);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      // Start heartbeat
      this.startHeartbeat();

      // Flush message queue
      this.flushMessageQueue();

      // Emit connected event
      this.emit('connected', { connected: true });
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnecting = false;
      this.stopHeartbeat();

      this.emit('disconnected', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      // Handle unauthorized - token expired or invalid
      if (event.code === 4001 || event.reason === 'Unauthorized') {
        console.log('WebSocket unauthorized - token expired, logging out...');
        this.handleUnauthorized();
        return;
      }

      // Attempt reconnection if not manually disconnected
      if (!this.manualDisconnect) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { error: 'WebSocket connection error' });
    };

    this.socket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WSMessage): void {
    const { type, data } = message;

    // Handle pong for heartbeat
    if (type === WSMessageType.PONG) {
      this.clearHeartbeatTimeout();
      return;
    }

    // Emit event based on message type
    this.emit(type, data);

    // Also emit to general 'message' listeners
    this.emit('message', message);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.send({ type: WSMessageType.PING, data: {} });

        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('Heartbeat timeout - reconnecting');
          this.socket?.close();
        }, this.heartbeatTimeoutMs);
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clearHeartbeatTimeout();
  }

  /**
   * Clear heartbeat timeout
   */
  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (!exp) return false;
      // Check if token expires in less than 30 seconds
      return Date.now() >= (exp * 1000) - 30000;
    } catch {
      return true; // If we can't parse, assume expired
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed', { attempts: this.reconnectAttempts });
      return;
    }

    // Check if token is expired before attempting reconnect
    // Don't redirect - just skip reconnection and let API calls handle logout
    if (this.token && this.isTokenExpired(this.token)) {
      console.log('Token expired, skipping WebSocket reconnection');
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      if (this.token && this.userId) {
        this.connect(this.token, this.userId);
      }
    }, delay);
  }

  /**
   * Send a message through WebSocket
   */
  send(message: { type: string; data: Record<string, unknown> }): boolean {
    const wsMessage: WSMessage = {
      type: message.type,
      data: message.data,
      timestamp: new Date().toISOString(),
    };

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(wsMessage));
      return true;
    } else {
      // Queue message for later
      this.messageQueue.push(wsMessage);
      console.log('Message queued (offline):', message.type);
      return false;
    }
  }

  /**
   * Flush message queue when reconnected
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Send a chat message
   */
  sendMessage(receiverId: number, content: string, messageType: string = 'text'): void {
    this.send({
      type: WSMessageType.MESSAGE_SEND,
      data: {
        receiver_id: receiverId,
        content,
        message_type: messageType,
      },
    });
  }

  /**
   * Send file message (image/voice)
   */
  sendFileMessage(
    receiverId: number,
    fileUrl: string,
    fileName: string,
    messageType: 'image' | 'voice',
    duration?: number
  ): void {
    this.send({
      type: WSMessageType.MESSAGE_SEND,
      data: {
        receiver_id: receiverId,
        file_url: fileUrl,
        file_name: fileName,
        message_type: messageType,
        duration,
      },
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(receiverId: number, isTyping: boolean): void {
    this.send({
      type: isTyping ? WSMessageType.TYPING_START : WSMessageType.TYPING_STOP,
      data: {
        receiver_id: receiverId,
        is_typing: isTyping,
      },
    });
  }

  /**
   * Mark messages as read
   */
  markAsRead(messageIds: number[], senderId: number): void {
    this.send({
      type: WSMessageType.MESSAGE_READ,
      data: {
        message_ids: messageIds,
        sender_id: senderId,
      },
    });
  }

  /**
   * Request online status for users
   */
  requestOnlineStatus(userIds: number[]): void {
    this.send({
      type: WSMessageType.USER_STATUS_REQUEST,
      data: {
        user_ids: userIds,
      },
    });
  }

  /**
   * Join a chat room
   */
  joinRoom(roomId: string): void {
    this.send({
      type: WSMessageType.ROOM_JOIN,
      data: { room_id: roomId },
    });
  }

  /**
   * Leave a chat room
   */
  leaveRoom(roomId: string): void {
    this.send({
      type: WSMessageType.ROOM_LEAVE,
      data: { room_id: roomId },
    });
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit an event to local listeners
   */
  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in WebSocket listener for ${event}:`, error);
      }
    });
  }

  /**
   * Handle unauthorized - clear tokens and redirect to login
   */
  private handleUnauthorized(): void {
    this.manualDisconnect = true;
    this.stopHeartbeat();

    // Clear tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    // Determine redirect path based on current location
    const currentPath = window.location.pathname;
    let redirectPath = '/login';

    if (currentPath.startsWith('/admin')) {
      redirectPath = '/admin/login';
    } else if (currentPath.startsWith('/client')) {
      redirectPath = '/client/login';
    } else if (currentPath.startsWith('/player')) {
      redirectPath = '/player/login';
    }

    // Redirect to login
    window.location.href = redirectPath;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.manualDisconnect = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    // Remove visibility handler
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    // Remove beforeunload handler
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
    }

    this.listeners.clear();
    this.messageQueue = [];
    this.token = null;
    this.userId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.socket) return 'disconnected';
    switch (this.socket.readyState) {
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CONNECTING:
        return 'connecting';
      default:
        return 'disconnected';
    }
  }

  /**
   * Generate room ID for direct messages
   */
  static getDMRoomId(userId1: number, userId2: number): string {
    return `dm-${Math.min(userId1, userId2)}-${Math.max(userId1, userId2)}`;
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
