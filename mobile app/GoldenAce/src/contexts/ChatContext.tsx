import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { chatApi } from '../api/chat.api';
import { useAuth } from './AuthContext';
import { websocketService, WS_EVENTS } from '../services/websocket';

interface ConversationUpdate {
  friend_id: number;
  friend_name?: string;
  friend_avatar?: string;
  last_message?: {
    id: number;
    content: string;
    message_type: string;
    created_at: string;
    sender_id: number;
  };
  unread_count?: number;
}

type ConversationUpdateCallback = (update: ConversationUpdate) => void;

interface ChatContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: (count?: number) => void;
  incrementUnreadCount: (count?: number) => void;
  resetUnreadCount: () => void;
  setActiveChatFriendId: (friendId: number | null) => void;
  subscribeToConversationUpdates: (callback: ConversationUpdateCallback) => () => void;
  lastConversationUpdate: ConversationUpdate | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastConversationUpdate, setLastConversationUpdate] = useState<ConversationUpdate | null>(null);
  // Track which chat is currently being viewed (to avoid incrementing count for messages in active chat)
  const activeChatFriendIdRef = useRef<number | null>(null);
  // Subscribers for conversation updates
  const conversationUpdateCallbacksRef = useRef<Set<ConversationUpdateCallback>>(new Set());

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const stats = await chatApi.getChatStats();
      const newCount = stats.unread_messages || 0;
      console.log('[ChatContext] Refreshed unread count:', newCount);
      setUnreadCount(newCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  const decrementUnreadCount = useCallback((count: number = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - count));
  }, []);

  const incrementUnreadCount = useCallback((count: number = 1) => {
    setUnreadCount((prev) => prev + count);
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const setActiveChatFriendId = useCallback((friendId: number | null) => {
    activeChatFriendIdRef.current = friendId;
  }, []);

  const subscribeToConversationUpdates = useCallback((callback: ConversationUpdateCallback) => {
    conversationUpdateCallbacksRef.current.add(callback);
    return () => {
      conversationUpdateCallbacksRef.current.delete(callback);
    };
  }, []);

  // Fetch unread count on mount and when user changes
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Refresh unread count periodically (every 15 seconds for more responsive updates)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 15000);

    return () => clearInterval(interval);
  }, [user, refreshUnreadCount]);

  // Listen for new messages via WebSocket and increment unread count
  useEffect(() => {
    if (!user) return;

    // Backend sends 'message:new' type with message data directly (not wrapped in data.message)
    const unsubscribe = websocketService.on(WS_EVENTS.MESSAGE_NEW, (data) => {
      // Only increment if the message is from someone else (not sent by current user)
      // AND if the user is not currently viewing that chat
      if (data && data.sender_id !== user.id) {
        // Don't increment if user is currently in that chat (messages are auto-read)
        if (activeChatFriendIdRef.current !== data.sender_id) {
          incrementUnreadCount(1);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, incrementUnreadCount]);

  // Listen for conversation updates via WebSocket
  useEffect(() => {
    if (!user) return;

    const unsubscribe = websocketService.on(WS_EVENTS.CONVERSATION_UPDATE, (data: ConversationUpdate) => {
      console.log('[ChatContext] Conversation update received:', data);
      setLastConversationUpdate(data);

      // Notify all subscribers
      conversationUpdateCallbacksRef.current.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error('[ChatContext] Error in conversation update callback:', error);
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  return (
    <ChatContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        decrementUnreadCount,
        incrementUnreadCount,
        resetUnreadCount,
        setActiveChatFriendId,
        subscribeToConversationUpdates,
        lastConversationUpdate,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
