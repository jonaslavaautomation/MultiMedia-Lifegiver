import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PresentationsPage } from '@/pages/PresentationsPage';
import { PresentationEditorPage } from '@/pages/PresentationEditorPage';
import { PresentLivePage } from '@/pages/PresentLivePage';
import { ProjectorScreenPage } from '@/pages/ProjectorScreenPage';
import { StageDisplayPage } from '@/pages/StageDisplayPage';
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
      <Route path="/login" element={<LoginPage />} />

      <Route path="/dashboard" element={<AppLayout><DashboardPage /></AppLayout>} />
      <Route path="/presentations" element={<AppLayout><PresentationsPage /></AppLayout>} />
      <Route path="/presentations/:id/edit" element={<AppLayout><PresentationEditorPage /></AppLayout>} />
      <Route path="/presentations/:id/present" element={<LiveGuard><PresentLivePage /></LiveGuard>} />
      <Route path="/presentations/:id/present/projector" element={<LiveGuard><ProjectorScreenPage /></LiveGuard>} />
      <Route path="/presentations/:id/present/stage" element={<LiveGuard><StageDisplayPage /></LiveGuard>} />
      <Route path="/songs" element={<AppLayout><SongsPage /></AppLayout>} />
      <Route path="/songs/:id" element={<AppLayout><SongDetailPage /></AppLayout>} />
      <Route path="/bible" element={<AppLayout><BiblePage /></AppLayout>} />
      <Route path="/media" element={<AppLayout><MediaPage /></AppLayout>} />
      <Route path="/templates" element={<AppLayout><TemplatesPage /></AppLayout>} />

      <Route path="/users" element={<AppLayout requireAdmin><UsersPage /></AppLayout>} />
      <Route path="/settings" element={<AppLayout requireAdmin><SettingsPage /></AppLayout>} />

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
