import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function DashboardLayout({ children, activeSection, onSectionChange }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-dark-700 via-dark-600 to-dark-500 overflow-hidden">
      <Sidebar activeSection={activeSection} onSectionChange={onSectionChange} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
