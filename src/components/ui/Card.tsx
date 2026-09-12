import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white/60 border border-zinc-200/80 rounded-2xl backdrop-blur-sm ${onClick ? 'cursor-pointer hover:border-zinc-300 transition-all duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
