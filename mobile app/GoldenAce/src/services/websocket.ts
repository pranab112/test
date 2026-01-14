import { API_CONFIG } from '../config/api.config';
import { tokenStorage } from './storage';

type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private onConnectHandlers: ConnectionHandler[] = [];
  private onDisconnectHandlers: ConnectionHandler[] = [];
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDisconnecting = false;

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    // Reset disconnecting flag when explicitly connecting
    this.isDisconnecting = false;
    this.isConnecting = true;

    try {
      const token = await tokenStorage.getToken();
      if (!token) {
        console.log('No token available for WebSocket connection');
        this.isConnecting = false;
        return;
      }

      const wsUrl = `${API_CONFIG.WS_URL}?token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.onConnectHandlers.forEach((handler) => handler());
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.onDisconnectHandlers.forEach((handler) => handler());
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    // Don't reconnect if we're intentionally disconnecting
    if (this.isDisconnecting) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect(): void {
    this.isDisconnecting = true;

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
  }

  // Reset disconnect state when explicitly connecting again
  resetConnection(): void {
    this.isDisconnecting = false;
    this.reconnectAttempts = 0;
  }

  private handleMessage(data: any): void {
    const { type, ...payload } = data;

    if (type) {
      const handlers = this.messageHandlers.get(type) || [];
      handlers.forEach((handler) => handler(payload));
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
      console.warn('WebSocket is not connected');
    }
  }

  sendTyping(receiverId: number): void {
    this.send('typing', { receiver_id: receiverId });
  }

  sendStopTyping(receiverId: number): void {
    this.send('stop_typing', { receiver_id: receiverId });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
