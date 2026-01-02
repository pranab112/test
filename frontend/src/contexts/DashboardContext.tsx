import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ChatTarget {
  id: number;
  username: string;
  full_name: string;
  profile_picture?: string;
  is_online?: boolean;
}

interface DashboardContextType {
  activeSection: string;
  setActiveSection: (section: string) => void;
  chatTarget: ChatTarget | null;
  openChatWith: (target: ChatTarget) => void;
  clearChatTarget: () => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({
  children,
  activeSection,
  onSectionChange,
}: {
  children: ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}) {
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);

  const openChatWith = useCallback((target: ChatTarget) => {
    setChatTarget(target);
    onSectionChange('messages');
  }, [onSectionChange]);

  const clearChatTarget = useCallback(() => {
    setChatTarget(null);
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        activeSection,
        setActiveSection: onSectionChange,
        chatTarget,
        openChatWith,
        clearChatTarget,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
