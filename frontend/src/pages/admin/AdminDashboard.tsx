import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OverviewSection } from '@/components/admin/OverviewSection';
import { UsersSection } from '@/components/admin/UsersSection';
import { ApprovalsSection } from '@/components/admin/ApprovalsSection';
import { MessagesSection } from '@/components/admin/MessagesSection';
import { PromotionsSection } from '@/components/admin/PromotionsSection';
import { ReportsSection } from '@/components/admin/ReportsSection';
import { ReviewsSection } from '@/components/admin/ReviewsSection';
import { OffersSection } from '@/components/admin/OffersSection';
import { BroadcastSection } from '@/components/admin/BroadcastSection';

const STORAGE_KEY = 'admin_active_section';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'overview';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeSection);
  }, [activeSection]);

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />;
      case 'users':
        return <UsersSection />;
      case 'approvals':
        return <ApprovalsSection />;
      case 'messages':
        return <MessagesSection />;
      case 'promotions':
        return <PromotionsSection />;
      case 'reports':
        return <ReportsSection />;
      case 'reviews':
        return <ReviewsSection />;
      case 'offers':
        return <OffersSection />;
      case 'broadcast':
        return <BroadcastSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderContent()}
    </DashboardLayout>
  );
}
