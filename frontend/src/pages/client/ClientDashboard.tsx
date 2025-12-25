import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardSection } from '@/components/client/DashboardSection';
import { PlayersSection } from '@/components/client/PlayersSection';
import { GamesSection } from '@/components/client/GamesSection';
import { PromotionsSection } from '@/components/client/PromotionsSection';
import { AnalyticsSection } from '@/components/client/AnalyticsSection';
import { FriendsSection } from '@/components/client/FriendsSection';
import { MessagesSection } from '@/components/client/MessagesSection';
import { ReviewsSection } from '@/components/client/ReviewsSection';
import { ReportsSection } from '@/components/client/ReportsSection';
import { SettingsSection } from '@/components/client/SettingsSection';

export default function ClientDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection />;
      case 'players':
        return <PlayersSection />;
      case 'games':
        return <GamesSection />;
      case 'promotions':
        return <PromotionsSection />;
      case 'analytics':
        return <AnalyticsSection />;
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
