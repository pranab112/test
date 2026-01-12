import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { HomeSection } from '@/components/player/HomeSection';
import { ClientsSection } from '@/components/player/ClientsSection';
import { FriendsSection } from '@/components/player/FriendsSection';
import { MessagesSection } from '@/components/player/MessagesSection';
import { PromotionsSection } from '@/components/player/PromotionsSection';
import { RewardsSection } from '@/components/player/RewardsSection';
import { ReviewsSection } from '@/components/player/ReviewsSection';
import { ReportsSection } from '@/components/player/ReportsSection';
import { SettingsSection } from '@/components/player/SettingsSection';
import { CommunitySection } from '@/components/common/CommunitySection';

const STORAGE_KEY = 'player_active_section';

export default function PlayerDashboard() {
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'home';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeSection);
  }, [activeSection]);

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <HomeSection />;
      case 'clients':
        return <ClientsSection />;
      case 'friends':
        return <FriendsSection />;
      case 'messages':
        return <MessagesSection />;
      case 'promotions':
        return <PromotionsSection />;
      case 'rewards':
        return <RewardsSection />;
      case 'reviews':
        return <ReviewsSection />;
      case 'reports':
        return <ReportsSection />;
      case 'community':
        return <CommunitySection userType="player" />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <HomeSection />;
    }
  };

  return (
    <DashboardProvider activeSection={activeSection} onSectionChange={setActiveSection}>
      <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
        {renderContent()}
      </DashboardLayout>
    </DashboardProvider>
  );
}
