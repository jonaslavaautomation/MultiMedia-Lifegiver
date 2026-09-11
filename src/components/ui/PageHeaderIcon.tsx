import type { LucideIcon } from 'lucide-react';

interface PageHeaderIconProps {
  icon: LucideIcon;
  className?: string;
}

/**
 * The small brand-gradient icon badge shown next to every page's H1 —
 * matches the same "icon grounded in a colored badge" treatment used in
 * the Sidebar nav and StatCard, for a consistent, technical/dashboard feel
 * across the whole app rather than bare floating icons.
 */
export function PageHeaderIcon({ icon: Icon, className = '' }: PageHeaderIconProps) {
  return (
    <div
      className={`w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 border border-brand-500/30 flex items-center justify-center shadow-lg shadow-brand-950/40 shrink-0 ${className}`}
    >
      <Icon className="w-5 h-5 text-white" strokeWidth={2.25} />
    </div>
  );
}
