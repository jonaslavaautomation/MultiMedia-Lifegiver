import { Music4 } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function SongsPage() {
  return (
    <PlaceholderPage
      icon={Music4}
      title="Songs"
      description="Manage your worship song library with lyrics and metadata."
      phaseLabel="Phase 2"
    />
  );
}
