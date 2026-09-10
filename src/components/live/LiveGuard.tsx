import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * Auth guard for the chrome-less Present-mode pages (operator control,
 * Projector, Stage Display). Same "must be signed in" check AppLayout
 * does, without the Sidebar/Header — these pages need maximum screen
 * space and zero distraction during a live service.
 */
export function LiveGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
