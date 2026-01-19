import { API_CONFIG } from '../config/api.config';
import { tokenStorage } from './storage';

type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;

// WebSocket event types (matching backend)
export const WS_EVENTS = {
  // Connection
  PING: 'ping',
  PONG: 'pong',
  CONNECTED: 'connected',
  ERROR: 'error',

  // Messages
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',

  // Typing
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Online Status
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',

  // Credits
  CREDIT_UPDATE: 'credit:update',

  // Notifications
  NOTIFICATION: 'notification',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',

  // Conversations
  CONVERSATION_UPDATE: 'conversation:update',
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private onConnectHandlers: ConnectionHandler[] = [];
  private onDisconnectHandlers: ConnectionHandler[] = [];
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDisconnecting = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastPongTime: number = 0;
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    // Reset disconnecting flag when explicitly connecting
    this.isDisconnecting = false;
    this.isConnecting = true;
    this.connectionState = 'connecting';

    try {
      const token = await tokenStorage.getToken();
      if (!token) {
        console.log('[WebSocket] No token available for connection');
        this.isConnecting = false;
        this.connectionState = 'disconnected';
        return;
      }

      const wsUrl = `${API_CONFIG.WS_URL}?token=${token}`;
      console.log('[WebSocket] Connecting to:', wsUrl.substring(0, 50) + '...');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        this.isConnecting = false;
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.lastPongTime = Date.now();
        this.startHeartbeat();
        this.onConnectHandlers.forEach((handler) => handler());
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.connectionState = 'disconnected';
        this.stopHeartbeat();
        this.onDisconnectHandlers.forEach((handler) => handler());
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Error connecting:', error);
      this.isConnecting = false;
      this.connectionState = 'disconnected';
      this.attemptReconnect();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    // Send ping every 25 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping', {});

        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          const timeSinceLastPong = Date.now() - this.lastPongTime;
          if (timeSinceLastPong > 35000) {
            console.log('[WebSocket] Heartbeat timeout, reconnecting...');
            this.ws?.close();
          }
        }, 10000);
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private attemptReconnect(): void {
    // Don't reconnect if we're intentionally disconnecting
    if (this.isDisconnecting) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000,
      this.maxReconnectDelay
    );

    console.log(`[WebSocket] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    console.log('[WebSocket] Disconnecting...');
    this.isDisconnecting = true;
    this.stopHeartbeat();

    // Clear any pending reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      // Clear event handlers to prevent memory leaks
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.connectionState = 'disconnected';
  }

  // Reset disconnect state when explicitly connecting again
  resetConnection(): void {
    this.isDisconnecting = false;
    this.reconnectAttempts = 0;
  }

  private handleMessage(data: any): void {
    const { type, ...payload } = data;

    // Handle pong for heartbeat
    if (type === 'pong' || type === WS_EVENTS.PONG) {
      this.lastPongTime = Date.now();
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }
      return;
    }

    // Handle connected confirmation
    if (type === 'connected' || type === WS_EVENTS.CONNECTED) {
      console.log('[WebSocket] Connection confirmed by server');
      return;
    }

    if (type) {
      const handlers = this.messageHandlers.get(type) || [];
      handlers.forEach((handler) => handler(payload.data || payload));
    }

    // Also notify general message handlers
    const generalHandlers = this.messageHandlers.get('*') || [];
    generalHandlers.forEach((handler) => handler(data));
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.onConnectHandlers.push(handler);
    return () => {
      const index = this.onConnectHandlers.indexOf(handler);
      if (index > -1) {
        this.onConnectHandlers.splice(index, 1);
      }
    };
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.onDisconnectHandlers.push(handler);
    return () => {
      const index = this.onDisconnectHandlers.indexOf(handler);
      if (index > -1) {
        this.onDisconnectHandlers.splice(index, 1);
      }
    };
  }

  send(type: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    } else {
      console.warn('[WebSocket] Cannot send - not connected');
    }
  }

  sendTyping(receiverId: number): void {
    this.send('typing:start', { receiver_id: receiverId, is_typing: true });
  }

  sendStopTyping(receiverId: number): void {
    this.send('typing:stop', { receiver_id: receiverId, is_typing: false });
  }

  sendReadReceipt(messageIds: number[], senderId: number): void {
    this.send('message:read', { message_ids: messageIds, sender_id: senderId });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionState;
  }
}

export const websocketService = new WebSocketService();
