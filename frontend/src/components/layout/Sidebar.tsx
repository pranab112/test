import { useState } from 'react';
import { GiCardAceSpades } from 'react-icons/gi';
import {
  MdDashboard, MdPeople, MdSettings, MdMessage,
  MdCheckCircle, MdFlag, MdStar, MdCardGiftcard,
  MdBroadcastOnPersonal, MdGroup, MdVideogameAsset
} from 'react-icons/md';
import { FiLogOut, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { FaUsers, FaGamepad, FaChartLine, FaGift } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { UserType } from '@/types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  onClick?: () => void;
}

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isMobile?: boolean;
}

export function Sidebar({ activeSection, onSectionChange, isMobile = false }: SidebarProps) {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(!isMobile ? false : false);

  // Navigation items based on user type
  const getNavItems = (): NavItem[] => {
    if (user?.user_type === UserType.ADMIN) {
      return [
        { id: 'overview', label: 'Overview', icon: MdDashboard },
        { id: 'users', label: 'Users', icon: FaUsers },
        { id: 'games', label: 'Game Library', icon: MdVideogameAsset },
        { id: 'approvals', label: 'Approvals', icon: MdCheckCircle },
        { id: 'messages', label: 'Messages', icon: MdMessage },
        { id: 'promotions', label: 'Promotions', icon: MdCardGiftcard },
        { id: 'reports', label: 'Reports', icon: MdFlag },
        { id: 'reviews', label: 'Reviews', icon: MdStar },
        { id: 'offers', label: 'Platform Offers', icon: FaGift },
        { id: 'broadcast', label: 'Broadcast', icon: MdBroadcastOnPersonal },
      ];
    } else if (user?.user_type === UserType.CLIENT) {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: MdDashboard },
        { id: 'players', label: 'Players', icon: MdPeople },
        { id: 'approvals', label: 'Approvals', icon: MdCheckCircle },
        { id: 'games', label: 'Games Library', icon: FaGamepad },
        { id: 'promotions', label: 'Promotions', icon: MdCardGiftcard },
        { id: 'analytics', label: 'Analytics', icon: FaChartLine },
        { id: 'friends', label: 'Friends', icon: MdGroup },
        { id: 'messages', label: 'Messages', icon: MdMessage },
        { id: 'reports', label: 'Reports', icon: MdFlag },
        { id: 'reviews', label: 'Reviews', icon: MdStar },
        { id: 'settings', label: 'Settings', icon: MdSettings },
      ];
    } else if (user?.user_type === UserType.PLAYER) {
      return [
        { id: 'home', label: 'Home', icon: MdDashboard },
        { id: 'clients', label: 'Clients', icon: FaUsers },
        { id: 'friends', label: 'Friends', icon: MdGroup },
        { id: 'messages', label: 'Messages', icon: MdMessage },
        { id: 'promotions', label: 'Promotions', icon: MdCardGiftcard },
        { id: 'rewards', label: 'Rewards', icon: FaGift },
        { id: 'reports', label: 'Reports', icon: MdFlag },
        { id: 'reviews', label: 'Reviews', icon: MdStar },
        { id: 'settings', label: 'Settings', icon: MdSettings },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  return (
    <aside className={`${isCollapsed && !isMobile ? 'w-20' : 'w-64'} bg-dark-200 border-r-2 border-gold-600 flex flex-col transition-all duration-300 h-screen ${isMobile ? '' : 'sticky top-0'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gold-700 bg-gradient-to-r from-dark-300 to-dark-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <GiCardAceSpades className="text-3xl text-gold-500" />
              <div>
                <h2 className="text-gold-500 font-bold tracking-wider">GOLDEN ACE</h2>
                <p className="text-xs text-gold-700 uppercase">{user?.user_type} Portal</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <GiCardAceSpades className="text-3xl text-gold-500 mx-auto" />
          )}
        </div>
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mt-2 w-full text-gold-500 hover:text-gold-400 flex items-center justify-center"
          >
            {isCollapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
          </button>
        )}
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-dark-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center text-dark-700 font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gold-500 font-medium truncate">{user?.username}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-gold-gradient text-dark-700 shadow-gold'
                  : 'text-gray-300 hover:bg-dark-300 hover:text-gold-500'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className="text-xl flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-gold-500 text-dark-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gold-700">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-red-900/20 hover:text-red-400 transition-all"
          title={isCollapsed ? 'Logout' : ''}
        >
          <FiLogOut className="text-xl flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
