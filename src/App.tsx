import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PresentationsPage } from '@/pages/PresentationsPage';
import { PresentationEditorPage } from '@/pages/PresentationEditorPage';
import { PresentLivePage } from '@/pages/PresentLivePage';
import { ProjectorScreenPage } from '@/pages/ProjectorScreenPage';
import { StageDisplayPage } from '@/pages/StageDisplayPage';
import { RemoteControlPage } from '@/pages/RemoteControlPage';
import { OverlayPage } from '@/pages/OverlayPage';
import { LiveGuard } from '@/components/live/LiveGuard';
import { SongsPage } from '@/pages/SongsPage';
import { SongDetailPage } from '@/pages/SongDetailPage';
import { BiblePage } from '@/pages/BiblePage';
import { MediaPage } from '@/pages/MediaPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { UsersPage } from '@/pages/UsersPage';
import { SettingsPage } from '@/pages/SettingsPage';

function ProtectedRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={<ErrorBoundary label="Login"><LoginPage /></ErrorBoundary>} />

      <Route path="/dashboard" element={<ErrorBoundary label="Dashboard"><AppLayout><DashboardPage /></AppLayout></ErrorBoundary>} />
      <Route path="/presentations" element={<ErrorBoundary label="Presentations"><AppLayout><PresentationsPage /></AppLayout></ErrorBoundary>} />
      <Route path="/presentations/:id/edit" element={<ErrorBoundary label="Slide Editor"><AppLayout><PresentationEditorPage /></AppLayout></ErrorBoundary>} />
      <Route
        path="/presentations/:id/present"
        element={<ErrorBoundary label="Live Presentation" isLiveSurface><LiveGuard><PresentLivePage /></LiveGuard></ErrorBoundary>}
      />
      <Route
        path="/presentations/:id/present/projector"
        element={<ErrorBoundary label="Projector Display" isLiveSurface><LiveGuard><ProjectorScreenPage /></LiveGuard></ErrorBoundary>}
      />
      <Route
        path="/presentations/:id/present/stage"
        element={<ErrorBoundary label="Stage Display" isLiveSurface><LiveGuard><StageDisplayPage /></LiveGuard></ErrorBoundary>}
      />
      <Route
        path="/presentations/:id/present/remote"
        element={<ErrorBoundary label="Remote Control" isLiveSurface><LiveGuard><RemoteControlPage /></LiveGuard></ErrorBoundary>}
      />
      <Route
        path="/presentations/:id/present/overlay"
        element={<ErrorBoundary label="Overlay Display" isLiveSurface><LiveGuard><OverlayPage /></LiveGuard></ErrorBoundary>}
      />
      <Route path="/songs" element={<ErrorBoundary label="Songs"><AppLayout><SongsPage /></AppLayout></ErrorBoundary>} />
      <Route path="/songs/:id" element={<ErrorBoundary label="Song"><AppLayout><SongDetailPage /></AppLayout></ErrorBoundary>} />
      <Route path="/bible" element={<ErrorBoundary label="Bible"><AppLayout><BiblePage /></AppLayout></ErrorBoundary>} />
      <Route path="/media" element={<ErrorBoundary label="Media Library"><AppLayout><MediaPage /></AppLayout></ErrorBoundary>} />
      <Route path="/templates" element={<ErrorBoundary label="Templates"><AppLayout><TemplatesPage /></AppLayout></ErrorBoundary>} />

      <Route path="/users" element={<ErrorBoundary label="Users"><AppLayout requireAdmin><UsersPage /></AppLayout></ErrorBoundary>} />
      <Route path="/settings" element={<ErrorBoundary label="Settings"><AppLayout requireAdmin><SettingsPage /></AppLayout></ErrorBoundary>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
