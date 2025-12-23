import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/common/Loading';
import { ROUTES, ADMIN_TOKEN, CLIENT_TOKEN } from '@/config/routes.config';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    // Redirect to appropriate login based on the route being accessed
    const path = location.pathname;

    // Check if trying to access admin routes
    if (path.startsWith(`/${ADMIN_TOKEN}`)) {
      return <Navigate to={ROUTES.ADMIN_LOGIN} replace />;
    }

    // Check if trying to access client routes
    if (path.startsWith(`/${CLIENT_TOKEN}`)) {
      return <Navigate to={ROUTES.CLIENT_LOGIN} replace />;
    }

    // Default to player login
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
