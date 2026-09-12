import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-20 h-20 rounded-2xl bg-white/80 border border-zinc-200 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-zinc-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-zinc-800 mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-md mb-6 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}
