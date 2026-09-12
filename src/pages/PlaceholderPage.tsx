import { type LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  phaseLabel: string;
}

export function PlaceholderPage({ icon, title, description, phaseLabel }: PlaceholderPageProps) {
  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-500 mt-1">{description}</p>
      </div>

      <Card>
        <EmptyState
          icon={icon}
          title={`${title} — Coming Soon`}
          description={`This section is part of ${phaseLabel}. The foundation is ready — full functionality will be added in a future update.`}
        />
      </Card>
    </div>
  );
}
