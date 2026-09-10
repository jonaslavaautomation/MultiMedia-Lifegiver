import { LayoutTemplate } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function TemplatesPage() {
  return (
    <PlaceholderPage
      icon={LayoutTemplate}
      title="Templates"
      description="Create reusable slide templates for consistent worship presentations."
      phaseLabel="Phase 2"
    />
  );
}
