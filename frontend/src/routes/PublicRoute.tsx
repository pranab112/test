import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/common/Loading';
import { ROUTES } from '@/config/routes.config';

/**
 * PublicRoute component that redirects authenticated users to their dashboard
 * Useful for login/register pages that shouldn't be accessible when logged in
 */
export function PublicRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  // If user is already logged in, redirect to their dashboard
  if (user) {
    switch (user.user_type) {
      case 'admin':
        return <Navigate to={ROUTES.ADMIN.DASHBOARD} replace />;
      case 'client':
        return <Navigate to={ROUTES.CLIENT.DASHBOARD} replace />;
      case 'player':
        return <Navigate to={ROUTES.PLAYER.DASHBOARD} replace />;
      default:
        return <Outlet />;
    }
  }

  // If not logged in, allow access to public routes
  return <Outlet />;
}
