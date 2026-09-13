import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * Auth guard for the chrome-less Present-mode pages (operator control,
 * Projector, Stage Display). Same "must be signed in" check AppLayout
 * does, without the Sidebar/Header — these pages need maximum screen
 * space and zero distraction during a live service.
 *
 * Passes the current location along so LoginPage can send the user back
 * here afterward — otherwise e.g. scanning the Remote Control QR code while
 * signed out logs you in and stops on the Dashboard instead.
 */
export function LiveGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <>{children}</>;
}
