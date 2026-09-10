import { BookOpen } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function BiblePage() {
  return (
    <PlaceholderPage
      icon={BookOpen}
      title="Bible"
      description="Search and add Bible verses to your presentations."
      phaseLabel="Phase 2"
    />
  );
}
