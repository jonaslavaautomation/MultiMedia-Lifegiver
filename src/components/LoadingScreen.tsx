import { Church } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-xl shadow-brand-950/40 animate-pulse">
        <Church className="w-7 h-7 text-white" strokeWidth={2.5} />
      </div>
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="text-sm text-zinc-500">Loading LifeGiver Media Studio…</p>
    </div>
  );
}
