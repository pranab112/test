import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserType } from '@/types';
import { ROUTES } from '@/config/routes.config';

interface RoleRouteProps {
  allowedRoles: UserType[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.user_type)) {
    // Redirect to user's correct dashboard if they're logged in but accessing wrong role
    if (user) {
      const redirectMap: Record<UserType, string> = {
        admin: ROUTES.ADMIN.DASHBOARD,
        client: ROUTES.CLIENT.DASHBOARD,
        player: ROUTES.PLAYER.DASHBOARD,
      };
      return <Navigate to={redirectMap[user.user_type]} replace />;
    }

    // If not logged in, redirect to login
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
