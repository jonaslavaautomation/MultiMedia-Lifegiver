import { type ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  success: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
  warning: 'bg-vanilla text-obsidian border-vanilla/70',
  danger: 'bg-red-950/60 text-red-300 border-red-800/50',
  info: 'bg-sky-950/60 text-sky-300 border-sky-800/50',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
