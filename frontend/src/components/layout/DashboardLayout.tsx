import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { FiMenu, FiX } from 'react-icons/fi';
import { GiCardAceSpades } from 'react-icons/gi';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function DashboardLayout({ children, activeSection, onSectionChange }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-dark-700 via-dark-600 to-dark-500 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar activeSection={activeSection} onSectionChange={onSectionChange} />
      </div>

      {/* Mobile Sidebar Overlay */}
      <div className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
        isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Sidebar */}
        <div className={`absolute left-0 top-0 h-full transition-transform duration-300 transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <Sidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            isMobile={true}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-dark-200 border-b-2 border-emerald-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
            <div className="flex items-center gap-2">
              <GiCardAceSpades className="text-2xl text-emerald-500" />
              <div>
                <h2 className="text-emerald-500 font-bold text-sm tracking-wider">GOLDEN ACE</h2>
                <p className="text-xs text-emerald-700 uppercase">{user?.user_type} Portal</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
