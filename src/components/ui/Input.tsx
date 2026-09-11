import { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60 ${error ? 'border-red-800/60' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
