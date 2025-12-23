import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/common/Loading';
import { ROUTES } from '@/config/routes.config';

/**
 * Smart root redirect component that redirects users to their appropriate dashboard
 * if logged in, or to the player login page if not logged in.
 */
export function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  // If user is logged in, redirect to their dashboard
  if (user) {
    switch (user.user_type) {
      case 'admin':
        return <Navigate to={ROUTES.ADMIN.DASHBOARD} replace />;
      case 'client':
        return <Navigate to={ROUTES.CLIENT.DASHBOARD} replace />;
      case 'player':
        return <Navigate to={ROUTES.PLAYER.DASHBOARD} replace />;
      default:
        return <Navigate to={ROUTES.LOGIN} replace />;
    }
  }

  // If not logged in, redirect to player login
  return <Navigate to={ROUTES.LOGIN} replace />;
}
