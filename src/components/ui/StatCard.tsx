import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: 'maroon' | 'blue' | 'emerald' | 'amber';
}

const accentClasses = {
  maroon: 'from-maroon-900/40 to-maroon-950/20 text-maroon-400 border-maroon-800/30',
  blue: 'from-sky-900/40 to-sky-950/20 text-sky-400 border-sky-800/30',
  emerald: 'from-emerald-900/40 to-emerald-950/20 text-emerald-400 border-emerald-800/30',
  amber: 'from-amber-900/40 to-amber-950/20 text-amber-400 border-amber-800/30',
};

export function StatCard({ label, value, icon: Icon, accent = 'maroon' }: StatCardProps) {
  return (
    <div className="relative bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 overflow-hidden">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${accentClasses[accent]} blur-2xl opacity-50`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-zinc-100 mt-1.5">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accentClasses[accent]} border flex items-center justify-center`}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
