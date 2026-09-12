import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: 'brand' | 'leaf' | 'blue' | 'amber';
}

const accentClasses = {
  brand: 'from-brand-200/70 to-brand-100/40 text-brand-700 border-brand-300/60',
  leaf: 'from-leaf-200/70 to-leaf-100/40 text-leaf-700 border-leaf-300/60',
  blue: 'from-sky-200/70 to-sky-100/40 text-sky-700 border-sky-300/60',
  amber: 'from-amber-200/70 to-amber-100/40 text-amber-700 border-amber-300/60',
};

export function StatCard({ label, value, icon: Icon, accent = 'brand' }: StatCardProps) {
  return (
    <div className="relative bg-white/60 border border-zinc-200/80 rounded-2xl p-5 overflow-hidden shadow-lg shadow-black/20">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${accentClasses[accent]} blur-2xl opacity-50`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-zinc-900 mt-1.5">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accentClasses[accent]} border flex items-center justify-center shadow-inner`}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
