import { Image } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function MediaPage() {
  return (
    <PlaceholderPage
      icon={Image}
      title="Media"
      description="Upload and manage images, videos, and audio for your presentations."
      phaseLabel="Phase 2"
    />
  );
}
