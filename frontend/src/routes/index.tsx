import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { RoleRoute } from './RoleRoute';
import { RootRedirect } from './RootRedirect';
import { Loading } from '@/components/common/Loading';
import { UserType } from '@/types';
import { ROUTES } from '@/config/routes.config';

// Lazy load pages for code splitting
const Login = lazy(() => import('@/pages/auth/Login'));
const AdminLogin = lazy(() => import('@/pages/auth/AdminLogin'));
const ClientLogin = lazy(() => import('@/pages/auth/ClientLogin'));
const Register = lazy(() => import('@/pages/auth/Register'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const ClientDashboard = lazy(() => import('@/pages/client/ClientDashboard'));
const PlayerDashboard = lazy(() => import('@/pages/player/PlayerDashboard'));

export default function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public routes - Authentication (redirect to dashboard if already logged in) */}
        <Route element={<PublicRoute />}>
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLogin />} />
          <Route path={ROUTES.CLIENT_LOGIN} element={<ClientLogin />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
        </Route>

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

        {/* Default redirect - smart redirect based on auth status */}
        <Route path="/" element={<RootRedirect />} />

        {/* 404 - redirect to root which will handle auth-based redirect */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}
