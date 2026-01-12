import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardSection } from '@/components/client/DashboardSection';
import { PlayersSection } from '@/components/client/PlayersSection';
import { ApprovalsSection } from '@/components/client/ApprovalsSection';
import { GamesSection } from '@/components/client/GamesSection';
import { PromotionsSection } from '@/components/client/PromotionsSection';
import { AnalyticsSection } from '@/components/client/AnalyticsSection';
import { FriendsSection } from '@/components/client/FriendsSection';
import { MessagesSection } from '@/components/client/MessagesSection';
import { ReviewsSection } from '@/components/client/ReviewsSection';
import { ReportsSection } from '@/components/client/ReportsSection';
import { SettingsSection } from '@/components/client/SettingsSection';
import { CommunitySection } from '@/components/common/CommunitySection';
import { BroadcastSection } from '@/components/common/BroadcastSection';

const STORAGE_KEY = 'client_active_section';

export default function ClientDashboard() {
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeSection);
  }, [activeSection]);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection onNavigate={setActiveSection} />;
      case 'players':
        return <PlayersSection />;
      case 'approvals':
        return <ApprovalsSection />;
      case 'games':
        return <GamesSection />;
      case 'promotions':
        return <PromotionsSection />;
      case 'analytics':
        return <AnalyticsSection />;
      case 'community':
        return <CommunitySection userType="client" />;
      case 'broadcasts':
        return <BroadcastSection />;
      case 'friends':
        return <FriendsSection />;
      case 'messages':
        return <MessagesSection />;
      case 'reviews':
        return <ReviewsSection />;
      case 'reports':
        return <ReportsSection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <DashboardSection />;
    }
  };

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderContent()}
    </DashboardLayout>
  );
}
