import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { Loading } from '@/components/common/Loading';
import { UserType } from '@/types';
import { ROUTES } from '@/config/routes.config';

// Lazy load pages for code splitting
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const ClientDashboard = lazy(() => import('@/pages/client/ClientDashboard'));
const PlayerDashboard = lazy(() => import('@/pages/player/PlayerDashboard'));

export default function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public routes */}
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          {/* Admin routes */}
          <Route element={<RoleRoute allowedRoles={[UserType.ADMIN]} />}>
            <Route path={ROUTES.ADMIN.DASHBOARD} element={<AdminDashboard />} />
          </Route>

          {/* Client routes */}
          <Route element={<RoleRoute allowedRoles={[UserType.CLIENT]} />}>
            <Route path={ROUTES.CLIENT.DASHBOARD} element={<ClientDashboard />} />
          </Route>

          {/* Player routes */}
          <Route element={<RoleRoute allowedRoles={[UserType.PLAYER]} />}>
            <Route path={ROUTES.PLAYER.DASHBOARD} element={<PlayerDashboard />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </Suspense>
  );
}
