# Dashboard Migration Guide - HTML to React

## Status: Ready for Implementation

✅ **Game Images Copied:** 34 images now in `/frontend/public/images/games/`
📋 **Plan Created:** Comprehensive implementation plan available
🎨 **Theme Ready:** Golden Ace branding with React Icons

---

## Quick Start

The HTML dashboards have been analyzed and a complete implementation plan created. This guide provides the step-by-step process to migrate all three dashboards to React.

---

## Phase 1: Core Layout Components (START HERE)

### Step 1: Create Sidebar Component

**File:** `frontend/src/components/layout/Sidebar.tsx`

```tsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GiCardAceSpades } from 'react-icons/gi';
import {
  MdDashboard, MdPeople, MdSettings, MdMessage,
  MdCheckCircle, MdFlag, MdStar, MdCardGiftcard
} from 'react-icons/md';
import { FiLogOut, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { UserType } from '@/types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  badge?: number;
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Navigation items based on user type
  const getNavItems = (): NavItem[] => {
    if (user?.user_type === UserType.ADMIN) {
      return [
        { id: 'overview', label: 'Overview', icon: MdDashboard },
        { id: 'users', label: 'Users', icon: MdPeople },
        { id: 'approvals', label: 'Approvals', icon: MdCheckCircle, badge: 5 },
        { id: 'messages', label: 'Messages', icon: MdMessage },
        { id: 'promotions', label: 'Promotions', icon: MdCardGiftcard },
        { id: 'reports', label: 'Reports', icon: MdFlag },
        { id: 'reviews', label: 'Reviews', icon: MdStar },
        { id: 'offers', label: 'Platform Offers', icon: MdCardGiftcard },
        { id: 'settings', label: 'Settings', icon: MdSettings },
      ];
    }
    // Add CLIENT and PLAYER nav items similarly
    return [];
  };

  const navItems = getNavItems();

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-dark-200 border-r-2 border-gold-600 flex flex-col transition-all duration-300`}>
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
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gold-500 hover:text-gold-400"
          >
            {isCollapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.includes(item.id);

          return (
            <button
              key={item.id}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-gold-gradient text-dark-700 shadow-gold'
                  : 'text-gray-300 hover:bg-dark-300 hover:text-gold-500'
              }`}
            >
              <Icon className="text-xl flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  {item.badge && (
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

      {/* User & Logout */}
      <div className="p-3 border-t border-gold-700">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-red-900/20 hover:text-red-400 transition-all"
        >
          <FiLogOut className="text-xl" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
```

### Step 2: Create DashboardLayout Component

**File:** `frontend/src/components/layout/DashboardLayout.tsx`

```tsx
import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-dark-700 via-dark-600 to-dark-500">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
```

---

## Phase 2: Reusable Components

### StatCard Component

**File:** `frontend/src/components/common/StatCard.tsx`

```tsx
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'gold' | 'blue' | 'green' | 'red';
}

export function StatCard({ title, value, icon, trend, color = 'gold' }: StatCardProps) {
  const colorClasses = {
    gold: 'border-gold-600 bg-gold-900/10',
    blue: 'border-blue-600 bg-blue-900/10',
    green: 'border-green-600 bg-green-900/10',
    red: 'border-red-600 bg-red-900/10',
  };

  return (
    <div className={`bg-dark-200 border-2 ${colorClasses[color]} rounded-lg p-6 hover:shadow-gold transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-gray-400 text-sm font-medium uppercase tracking-wide">
          {title}
        </div>
        <div className={`text-${color}-500 text-2xl`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-2">
        {value}
      </div>
      {trend && (
        <div className={`text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  );
}
```

### DataTable Component

**File:** `frontend/src/components/common/DataTable.tsx`

```tsx
import { useState } from 'react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends { id: number | string }>({
  data,
  columns,
  loading,
  emptyMessage = 'No data available'
}: DataTableProps<T>) {
  return (
    <div className="bg-dark-200 border border-gold-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-dark-300 border-b border-gold-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-6 py-3 text-left text-xs font-medium text-gold-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-400">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-dark-300 transition-colors">
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-6 py-4 text-sm text-gray-300">
                      {column.render ? column.render(item) : String(item[column.key as keyof T])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Phase 3: Admin Dashboard Implementation

### Update AdminDashboard.tsx

**File:** `frontend/src/pages/admin/AdminDashboard.tsx`

```tsx
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/common/StatCard';
import { FaUsers, FaCheckCircle, FaEnvelope, FaFlag } from 'react-icons/fa';
import { MdPeople } from 'react-icons/md';

type Section = 'overview' | 'users' | 'approvals' | 'messages' | 'promotions' | 'reports' | 'reviews' | 'offers' | 'settings';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  return (
    <DashboardLayout>
      {activeSection === 'overview' && (
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-6">Admin Overview</h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value="1,234"
              icon={<FaUsers />}
              trend={{ value: '+12% from last month', isPositive: true }}
            />
            <StatCard
              title="Online Now"
              value="89"
              icon={<MdPeople />}
              color="green"
            />
            <StatCard
              title="Pending Approvals"
              value="15"
              icon={<FaCheckCircle />}
              color="blue"
            />
            <StatCard
              title="Unread Messages"
              value="42"
              icon={<FaEnvelope />}
              color="red"
            />
          </div>

          {/* Recent Activity */}
          <div className="bg-dark-200 border-2 border-gold-600 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gold-500 mb-4">Recent Activity</h2>
            {/* Add activity feed here */}
          </div>
        </div>
      )}

      {/* Add other sections */}
    </DashboardLayout>
  );
}
```

---

## Next Steps

1. ✅ **Images Copied** - Game images ready at `/images/games/`
2. **Implement Core Layout** - Create Sidebar and DashboardLayout components
3. **Build Reusable Components** - StatCard, DataTable, Modal, Badge
4. **Update Admin Dashboard** - Add all 9 sections with real data
5. **Update Client Dashboard** - Player management, games, promotions
6. **Update Player Dashboard** - Home, clients, friends, messages
7. **Add API Integration** - Create API client functions
8. **Polish & Test** - Styling, responsive design, error handling

---

## Image Usage Example

```tsx
// In GameCard component
<img
  src="/images/games/firekirin.png"
  alt="Fire Kirin"
  className="w-full h-48 object-cover rounded-lg"
/>
```

---

## Available Game Images (34 total)

```
bluedragon.png, casinoignitee.jpg, cashmachine.png, cashfrenzy 1.png,
Egames.png, firekirin.png, gamevault.png, Gameroom online.png,
Highstake.jpg, joker 777.png, juwaonline.png, loot.jpg,
Megaspin.jpg, milkyway 2.png, moolah.jpg, orionstars.jpg,
Panda Master.jpg, Paracasino.jpg, rivermonster 1.png, Rivermonster.png,
riversweeps 1.png, riversweeps 2.png, riversweeps 3.png, riversweeps.png,
sirus.png, ultrapanda.png, vblink 2.png, vegas x.png,
Vega Sweeps.png, vegasroll.png, winstar.png, yolo777.png,
brave_screenshot_checkmysweep.com (4).png, casinoroyale.png
```

---

## Implementation Priority

### High Priority (Week 1)
1. Core layout (Sidebar, DashboardLayout)
2. Common components (StatCard, DataTable, Badge)
3. Admin Overview section
4. Admin Users Management

### Medium Priority (Week 2)
5. Admin Approvals
6. Client Dashboard sections
7. Player Dashboard sections
8. API integration

### Low Priority (Week 3)
9. Chat system
10. Advanced features
11. Polish & optimization

---

## Resources

- **Plan Details:** See agent output above for complete implementation plan
- **HTML Files:** `/home/lusan/Documents/test/frontend/*.html` (reference)
- **Game Images:** `/home/lusan/Documents/test/frontend/public/images/games/`
- **Icons:** React Icons library (already installed)
- **Styling:** Tailwind CSS with Golden Ace theme

---

## Summary

✅ Static assets migrated
✅ Comprehensive plan created
✅ Ready to start implementation

Follow the phases above to systematically convert all HTML dashboards to React. Start with the core layout components, then build each dashboard section by section.

**Estimated Time:** 4-6 weeks for complete migration with polish
**Team Size:** 1-2 developers
**Complexity:** Medium-High (extensive features to migrate)

Good luck with the implementation! 🎉
