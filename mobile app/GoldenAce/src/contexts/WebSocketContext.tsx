import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { websocketService } from '../services/websocket';
import { useAuth } from './AuthContext';
import type { Message } from '../types';

interface WebSocketContextType {
  isConnected: boolean;
  newMessage: Message | null;
  typingUsers: Map<number, boolean>;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendTyping: (receiverId: number) => void;
  sendStopTyping: (receiverId: number) => void;
  clearNewMessage: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [newMessage, setNewMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<number, boolean>>(new Map());

  const connect = useCallback(async () => {
    await websocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const sendTyping = useCallback((receiverId: number) => {
    websocketService.sendTyping(receiverId);
  }, []);

  const sendStopTyping = useCallback((receiverId: number) => {
    websocketService.sendStopTyping(receiverId);
  }, []);

  const clearNewMessage = useCallback(() => {
    setNewMessage(null);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only depend on isAuthenticated - connect/disconnect are stable

  useEffect(() => {
    // Connection status handlers
    const unsubConnect = websocketService.onConnect(() => {
      setIsConnected(true);
    });

    const unsubDisconnect = websocketService.onDisconnect(() => {
      setIsConnected(false);
    });

    // Message handlers - backend sends 'message:new' type
    const unsubNewMessage = websocketService.on('message:new', (data) => {
      // Backend sends message data directly, not wrapped in data.message
      setNewMessage(data);
    });

    // Typing indicators - backend sends 'typing:start' and 'typing:stop'
    const unsubTyping = websocketService.on('typing:start', (data) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.user_id, true);
        return newMap;
      });
    });

    const unsubStopTyping = websocketService.on('typing:stop', (data) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.user_id);
        return newMap;
      });
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubNewMessage();
      unsubTyping();
      unsubStopTyping();
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        newMessage,
        typingUsers,
        connect,
        disconnect,
        sendTyping,
        sendStopTyping,
        clearNewMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
